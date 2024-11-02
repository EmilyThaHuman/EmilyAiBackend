const { OpenAI } = require("@langchain/openai");
const { loadQAStuffChain } = require("langchain/chains");
const { Document } = require("langchain/document");
const { getPineconeClient } = require("./get");
const { vectorize } = require("@utils/processing/utils");
const { getEnv } = require("@utils/processing/api");
const { Pinecone } = require("@pinecone-database/pinecone");
const { getEmbedding } = require("../openAi");
const { cosineSimilarity } = require("ai");

const queryPineconeVectorStoreAndQueryLLM = async (pinecone, indexName, question, embeddings) => {
  console.log("Querying Pinecone vector store...");

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
      includeMetadata: true
    });

    console.log(`Found ${queryResponse.matches.length} matches...`);
    console.log(`Asking question: ${question}...`);

    if (queryResponse.matches.length) {
      const llm = new OpenAI({
        apiKey: getEnv("OPENAI_API_PROJECT_KEY") || process.env.OPENAI_API_PROJECT_KEY,
        model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
        temperature: 0.7 // Adjust as needed
      });
      const chain = loadQAStuffChain(llm);

      const concatenatedPageContent = queryResponse.matches
        .map((match) => match.metadata.content)
        .join(" ");

      const result = await chain.invoke({
        input_documents: [new Document({ pageContent: concatenatedPageContent })],
        question: question
      });

      console.log(`Answer: ${result.text}`);
      return result.text;
    } else {
      console.log("No matches found in the vector store. Unable to answer the question.");
      return null;
    }
  } catch (error) {
    console.error("Error querying Pinecone or OpenAI:", error);
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
      vector
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error querying components.");
  }
};

const searchSimilarVectors = async (pinecone, indexName, question, embeddings) => {
  const index = pinecone.Index(indexName);
  const queryEmbedding = await embeddings.embedQuery(question);
  const searchResults = await index.query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true
  });

  return searchResults.matches.map((match) => match.metadata);
};

// Used to retrieve matches for the given embeddings
const getMatchesFromEmbeddings = async (embeddings, topK, namespace) => {
  const pinecone = new Pinecone();

  let indexName = process.env.PINECONE_INDEX_NAME || "";
  if (indexName === "") {
    indexName = "namespace-notes";
    console.warn("PINECONE_INDEX_NAME environment variable not set");
  }
  const indexes = (await pinecone.listIndexes())?.indexes;
  if (!indexes || indexes.filter((i) => i.name === indexName).length !== 1) {
    throw new Error(`Index ${indexName} does not exist. 
    Create an index called "${indexName}" in your project.`);
  }

  const pineconeNamespace = pinecone.Index(indexName).namespace(namespace ?? "");

  try {
    const queryResult = await pineconeNamespace.query({
      vector: embeddings,
      topK,
      includeMetadata: true
    });
    return queryResult.matches || [];
  } catch (e) {
    console.log("Error querying embeddings: ", e);
    throw new Error(`Error querying embeddings: ${e}`);
  }
};

// df["code_embedding"] = df["code"].map((x) => getEmbedding(x, (model = "text-embedding-3-small")));

// function search_functions(df, code_query, n = 3, pprint = true, n_lines = 7) {
//   const embedding = get_embedding(code_query, (model = "text-embedding-3-small"));
//   df["similarities"] = df.code_embedding.map((x) => cosineSimilarity(x, embedding));
//   const res = df.sort("similarities", "desc").head(n);
//   return res;
// }

// const res = search_functions(df, "Completions API tests", (n = 3));
const summarizeDocument = async (doc) => {
  try {
    const openaiClient = getOpenaiClient();

    const response = await openaiClient.completions.create({
      model: "text-davinci-003",
      prompt: `Summarize the following content:\n\n${doc}`,
      max_tokens: 150,
      temperature: 0.7
    });
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error(`Error summarizing document: ${error.message}`);
    throw error;
  }
};
module.exports = {
  queryPineconeVectorStoreAndQueryLLM,
  queryComponents,
  searchSimilarVectors,
  getMatchesFromEmbeddings
};
