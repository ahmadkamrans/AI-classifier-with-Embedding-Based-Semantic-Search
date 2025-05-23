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

// POST /submit - classify and save to DB
app.post("/submit", async (req, res) => {
  const { description } = req.body;

  const prompt = `Classify this patient symptom into one of the following categories: [Emergency, Urgent Care, Non-Urgent, Follow-Up Needed, Allergy, Infection]. Only return the label.\n\nSymptom: "${description}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // <- gpt-4o-mini equivalent
      messages: [
        { role: "system", content: "You are a medical triage classifier." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const triage_level = completion.choices[0].message.content.trim();

    const { error } = await supabase
      .from("symptom_reports")
      .insert([{ symptom_description: description, triage_level }]);

    if (error) return res.status(500).json({ error });

    res.json({ success: true, triage_level });
  } catch (error) {
    console.error("OpenAI/Supabase error:", error);
    res.status(500).json({ error: "Internal error" });
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

