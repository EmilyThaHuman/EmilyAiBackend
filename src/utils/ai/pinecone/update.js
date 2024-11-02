// update.js

const { getPineconeClient } = require("./get");

const updatePinecone = async (pinecone, indexName, docs, embeddings) => {
  console.log("Updating Pinecone index...");
  const index = pinecone.Index(indexName);

  const batchSize = 100;
  let batch = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const embedding = await embeddings.embedQuery(doc.content);

    const vector = {
      id: `doc_${i}`,
      values: embedding,
      metadata: {
        content: doc.content,
        tokens: doc.tokens
      }
    };

    batch.push(vector);

    if (batch.length === batchSize || i === docs.length - 1) {
      await index.upsert({
        upsertRequest: {
          vectors: batch
        }
      });
      console.log(`Upserted batch of ${batch.length} vectors`);
      batch = [];
    }
  }

  console.log(`Pinecone index updated with ${docs.length} vectors`);
};

/**
 * Upserts embeddings into the specified namespace of the Pinecone index.
 *
 * @async
 * @param {Object} data - The dictionary of functions and classes with embeddings.
 * @param {string} [namespace=`codebase${cookies().get("seed").value}`] - The namespace in the index to upsert to.
 * @returns {Promise<void>} A promise that resolves once the embeddings are upserted.
 */
const upsertEmbeddings = async (data, namespace = `codebase${cookies().get("seed").value}`) => {
  // Prepare the upsert request payload
  const upsertPayload = [];
  const pc = await getPineconeClient();

  // Handle functions
  data.functions.forEach((func) => {
    if (func.embedding && Array.isArray(func.embedding)) {
      upsertPayload.push({
        id: func.function_name,
        values: func.embedding,
        metadata: { filepath: func.filepath, type: "function" }
      });
    }
  });

  // Handle classes
  data.classes.forEach((cls) => {
    if (cls.embedding && Array.isArray(cls.embedding)) {
      upsertPayload.push({
        id: cls.class_name,
        values: cls.embedding,
        metadata: { filepath: cls.filepath, type: "class" }
      });
    }
  });

  // Upsert the data into Pinecone
  await pc.index.namespace(namespace).upsert(upsertPayload);
  console.log("Embeddings upserted successfully.");
};

module.exports = { updatePinecone, upsertEmbeddings };
