const config = require("@config/index");
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: config.pineconeApiKey
});

const index = pc.index(config.pineconeIndexName);

class DocumentModel {
  async upsertDocument(document, namespaceId) {
    const namespace = index.namespace(namespaceId);

    const vectors = document.chunks.map((chunk) => ({
      id: chunk.id,
      values: chunk.values,
      metadata: {
        text: chunk.text,
        referenceURL: document.documentUrl
      }
    }));

    const batchSize = 200;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
    }
  }

  async listDocumentChunks(documentId, namespaceId, limit, paginationToken) {
    try {
      const namespace = index.namespace(namespaceId);
      const listResult = await namespace.listPaginated({
        prefix: `${documentId}:`,
        limit: limit,
        paginationToken: paginationToken
      });

      const chunks = listResult.vectors?.map((vector) => ({ id: vector.id || "" })) || [];
      return { chunks, paginationToken: listResult.pagination?.next };
    } catch (error) {
      console.error(`Failed to list document chunks for document ${documentId}: ${error}`);
      throw error;
    }
  }

  async deleteDocumentChunks(chunkIds, namespaceId) {
    console.log("Deleting Document Chunks");
    const namespace = index.namespace(namespaceId);
    await namespace.deleteMany(chunkIds);
  }

  async deletePineconeNamespace(namespaceId) {
    console.log("Deleting Workspace");
    const namespace = index.namespace(namespaceId);
    await namespace.deleteAll();
    console.log("Workspace deleted from Pinecone successfully");
  }
}

module.exports = { DocumentModel };
