// utils/keywords.js (optional separate file)
function extractKeywords(description) {
  return description
    .toLowerCase()
    .match(/\b[a-z]+\b/g)
    .filter(word => word.length > 3); // ignore short/common words
}

async function isLikelyHealthRelated(description, supabase) {
  const keywords = extractKeywords(description);

  const { data: knownKeywords, error } = await supabase
    .from("health_keywords")
    .select("keyword");

  if (error) {
    console.error("Keyword check error:", error);
    return false; // fallback to safety
  }

  const knownSet = new Set(knownKeywords.map(k => k.keyword));
  const matched = keywords.filter(k => knownSet.has(k));

  const matchRatio = matched.length / keywords.length;
  return matchRatio >= 0.2; // tune threshold
}

async function insertNewKeywords(description, supabase) {
  const keywords = extractKeywords(description);

  const { data: existing } = await supabase
    .from("health_keywords")
    .select("keyword");

  const existingSet = new Set(existing.map(k => k.keyword));
  const newKeywords = keywords.filter(k => !existingSet.has(k));

  const inserts = newKeywords.map(k => ({ keyword: k, source: 'auto' }));

  if (inserts.length > 0) {
    await supabase.from("health_keywords").insert(inserts, { ignoreDuplicates: true });
  }
}

module.exports = { extractKeywords, isLikelyHealthRelated, insertNewKeywords };
