const { ChatOpenAI } = require("langchain/chat_models");
const { PromptTemplate } = require("langchain/prompts");
const { StringOutputParser } = require("langchain/schema/output_parser");


const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

const prompt = PromptTemplate.fromTemplate(`
  Classify the following symptom description into two parts:
  1. Urgency Level: Choose one of [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed]
  2. Category: Choose from [Allergy, Infection, Flu, Injury, Pain, Cardiac, etc.]

  Respond in this format:
  Urgency Level: <urgency>
  Category: <category>
Symptom: "{description}"
`);

const parser = new StringOutputParser();

const classifySymptom = async (description) => {
  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({ description });

  const urgency = result.match(/Urgency Level:\s*(.*)/i)?.[1]?.trim();
  const category = result.match(/Category:\s*(.*)/i)?.[1]?.trim();

  return { urgency, category, raw: result };
};

module.exports = { classifySymptom };
