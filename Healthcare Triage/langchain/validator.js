const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

const healthCheckPrompt = PromptTemplate.fromTemplate(
  `You are a strict health input validator. Only answer Yes or No.
  Is the following input describing a health-related symptom?

  "{description}"`
);

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const healthCheckChain = healthCheckPrompt.pipe(llm).pipe(new StringOutputParser());

async function isHealthRelated(description) {
  const result = await healthCheckChain.invoke({ description });
  return result.trim().toLowerCase().startsWith("yes");
}

module.exports = { isHealthRelated };
