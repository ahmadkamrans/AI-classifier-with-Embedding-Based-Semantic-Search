const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.get("/", async (req, res) => {
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

module.exports = router;
