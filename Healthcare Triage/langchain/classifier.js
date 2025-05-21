const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

const classificationPrompt = PromptTemplate.fromTemplate(
  `Classify the following symptom description into two parts:
  1. Urgency Level: Choose one of [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed]
  2. Category: Choose from [Allergy, Infection, Flu, Injury, Pain, Cardiac, etc.]

  Respond in this format:
  Urgency Level: <urgency>
  Category: <category>

  Symptom: "{description}"`
);

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const chain = classificationPrompt.pipe(llm).pipe(new StringOutputParser());

async function retryClassification(description, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const output = await chain.invoke({ description });
      return output;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { retryClassification };
