const { ChatOpenAI } = require("langchain/chat_models");
const { PromptTemplate } = require("langchain/prompts");
const { StringOutputParser } = require("langchain/schema/output_parser");

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

const prompt = PromptTemplate.fromTemplate(`
  You are a strict health input validator. Only answer Yes or No.

  Is the following input describing a health-related symptom?

  "{description}"
`);

const parser = new StringOutputParser();

const validateSymptom = async (description) => {
  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({ description });
  return result.trim().toLowerCase().startsWith("yes");
};

module.exports = { validateSymptom };
