const express = require("express");
const router = express.Router();
const { retryClassification } = require("../langchain/classifier");
const { isHealthRelated } = require("../langchain/validator");
const { generateEmbedding } = require("../langchain/embedding");
const { insertNewKeywords } = require("../utils/keyword");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const VALID_URGENCY = ["Emergency", "Urgent Care", "Non-Urgent", "Follow-Up Needed"];

router.post("/", async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "Invalid symptom description." });
  }

  try {
    const isHealth = await isHealthRelated(description);
    if (!isHealth) {
      return res.status(400).json({ error: "Input is not health-related." });
    }

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

    const embedding = await generateEmbedding(description);

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
    console.error("Error in /submit:", error);

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

module.exports = router;
