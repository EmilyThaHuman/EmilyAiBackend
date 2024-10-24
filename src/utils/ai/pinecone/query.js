const { OpenAI } = require('@langchain/openai');
const { loadQAStuffChain } = require('langchain/chains');
const { Document } = require('langchain/document');
const { getPineconeClient } = require('./get');
const { vectorize } = require('@/utils/processing/utils');
const { getEnv } = require('@/utils/api');

const queryPineconeVectorStoreAndQueryLLM = async (pinecone, indexName, question, embeddings) => {
  console.log('Querying Pinecone vector store...');

  const index = pinecone.Index(indexName);
  console.log(`Querying index "${indexName}"...`);
  try {
    console.log(`Querying embeddings "${JSON.stringify(embeddings)}"`);
    console.log(`Querying question "${question}"...`);
    const queryEmbedding = await embeddings.embedQuery(question);
    console.log(`Query embedding: ${queryEmbedding}`);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeValues: true,
      includeMetadata: true,
    });

    console.log(`Found ${queryResponse.matches.length} matches...`);
    console.log(`Asking question: ${question}...`);

    if (queryResponse.matches.length) {
      const llm = new OpenAI({
        apiKey: getEnv('OPENAI_API_PROJECT_KEY') || process.env.OPENAI_API_PROJECT_KEY,
        model: getEnv('OPENAI_API_CHAT_COMPLETION_MODEL'),
        // model: 'gpt-4-1106-preview',
        temperature: 0.7, // Adjust as needed
      });
      const chain = loadQAStuffChain(llm);

      const concatenatedPageContent = queryResponse.matches
        .map((match) => match.metadata.content)
        .join(' ');

      const result = await chain.invoke({
        input_documents: [new Document({ pageContent: concatenatedPageContent })],
        question: question,
      });

      console.log(`Answer: ${result.text}`);
      return result.text;
    } else {
      console.log('No matches found in the vector store. Unable to answer the question.');
      return null;
    }
  } catch (error) {
    console.error('Error querying Pinecone or OpenAI:', error);
    throw error;
  }
};

const queryComponents = async (req, res) => {
  const { query, library } = req.body;

  try {
    const vector = await vectorize(query);
    const pinecone = await getPineconeClient();
    const result = await pinecone.query({
      namespace: library,
      vector,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error querying components.');
  }
};

const searchSimilarVectors = async (pinecone, indexName, question, embeddings) => {
  const index = pinecone.Index(indexName);
  const queryEmbedding = await embeddings.embedQuery(question);
  const searchResults = await index.query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true,
  });

  return searchResults.matches.map((match) => match.metadata);
};

module.exports = { queryPineconeVectorStoreAndQueryLLM, queryComponents, searchSimilarVectors };
