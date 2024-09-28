/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const {
  initializeOpenAI,
  initializePinecone,
  initializeEmbeddings,
  // initializeChatHistory,
  handleSummarization,
  initializeChatSession,
} = require('./initialize');
const { PineconeStore } = require('@langchain/pinecone');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { createPineconeIndex } = require('@/utils/ai/pinecone/create.js');
const { logger } = require('@/config/logging');
const {
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions,
  getFormattingInstructions,
} = require('@/lib/prompts/createPrompt');
const { performPerplexityCompletion } = require('./context');
const { checkApiKey } = require('@/utils/auth');
const {
  savePromptBuild,
  extractKeywords,
  identifyLibrariesAndComponents,
  getDocumentationUrl,
  scrapeDocumentation,
  saveChatCompletion,
  formatResponse,
} = require('../../shared');
// const { ChatSession } = require('@/models');
const { getEnv } = require('@/utils/api');
const { initializeHistory, addMessage, retrieveHistory } = require('./history');
const { extractContent } = require('@/utils/processing');

const combinedChatStream = async (req, res) => {
  const {
    clientApiKey,
    // userId,
    // workspaceId,
    sessionId,
    prompt,
    // role,
    // regenerate,
    // count,
    streamType,
  } = req.body;

  if (streamType === 'file') {
    return handleFileStreaming(req, res);
  }

  const initializationData = getInitializationData(req.body);

  try {
    setupResponseHeaders(res);
    checkApiKey(clientApiKey, 'OpenAI');

    const chatSession = await initializeChatSession(
      initializationData.sessionId,
      initializationData.workspaceId,
      initializationData.userId,
      prompt,
      initializationData.sessionLength
    );
    const chatOpenAI = initializeOpenAI(
      initializationData.apiKey,
      initializationData.completionModel,
      chatSession
    );
    const pinecone = initializePinecone();
    const embedder = initializeEmbeddings(initializationData.apiKey);
    const chatHistory = initializeHistory(chatSession);
    const messages = await retrieveHistory(chatSession);
    const summary = await handleSummarization(messages, chatOpenAI, sessionId);

    const userMessageDoc = await addMessage(chatSession, {
      role: 'user',
      content: initializationData.prompt,
      userId: initializationData.userId,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionId: chatSession._id,
      },
    });
    logger.info(`[CHECK][userMessageDoc]: ${JSON.stringify(userMessageDoc)}`);
    logger.info(`[CHECK][chatSession]: ${JSON.stringify(chatHistory)}`);
    chatSession.summary = summary;
    await chatSession.save();

    const searchResults = await performPerplexityCompletion(
      initializationData.prompt,
      initializationData.perplexityApiKey
    );

    logger.info(`Search Results: ${JSON.stringify(searchResults)}`);

    const { vectorQueryStore, vectorStore } = await setupVectorStores(
      pinecone,
      embedder,
      initializationData
    );
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    await vectorStore.addDocuments(await textSplitter.splitDocuments([searchResults]));

    const context = await getRelevantContext(
      vectorQueryStore,
      vectorStore,
      initializationData.prompt
    );
    const { keywords, uiLibraries, jsLibraries, componentTypes, documentationContent } =
      await extractAdditionalInfo(initializationData.prompt);
    const formattingInstructions = getFormattingInstructions();
    const formattedPrompt = createFormattedPrompt(
      initializationData,
      context,
      summary,
      searchResults,
      keywords,
      uiLibraries,
      jsLibraries,
      componentTypes,
      documentationContent,
      formattingInstructions
    );
    const systemContent = getMainSystemMessageContent();
    const assistantInstructions = getMainAssistantMessageInstructions();

    await savePromptBuild(systemContent, assistantInstructions, formattedPrompt);
    let result;
    try {
      logger.info(`[CHECK][formattedPrompt]: ${formattedPrompt} ${typeof formattedPrompt}`);
      logger.info(`[CHECK][systemContent]: ${systemContent} ${typeof systemContent}`);
      logger.info(
        `[CHECK][assistantInstructions]: ${assistantInstructions} ${typeof assistantInstructions}`
      );
      logger.info(
        `[CHECK][initializationData]: ${JSON.stringify(initializationData)} ${typeof initializationData}`
      );
      result = await chatOpenAI.completionWithRetry({
        model: getEnv('OPENAI_API_CHAT_COMPLETION_MODEL'),
        messages: [
          { role: 'system', content: systemContent },
          { role: 'assistant', content: assistantInstructions },
          { role: 'user', content: formattedPrompt },
        ],
        stream: true,
        // stream_options: { include_usage: true },
        response_format: { type: 'json_object' },
        // temperature: 0.4,
        // maxTokens: 2000,
      });
      logger.info(`[CHECK][result]: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error(`[ERROR][completionWithRetry]: ${error.message}`);
      throw error;
    }
    await handleStreamingResponse(
      res,
      result,
      chatSession,
      userMessageDoc,
      textSplitter,
      vectorQueryStore,
      initializationData,
      chatHistory,
      systemContent,
      assistantInstructions,
      formattedPrompt
    );
  } catch (error) {
    handleError(res, error);
  } finally {
    res.end();
  }
};
const calculateRange = (range, fileSize) => {
  const parts = range?.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunksize = end - start + 1;

  return { start, end, chunksize };
};
const createPartialContentHeaders = (start, end, fileSize, chunksize) => {
  return {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'application/octet-stream',
  };
};
const createFullContentHeaders = (fileSize) => {
  return {
    'Content-Length': fileSize,
    'Content-Type': 'application/octet-stream',
  };
};
const handleFileStreaming = (req, res) => {
  const filePath = path.join(__dirname, '../../../uploads', req.body.fileName);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const { start, end, chunksize } = calculateRange(range, fileSize);
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, createPartialContentHeaders(start, end, fileSize, chunksize));
    file.pipe(res);
  } else {
    res.writeHead(200, createFullContentHeaders(fileSize));
    fs.createReadStream(filePath).pipe(res);
  }
};
const getInitializationData = (body) => ({
  apiKey: body.clientApiKey || process.env.OPENAI_API_PROJECT_KEY,
  userId: body.userId,
  workspaceId: body.workspaceId,
  sessionId: body.sessionId,
  prompt: body.regenerate ? null : body.prompt,
  role: body.role,
  sessionLength: body.count || 0,
  temperature: 0.5,
  maxTokens: 1024,
  topP: 1,
  frequencyPenalty: 0.5,
  presencePenalty: 0,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  searchEngineKey: process.env.GOOGLE_SERPER_API_KEY,
  pineconeEnv: process.env.PINECONE_API_KEY,
  pineconeIndex: process.env.PINECONE_INDEX,
  namespace: process.env.PINECONE_NAMESPACE_1,
  dimensions: parseInt(process.env.PINECONE_EMBEDDING_MODEL_DIMENSION),
  embeddingModel: process.env.PINECONE_EMBEDDING_MODEL_NAME,
  completionModel: process.env.OPENAI_API_CHAT_COMPLETION_MODEL,
});
const setupResponseHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
};
const setupVectorStores = async (pinecone, embedder, initializationData) => {
  const pineconeIndex = await createPineconeIndex(pinecone, initializationData.pineconeIndex);
  const vectorQueryStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex,
    namespace: 'chat-history',
    textKey: 'text',
  });
  const vectorStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex,
    namespace: 'library-documents',
    textKey: 'text',
  });
  return { vectorQueryStore, vectorStore };
};
const getRelevantContext = async (vectorQueryStore, vectorStore, prompt) => {
  const relevantSessionHistory = await vectorQueryStore.similaritySearch(prompt, 5);
  const relevantDocs = await vectorStore.similaritySearch(prompt, 5);
  return {
    sessionContext: relevantSessionHistory.map((doc) => doc.pageContent).join('\n'),
    docsContext: relevantDocs.map((doc) => doc.pageContent).join('\n'),
  };
};
const extractAdditionalInfo = async (prompt) => {
  const keywords = await extractKeywords(prompt);
  const { uiLibraries, jsLibraries, componentTypes } = await identifyLibrariesAndComponents(prompt);
  const documentationContent = await getDocumentationContent(uiLibraries, componentTypes);
  return { keywords, uiLibraries, jsLibraries, componentTypes, documentationContent };
};
const getDocumentationContent = async (uiLibraries, componentTypes) => {
  let documentationContent = [];
  if (uiLibraries.length > 0 && componentTypes.length > 0) {
    for (const library of uiLibraries) {
      for (const componentType of componentTypes) {
        const docUrl = await getDocumentationUrl(library, componentType);
        if (docUrl) {
          const content = await scrapeDocumentation(docUrl);
          documentationContent.push({ library, componentType, content });
        }
      }
    }
  } else if (componentTypes.length > 0) {
    const randomLibraries = uiLibraries.sort(() => 0.5 - Math.random()).slice(0, 3);
    for (const library of randomLibraries) {
      for (const componentType of componentTypes) {
        const docUrl = await getDocumentationUrl(library.name, componentType);
        if (docUrl) {
          const content = await scrapeDocumentation(docUrl);
          documentationContent.push({ library: library.name, componentType, content });
        }
      }
    }
  }
  return documentationContent;
};
const createFormattedPrompt = (
  initializationData,
  context,
  summary,
  searchResults,
  keywords,
  uiLibraries,
  jsLibraries,
  componentTypes,
  documentationContent,
  formattingGuide
) => `
  --- MAIN INSTRUCTIONS AND CONTEXT ---

  CHAT CONTEXT: ${context.sessionContext}
  SUMMARY OF CHAT HISTORY: ${summary}
  RELEVANT DOCS: ${context.docsContext}
  EXTRACTED KEYWORDS: ${keywords.join(', ')}
  IDENTIFIED UI LIBRARIES: ${uiLibraries.join(', ')}
  IDENTIFIED JS LIBRARIES: ${jsLibraries.join(', ')}
  IDENTIFIED COMPONENT TYPES: ${componentTypes.join(', ')}
  DOCUMENTATION CONTENT FROM SCRAPED UI LIBRARY CONTENT: ${documentationContent?.map((doc) => `${doc.library} - ${doc.componentType}:\n${doc.content}`).join('\n\n')}

  --- USER PROMPT/QUERY ---

  USER PROMPT/QUERY: ${initializationData.prompt}

  --- PERPLEXITY WEB SEARCH RESULTS ---

  RESULTS: ${searchResults.pageContent}

  CITATIONS: ${searchResults.metadata.citations}

  --- FINAL INSTRUCTIONS ---

  Based on the user's query, extracted information, and the provided context, please generate a response following the instructions given in the system and assistant messages. 
  Ensure that your answer is comprehensive, professional, and tailored to creating high-quality React styled components. 
  Please ensure your response includes:

  1. A brief explanation of the component's purpose and design rationale
  2. The full React component code, utilizing the latest React features and best practices
  3. Examples of how to use and customize the component

  --- RESPONSE FORMATTING INSTRUCTIONS ---

  Format your response as a valid JSON object with markdown content.

  ## CONTENT REQUIREMENTS:
  - **Component Explanation**: Provide a clear and concise description of what the component does, why it’s useful, and how it fits into the larger application.
  - **Code Blocks**: Ensure the component code is wrapped in \`\`\` code blocks.
  - **Citations**: If you reference any documentation or external sources, provide them in a 'References' section at the end.
  - **Structure**: Ensure the response is structured as JSON, where markdown is used for code and explanations.

  ## FORMATTING GUIDE: Use the following guide to format messages using Markdown syntax. 
	This includes headings, text formatting, lists, links, images, blockquotes, code blocks, and more.
	Ensure to apply the appropriate syntax for the desired formatting.
	Please return final response JSON (json): { "content": "Your Markdown formatted message", "type": "markdown" }.
	Markdown Guide

	Headings:

	# (H1)

	Example: # Heading 1 renders as:

	Heading 1
	## (H2)

	Example: ## Heading 2 renders as:

	Heading 2
	### (H3)

	Example: ### Heading 3 renders as:

	Heading 3
	#### (H4)

	Example: #### Heading 4 renders as:

	Heading 4
	##### (H5)

	Example: ##### Heading 5 renders as:

	Heading 5
	###### (H6)

	Example: ###### Heading 6 renders as:

	Heading 6
	Text Formatting:

	**bold** or __bold__

	Example: **Bold Text** renders as: Bold Text

	*italic* or _italic_

	Example: *Italic Text* renders as: Italic Text

	***bold and italic***

	Example: ***Bold and Italic Text*** renders as: Bold and Italic Text

	~~strikethrough~~

	Example: ~~Strikethrough Text~~ renders as: Strikethrough Text

	\`inline code\`

	Example: \`Inline Code\` renders as: Inline Code

	Lists:

	Numbered: Start with 1., 2., etc.

	Example:

	1. Item A
	2. Item B
	Renders as:

	1. Item A
	2. Item B

	Bullet: Start with -, *, or +

	Example:

	- Item A
	* Item B
	+ Item C
	Renders as:

	- Item A
	- Item B
	- Item C

	(It's also possible to indent numbered Lists & bulleted Lists!)

	- Task lists: Start with [ ] (unchecked) or [x] (checked)

	Example:
	- [ ] Unchecked Task
	- [x] Checked Task

	Renders as:
	- [ ] Unchecked Task
	- [x] Checked Task

	Links and Images:
	- Hyperlink: [link text](URL)
	- Example: [Google](https://www.google.com) renders as: Google
	- Image: ![alt text](URL)
	- Example: ![Placeholder Image](https://via.placeholder.com/150) renders as (using a placeholder image): Placeholder Image

	Blockquotes:
	- Start with >
	- Example: > Blockquote Renders as:

	> Blockquote

	> Multiple lines
	>
	> Blockquote
	> Main Quote
	>
	> > Indented Quote
	> >
	> > More of the Indented Quote
	(it's also possible to indent these blockquotes!)

	Code Blocks:
	- Enclose with triple backticks or indent with 4 spaces.
	- Example: \`\`\` Code Block \`\`\` Renders as:

	\`\`\`
	Code Block
	\`\`\`

	Horizontal Rule:
	- Use ---, ___, or ***
	- Example: --- renders as: ---

	Escape Special Characters:
	Use a backslash \ before the character.
	- Example: \# Not a Heading renders as: # Not a Heading

	Tables:
	- Example: | Header 1 | Header 2 |
	|----------|----------|
	| Cell 1 | Cell 2 |
	Renders as:
	| Header 1 | Header 2 |
	|----------|----------|
	| Cell 1 | Cell 2 |

	Superscript: ^ (works on some platforms like Reddit)
	- Example: E = mc^2 might render as (E = mc²) on supported platforms.

	Subscript: ~ (in specific platforms)
	- Example: H~2~O might render as (H₂O) on supported platforms.

	Table of Contents: [TOC] (in specific platforms/extensions).

	Footnotes: [^1] and [^1]: (in some Markdown parsers).

	Definition Lists (in specific platforms):
	- Example: Term : Definition

	Abbreviations (in specific platforms):
	- Example: *[HTML]: Hyper Text Markup Language

	Highlight: ==highlighted text== (in platforms like StackEdit).

	Custom Containers (in platforms like VuePress):
	- Example: ::: warning *Here be dragons* :::

	Emoji: :emoji_name: (in platforms like GitHub).
	- Example: :smile: might render as 🙂 on supported platforms.

	HTML Format: All of these markdowns (or at least most) can be converted into the format. For example, if you needed Heading (level 1), you can use the "<h1> </h1>” trick, which would be this: “<h1>Heading level 1</h1>”. This conversion applies to most markdowns used in website design and construction.

	Special Characters: Of course, there's a whole set of Characters which can be used in formatting, like [brackets], {curly brackets}, \backslashes, <angle brackets>, and so much more!

	Mermaid Diagrams:
	- Mermaid diagrams can be used to create flowcharts, sequence diagrams, class diagrams, and more using the mermaid syntax.
	- To include a Mermaid diagram, use the following format:
	\`\`\`mermaid
	diagram_type
	diagram_code
	\`\`\`
	- Example: To create a flowchart, you can use:
	\`\`\`mermaid
	graph TD;
		A-->B;
		A-->C;
		B-->D;
		C-->D;
	\`\`\`
	This will render a simple flowchart with nodes A, B, C, and D.

	Citations:
  - When including information from external sources, use inline citations in the format [@AuthorYear].
  - At the end of the response, include a "References" section with full citation details.
  - Format each reference as follows:
    [@AuthorYear]: Author, A. (Year). Title of the work. Source. URL

  Example:
  This is a sentence with a citation [@Smith2023].

  References:
  [@Smith2023]: Smith, J. (2023). Example Article. Journal of Examples. https://example.com/article

  Please return final response JSON (json): { "content": "Your Markdown formatted message with citations", "type": "markdown", "references": ["Array of reference strings"] }.

		Now, with all the markdowns I've provided, use these to create a [Type of Content Here]; maintaining the markdowns provided.
		**Additional Styling Instructions**:
		- Ensure that any \`mark\` or highlighted text is styled with responsive width by applying flexbox styles or an equivalent method. This will allow the text to be responsive when resizing the window. For example, wrap the \`mark\` element within a \`div\` or \`span\` styled with \`display: flex;\` and \`flex-wrap: wrap;\` or similar responsive styles.


  --- EXAMPLE RESPONSE FORMAT ---

  \`\`\`json
  {
    "explanation": "This component is a reusable button designed to follow Material UI styling conventions. It supports customization via props like 'color', 'size', and 'onClick' handler.",
    "code": \`\`\`
    import React from 'react';
    import Button from '@mui/material/Button';

    const CustomButton = ({ color = 'primary', size = 'medium', onClick }) => (
      <Button variant="contained" color={color} size={size} onClick={onClick}>
        Click Me
      </Button>
    );

    export default CustomButton;
    \`\`\`
    "usageExample": \`\`\`
    // Usage in a parent component
    import CustomButton from './CustomButton';

    const ParentComponent = () => (
      <CustomButton color="secondary" size="large" onClick={() => alert('Button clicked!')} />
    );

    export default ParentComponent;
    \`\`\`,
    "references": "Material UI Button Documentation: https://mui.com/components/buttons/"
  }

  Ensure the response follows this structure and adheres to the guidelines provided.
  The final response data should look as follows JSON (json): { "content": "Your Markdown formatted message", "type": "markdown" }.
  `;

const DONE_MESSAGE = '[DONE]';
const handleStreamingResponse = async (
  res,
  result,
  chatSession,
  userMessageDoc,
  textSplitter,
  vectorQueryStore,
  initializationData,
  chatHistory,
  systemContent,
  assistantInstructions,
  formattedPrompt
) => {
  const responseChunks = [];

  try {
    for await (const chunk of result) {
      const { content = '' } = chunk.choices[0]?.delta || {};
      responseChunks.push(content);
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
      res.flush();
    }

    const fullResponse = responseChunks.join('');

    await processChatCompletion(
      chatSession,
      systemContent,
      assistantInstructions,
      formattedPrompt,
      fullResponse,
      textSplitter,
      vectorQueryStore,
      initializationData
    );

    return fullResponse;
  } catch (error) {
    logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
    throw error;
  } finally {
    res.write(`data: ${JSON.stringify({ content: DONE_MESSAGE })}\n\n`);
    res.end();
  }
};

const processChatCompletion = async (
  chatSession,
  systemContent,
  assistantInstructions,
  formattedPrompt,
  fullResponse,
  textSplitter,
  vectorQueryStore,
  initializationData
) => {
  logger.info(`[CHECK][processChatCompletion] ${fullResponse}`);
  // let formattedContent = formatResponse(fullResponse);
  // Save the chat completion and add the message
  await saveChatCompletion(
    systemContent,
    assistantInstructions,
    formattedPrompt,
    fullResponse,
    'chat_completion.txt'
  );

  // await addMessage(chatSession, {
  //   role: role,
  //   content: content,
  // });

  // Prepare documents for vector store
  const docs = prepareDocuments(initializationData, chatSession, fullResponse);
  const splitDocs = await textSplitter.splitDocuments(docs);

  // Store split documents in vector store
  await vectorQueryStore.addDocuments(splitDocs);
  await chatSession.save();
};

const prepareDocuments = (initializationData, chatSession, content) => [
  {
    pageContent: initializationData.prompt,
    metadata: { chatId: chatSession._id.toString(), role: 'user' },
  },
  {
    pageContent: content,
    metadata: { chatId: chatSession._id.toString(), role: 'assistant' },
  },
];

// const handleStreamingResponse = async (
//   res,
//   result,
//   // responseHandler,
//   chatSession,
//   userMessageDoc,
//   textSplitter,
//   vectorQueryStore,
//   initializationData,
//   // eslint-disable-next-line no-unused-vars
//   chatHistory,
//   systemContent,
//   assistantInstructions,
//   formattedPrompt,
// ) => {
//   let full_response = '';
//   let buffer = ''; // Buffer to hold partial chunks of data
//   const markdownSectionRegex = /(?:^|\n)(#{1,6}\s.*$)/gm; // Regex to match markdown headers

//   for await (const chunk of result) {
//     const chunkContent = extractContent(chunk);
//     logger.info(`[CHECK][chunkContent]: ${chunkContent}`);

//     // Append the chunk to the buffer
//     buffer += chunkContent;

//     // Split the buffer by markdown sections (or other logic for splitting)
//     let splitSections = buffer.split(markdownSectionRegex);

//     // Process all sections except the last one (which might be incomplete)
//     for (let i = 0; i < splitSections.length - 1; i++) {
//       const section = splitSections[i];
//       full_response += section;
//       res.write(`data: ${JSON.stringify(section)}\n\n`);
//       res.flush();
//     }

//     // Keep the last section (which could be incomplete) in the buffer
//     buffer = splitSections[splitSections.length - 1];
//   }

//   // Handle any remaining content in the buffer
//   if (buffer) {
//     full_response += buffer;
//     res.write(`data: ${JSON.stringify(buffer)}\n\n`);
//     res.flush();
//   }

//   // check if response is complete
//   if (full_response.includes('[DONE]')) {
//     await saveChatCompletion(
//       systemContent,
//       assistantInstructions,
//       formattedPrompt,
//       full_response,
//       'chat_completion.txt',
//     );
//     const assistantMessageDoc = await addMessage(chatSession, {
//       role: 'assistant',
//       content: full_response,
//     });
//     await addMessage(chatSession, assistantMessageDoc);

//     const docs = [
//       {
//         pageContent: initializationData.prompt,
//         metadata: { chatId: chatSession._id.toString(), role: 'user' },
//       },
//       {
//         pageContent: full_response,
//         metadata: { chatId: chatSession._id.toString(), role: 'assistant' },
//       },
//     ];
//     const splitDocs = await textSplitter.splitDocuments(docs);
//     await vectorQueryStore.addDocuments(splitDocs);
//     await chatSession.save();

//     res.write('data: [DONE]\n\n');
//   }
// };

const handleError = (res, error) => {
  logger.error(`Error in combinedChatStream: ${error}`);
  if (!res.headersSent) {
    res.status(500).json({ error: 'An error occurred while processing the chat stream' });
  }
};

module.exports = { combinedChatStream };
