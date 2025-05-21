const express = require("express");
const router = express.Router();
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase");
const { embeddings } = require("../langchain/embedding");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post("/", async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "Invalid symptom description." });
  }

  try {
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: "symptom_reports",
      queryName: "match_symptoms",
    });

    const resultsWithScores = await vectorStore.similaritySearchWithScore(description, 5);

    const formattedResults = resultsWithScores.map(([doc, score]) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      score,
    }));

    res.json({ matches: formattedResults });
  } catch (error) {
    console.error("Semantic search error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
