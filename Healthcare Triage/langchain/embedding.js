const { OpenAIEmbeddings } = require("langchain/embeddings");


const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
});

const getEmbedding = async (text) => {
  const [embed] = await embeddings.embedDocuments([text]);
  return embed;
};

module.exports = { getEmbedding };
