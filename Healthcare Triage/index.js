const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { insertNewKeywords } = require("./utils/keyword");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize LangChain components
const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const VALID_URGENCY = ["Emergency", "Urgent Care", "Non-Urgent", "Follow-Up Needed"];

// Define prompts using LangChain's PromptTemplate
const healthCheckPrompt = PromptTemplate.fromTemplate(
  `You are a strict health input validator. Only answer Yes or No.
  Is the following input describing a health-related symptom?

  "{description}"`
);

const classificationPrompt = PromptTemplate.fromTemplate(
  `Classify the following symptom description into two parts:
  1. Urgency Level: Choose one of [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed]
  2. Category: Choose from [Allergy, Infection, Flu, Injury, Pain, Cardiac, etc.]

  Respond in this format:
  Urgency Level: <urgency>
  Category: <category>

  Symptom: "{description}"`
);

async function retryClassification(description, retries = 3, delay = 2000) {
  const chain = classificationPrompt.pipe(llm).pipe(new StringOutputParser());
  
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

app.post("/submit", async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "Invalid symptom description." });
  }

  try {
    // Health relevance check using LangChain
    const healthCheckChain = healthCheckPrompt.pipe(llm).pipe(new StringOutputParser());
    const relevance = await healthCheckChain.invoke({ description });
    const isHealth = relevance.trim().toLowerCase().startsWith("yes");

    if (!isHealth) {
      return res.status(400).json({ error: "Input is not health-related." });
    }

    // Get classification using LangChain
    const output = await retryClassification(description);
    
    const urgencyMatch = output.match(/Urgency Level:\s*(.*)/i);
    const categoryMatch = output.match(/Category:\s*(.*)/i);

    const urgency_level = urgencyMatch?.[1]?.trim();
    const category = categoryMatch?.[1]?.trim();

    if (!VALID_URGENCY.includes(urgency_level)) {
      return res.status(500).json({ error: "Invalid urgency level received." });
    }

    if (!category) {
      return res.status(500).json({ error: "No category received." });
    }

    // Generate embedding using LangChain
    const embedding = await embeddings.embedQuery(description);

    // Insert into Supabase
    const { error } = await supabase.from("symptom_reports").insert([
      {
        symptom_description: description,
        urgency_level,
        category,
        embedding,
        status: "success",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to save report to database." });
    }

    // Insert keywords (keeping this part similar as it's more database logic)
    await insertNewKeywords(description, supabase);

    res.json({ success: true, urgency_level, category });
  } catch (error) {
    console.error("Error in submission route:", error);

    const isRateLimitError =
      error.status === 429 ||
      (error.response && error.response.status === 429) ||
      (error.message && error.message.toLowerCase().includes("rate limit"));

    if (isRateLimitError) {
      return res.status(429).json({
        error: "Currently you have hit the rate limit, so it's not possible.",
      });
    }

    await supabase.from("symptom_reports").insert([
      {
        symptom_description: description,
        urgency_level: null,
        category: null,
        embedding: null,
        status: "failed",
        error_message: error.message,
      },
    ]);

    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.post("/semantic-search", async (req, res) => {
//   const { description } = req.body;

//   if (!description || typeof description !== "string" || description.trim().length === 0) {
//     return res.status(400).json({ error: "Invalid symptom description." });
//   }

//   try {
//     // Use LangChain's SupabaseVectorStore for semantic search
//     const vectorStore = new SupabaseVectorStore(embeddings, {
//       client: supabase,
//       tableName: "symptom_reports",
//       queryName: "match_symptoms",
//     });

//     const results = await vectorStore.similaritySearch(description, 5);

//     res.json({ matches: results });
//   } catch (error) {
//     console.error("Semantic search error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.post("/semantic-search", async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "Invalid symptom description." });
  }

  try {
    // Use LangChain's SupabaseVectorStore for semantic search with score
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: "symptom_reports",
      queryName: "match_symptoms",
    });

    const resultsWithScores = await vectorStore.similaritySearchWithScore(description, 5);

    const formattedResults = resultsWithScores.map(([doc, score]) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      score: score, // Cosine distance (lower is more similar)
    }));

    res.json({ matches: formattedResults });
  } catch (error) {
    console.error("Semantic search error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/reports", async (req, res) => {
  const { data, error } = await supabase
    .from("symptom_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch reports:", error);
    return res.status(500).json({ error: "Failed to fetch reports." });
  }

  res.json(data);
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));