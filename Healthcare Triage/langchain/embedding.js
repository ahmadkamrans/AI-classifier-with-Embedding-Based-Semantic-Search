const { OpenAIEmbeddings } = require("@langchain/openai");

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text) {
  return await embeddings.embedQuery(text);
}

module.exports = { generateEmbedding, embeddings };
