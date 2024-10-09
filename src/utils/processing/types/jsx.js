const { encode } = require('gpt-tokenizer');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { CHUNK_SIZE, CHUNK_OVERLAP } = require('@/config/constants');

const processJSX = async (jsFile) => {
  const fileBuffer = Buffer.from(await jsFile.arrayBuffer());
  const textDecoder = new TextDecoder('utf-8');
  const textContent = textDecoder.decode(fileBuffer);

  const splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const splitDocs = await splitter.createDocuments([textContent]);

  let chunks = [];

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i];

    chunks.push({
      content: doc.pageContent,
      tokens: encode(doc.pageContent).length,
    });
  }

  return chunks;
};

module.exports = { processJSX };
