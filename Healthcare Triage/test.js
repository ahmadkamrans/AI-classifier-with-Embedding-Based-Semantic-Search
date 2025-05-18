require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

function convertEmbedding(embedding) {
  // Handle different embedding formats
  if (Array.isArray(embedding)) {
    return embedding; // Already in correct format
  }
  
  if (typeof embedding === 'string') {
    try {
      return JSON.parse(embedding); // Parse stringified array
    } catch (e) {
      console.error("Failed to parse embedding string:", e);
      return null;
    }
  }
  
  // If it's a PostgreSQL vector object
  if (embedding && typeof embedding === 'object' && embedding.toJSON) {
    return embedding.toJSON();
  }
  
  return null;
}

async function migrateToPinecone() {
  try {
    const indexName = process.env.PINECONE_INDEX;
    const index = pinecone.index(indexName);
    
    // Fetch all records with embeddings
    const { data: records, error } = await supabase
      .from("symptom_reports")
      .select("id, symptom_description, embedding, created_at");

    if (error) throw error;
    if (!records?.length) throw new Error("No records found");

    console.log(`📊 Found ${records.length} records with embeddings`);

    // Prepare vectors for Pinecone with proper embedding conversion
    const vectors = records.map(record => {
      const embeddingArray = convertEmbedding(record.embedding);
      
      if (!embeddingArray || embeddingArray.length !== 1536) {
        console.warn(`⚠️ Invalid embedding for record ${record.id}`);
        return null;
      }

      return {
        id: record.id,
        values: embeddingArray,
        metadata: {
          description: record.symptom_description,
          created_at: record.created_at
        }
      };
    }).filter(Boolean);

    if (vectors.length === 0) {
      throw new Error("No valid vectors to migrate after conversion");
    }

    // Upsert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < vectors.length; i += chunkSize) {
      const chunk = vectors.slice(i, i + chunkSize);
      try {
        await index.upsert(chunk);
        console.log(`✅ Upserted chunk ${i / chunkSize + 1} (records ${i} to ${i + chunk.length - 1})`);
      } catch (err) {
        console.error(`❌ Failed to upsert chunk ${i / chunkSize + 1}:`, err.message);
        // Log first vector of failed chunk for debugging
        if (chunk[0]) {
          console.log("Sample vector values:", {
            id: chunk[0].id,
            firstValues: chunk[0].values.slice(0, 5),
            length: chunk[0].values.length
          });
        }
      }
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrateToPinecone();