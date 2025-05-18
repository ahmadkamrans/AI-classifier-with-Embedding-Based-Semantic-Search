const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post("/submit", async (req, res) => {
  const { description } = req.body;

  const prompt = `Classify this patient symptom into one of the following categories: [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed, Allergy, Infection]. Only return the label.\n\nSymptom: "${description}"`;

  try {
    // 1. Get classification
    const classification = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a medical triage classifier." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const triage_level = classification.choices[0].message.content.trim();

    // 2. Get embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // 3. Store in Supabase
    const { error } = await supabase.from("symptom_reports").insert([
      {
        symptom_description: description,
        triage_level,
        embedding,
      },
    ]);

    if (error) return res.status(500).json({ error });

    res.json({ success: true, triage_level });
  } catch (error) {
    console.error("Error during classification/embedding:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/semantic-search", async (req, res) => {
  const { description } = req.body;

  try {
    // 1. Generate embedding for incoming symptom
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // 2. Query Supabase with vector similarity
    const { data, error } = await supabase.rpc("match_symptoms", {
      query_embedding: embedding,
      match_count: 5,
    });

    if (error) return res.status(500).json({ error });

    res.json({ matches: data });
  } catch (error) {
    console.error("Semantic search error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// GET /reports - return all symptom reports
app.get("/reports", async (req, res) => {
  const { data, error } = await supabase
    .from("symptom_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error });

  res.json(data);
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));

