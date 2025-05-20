const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const { extractKeywords, isLikelyHealthRelated, insertNewKeywords } = require("./utils/keyword");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const VALID_URGENCY = ["Emergency", "Urgent Care", "Non-Urgent", "Follow-Up Needed"];

async function retryClassification(prompt, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a medical triage classifier." },
          { role: "user", content: prompt }
        ],
        temperature: 0,
      });
      return res;
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
    const isHealth = await isLikelyHealthRelated(description, supabase);

    if (!isHealth) {
      const checkRelevance = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a strict health input validator. Only answer Yes or No." },
          { role: "user", content: `Is the following input describing a health-related symptom?\n\n"${description}"` }
        ],
        temperature: 0,
      });

      const relevance = checkRelevance.choices[0].message.content.trim().toLowerCase();
      if (!["yes", "yes."].includes(relevance)) {
        return res.status(400).json({ error: "Input is not health-related." });
      }
    }

    const prompt = `Classify the following symptom description into two parts:
                    1. Urgency Level: Choose one of [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed]
                    2. Category: Choose from [Allergy, Infection, Flu, Injury, Pain, Cardiac, etc.]

                    Respond in this format:
                    Urgency Level: <urgency>
                    Category: <category>

    Symptom: "${description}"`;

    const classification = await retryClassification(prompt);
    const output = classification.choices[0].message.content.trim();

    const urgencyMatch = output.match(/Urgency Level:\s*(.*)/i);
    const categoryMatch = output.match(/Category:\s*(.*)/i);

    const urgency_level = urgencyMatch?.[1]?.trim();
    const category = categoryMatch?.[1]?.trim();

    if (!VALID_URGENCY.includes(urgency_level) || !category) {
      return res.status(500).json({ error: "Invalid classification labels received." });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description,
    });

    const embedding = embeddingResponse.data[0].embedding;

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

app.post("/semantic-search", async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "Invalid symptom description." });
  }

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { data, error } = await supabase.rpc("match_symptoms", {
      query_embedding: embedding,
      match_count: 5,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return res.status(500).json({ error: "Failed to query similar symptoms." });
    }

    res.json({ matches: data });
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