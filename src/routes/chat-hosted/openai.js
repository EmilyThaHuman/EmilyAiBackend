/* eslint-disable no-constant-condition */
require("dotenv").config();
const express = require("express");
const { createOpenAI } = require("@ai-sdk/openai");
const { StreamData, streamText, generateText, cosineSimilarity, embed, embedMany } = require("ai");
const { Pinecone } = require("@pinecone-database/pinecone");

const router = express.Router();

// Helper to get environment variables
const getEnv = (key) => process.env[key];

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: getEnv("OPENAI_API_PROJECT_KEY"),
  compatibility: "strict"
});

// Initialize Pinecone with API key
const pinecone = new Pinecone({
  apiKey: getEnv("PINECONE_API_KEY")
});

// System message constant
const SYSTEM_MESSAGE = `Create highly sophisticated and complex styled and functional React components that utilize advanced React features for enhanced performance, modularity, and reusability.

Detail your approach to structuring and styling React components, leveraging advanced features such as hooks, context, and state management for functionality, and utilizing libraries or custom approaches for styling.

# Steps

1. **Component Structure:**
   - Clearly define the component’s purpose and its role within the application.
   - Decide whether to use a functional or class component based on the complexity and requirements.
   - Leverage React hooks like \`useState\`, \`useReducer\`, and \`useContext\` for internal state management.
   - Integrate external state management solutions like Redux or MobX for complex or shared states.
   - Utilize error boundaries for better error handling and data management.

2. **Styling:**
   - Choose a styling approach, such as CSS-in-JS (e.g., Styled Components, Emotion), traditional CSS/SCSS, or utility-based CSS frameworks like Tailwind.
   - Implement responsive design principles to ensure components adapt seamlessly to different screen sizes.
   - Integrate theming capabilities using libraries like Material-UI's \`ThemeProvider\` or Styled Component’s theming to create a unified visual experience.
   - Utilize CSS preprocessor features like nesting, variables, and mixins for streamlined styling.

3. **Functionality:**
   - Implement complex business logic within hooks or separate utility functions to maintain separation of concerns.
   - Use libraries like Axios or React Query to handle asynchronous data fetching and synchronization with state.
   - Use context API or state management tools like Redux Toolkit for a scalable state architecture that minimizes prop drilling.
   - Integrate robust error boundaries and fallback UIs for handling API calls or unpredictable logic.

4. **Performance Optimization:**
   - Use \`useMemo\` and \`useCallback\` to memoize expensive calculations or callbacks.
   - Implement lazy loading for large components or code-splitting techniques using React's \`Suspense\` and \`React.lazy\`.
   - Use \`React.memo\` to prevent unnecessary re-renders and improve component efficiency.
   - Implement pagination, infinite scrolling, or batch loading for components handling large datasets.

5. **Testing and Validation:**
   - Write unit tests using Jest to verify the component's logic and individual units.
   - Use React Testing Library for UI validation, focusing on user-centric testing practices.
   - Perform end-to-end tests with tools like Cypress to validate complete workflows.
   - Aim for high test coverage and include tests for edge cases and error states.

6. **Documentation and Code Quality:**
   - Include detailed inline comments to explain complex code blocks, logic decisions, and API integrations.
   - Ensure code follows best practices for readability, maintainability, and scalability.
   - Use clear and consistent naming conventions for variables, functions, and component files.

# Output Format

Provide the React component as structured code following industry best practices, with detailed inline comments to explain the rationale behind key decisions, particularly for complex logic or integrations.

# Examples

**Example 1:**
- **Input:** Create a data table with sorting, filtering, pagination, and server-side data fetching using styled components.
- **Output:**
  \`\`\`jsx
  import React, { useState, useEffect, useMemo } from 'react';
  import styled from 'styled-components';
  import axios from 'axios';
  
  const TableContainer = styled.div\`
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0 auto;
    padding: 1rem;
  \`;

  const DataTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    useEffect(() => {
      setLoading(true);
      axios.get('/api/data')
        .then(response => {
          setData(response.data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to fetch data');
          setLoading(false);
        });
    }, []);

    const sortedData = useMemo(() => data.sort((a, b) => a.value - b.value), [data]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    return (
      <TableContainer>
        {sortedData.map(item => (
          <div key={item.id}>
            {item.name}: {item.value}
          </div>
        ))}
      </TableContainer>
    );
  };

  export default DataTable;
  \`\`\`

# Notes

- Maintain a clear separation between logic and presentation.
- Ensure all asynchronous operations include appropriate error handling.
- Focus on building components that are reusable, modular, and easy to maintain.
`;

// Assistant message constant
const ASSISTANT_MESSAGE = "";

/* --- Endpoint 1: Text Generation --- */
router.post("/generate-text", async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt
    });
    console.log("Result:", result);

    res.status(200).json({
      result: result.text
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --- Endpoint 2: Streamed Text Generation --- */
router.post("/generate-text-stream", async (req, res) => {
  const { prompt } = req.body;

  try {
    const data = new StreamData();
    data.append("initialized call");
    // Initialize a stream
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      maxTokens: 512,
      temperature: 0.3,
      maxRetries: 5,
      prompt: prompt,
      onFinish() {
        data.append("call completed");
        data.close();
      }
    });

    // Pipe the result to the response
    // console.log("Result:", result);

    const reader = result.textStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      console.log(value);
      data.append(value);
    }
    // result.pipeDataStreamToResponse(res, { data });
    result.pipeTextStreamToResponse(res);

    // res.status(200).json({
    //   result: result
    // });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --- Endpoint 3: Chat Completion --- */
router.post("/chat-completion", async (req, res) => {
  const { messages } = req.body; // Array of messages (e.g., {role: "user", content: "Hello!"})

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      maxTokens: 1024,
      system: SYSTEM_MESSAGE,
      messages: messages
    });

    console.log(result.text);
    res.status(200).json({
      result: result.text
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --- Endpoint 4: Streamed Chat Completion --- */
router.post("/chat-completion-stream", async (req, res) => {
  const { messages } = req.body; // Array of messages

  try {
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      maxTokens: 1024,
      system: SYSTEM_MESSAGE,
      messages: messages
    });

    for await (const textPart of result.textStream) {
      console.log(textPart);
    }
    result.pipeTextStreamToResponse(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --- Endpoint 5: Retrieval-Augmented Generation (RAG) --- */
router.post("/rag", async (req, res) => {
  const { query } = req.body;

  try {
    // Step 1: Retrieve relevant documents from Pinecone (or any vector database)
    const index = Pinecone.Index("your-index-name");
    const results = await index.query({
      topK: 3,
      vector: query.vector, // Assuming the query has been embedded as a vector
      includeMetadata: true
    });

    const relevantDocuments = results.matches.map((match) => match.metadata.text).join("\n");

    // Step 2: Use OpenAI to generate the response based on retrieved documents
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Use the following documents to answer the user's query: ${relevantDocuments}`
        },
        { role: "user", content: query.text }
      ]
    });

    res.status(200).json({
      result: completion.choices[0].message.content.trim()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
