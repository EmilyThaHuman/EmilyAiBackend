const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { Document } = require('@langchain/core/documents');
const { OpenAI } = require('langchain/llms/openai');
const { RetrievalQAChain } = require('langchain/chains');

class ContextService {
  constructor() {
    this.pinecone = new Pinecone();
    this.pineconeIndex = this.pinecone.Index(process.env.PINECONE_INDEX);
    this.embeddings = new OpenAIEmbeddings();
    this.vectorStore = null;
    this.llm = new OpenAI();
  }

  async initialize() {
    this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex: this.pineconeIndex,
    });
  }

  async addDocument(content, metadata = {}) {
    const doc = new Document({ pageContent: content, metadata });
    await PineconeStore.fromDocuments([doc], this.embeddings, {
      pineconeIndex: this.pineconeIndex,
    });
  }

  async queryContext(query) {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const chain = RetrievalQAChain.fromLLM(this.llm, this.vectorStore.asRetriever());
    const response = await chain.call({ query });
    return response.text;
  }

  async similaritySearch(query, k = 4) {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const results = await this.vectorStore.similaritySearch(query, k);
    return results;
  }
}

module.exports = ContextService;
