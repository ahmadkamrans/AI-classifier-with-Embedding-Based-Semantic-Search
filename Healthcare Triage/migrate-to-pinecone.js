require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function isNumericArray(arr, expectedLength) {
  if (!Array.isArray(arr)) return false;
  if (expectedLength && arr.length !== expectedLength) return false;
  return arr.every(item => typeof item === 'number' && !isNaN(item));
}

async function migrateToPinecone() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX;

  try {
    // Verify index exists
    const { indexes } = await pinecone.listIndexes();
    const indexExists = indexes.some(index => index.name === indexName);
    if (!indexExists) throw new Error(`Index "${indexName}" not found`);
    
    const index = pinecone.index(indexName);
    console.log(`✅ Connected to index: ${indexName}`);

    // Fetch data with more detailed embedding checks
    const { data, error } = await supabase
      .from("symptom_reports")
      .select("id, symptom_description, embedding, created_at");

    if (error) throw error;
    if (!data?.length) throw new Error("No records found");

    console.log(`📊 Found ${data.length} records`);
    
    // Process each record with detailed validation
    const validVectors = [];
    const invalidRecords = [];

    for (const item of data) {
      try {
        // Detailed validation
        if (item.embedding === null || item.embedding === undefined) {
          throw new Error("Embedding is null/undefined");
        }

        // Handle potential string representation of array
        let embeddingArray = item.embedding;
        if (typeof embeddingArray === 'string') {
          try {
            embeddingArray = JSON.parse(embeddingArray);
          } catch (e) {
            throw new Error("Embedding is malformed string");
          }
        }

        if (!isNumericArray(embeddingArray, 1536)) {
          throw new Error(
            embeddingArray.length !== 1536 
              ? `Invalid length: ${embeddingArray.length} (expected 1536)`
              : "Contains non-numeric values"
          );
        }

        validVectors.push({
          id: item.id.toString(),
          values: embeddingArray,
          metadata: {
            description: item.symptom_description,
            created_at: item.created_at,
          },
        });
      } catch (err) {
        invalidRecords.push({
          id: item.id,
          reason: err.message,
          embedding: item.embedding?.constructor?.name || typeof item.embedding
        });
      }
    }

    // Log validation results
    console.log(`\nValidation Results:`);
    console.log(`✅ Valid vectors: ${validVectors.length}`);
    console.log(`❌ Invalid records: ${invalidRecords.length}`);
    
    if (invalidRecords.length > 0) {
      console.log("\nInvalid Record Details:");
      console.table(invalidRecords);
    }

    if (validVectors.length === 0) {
      throw new Error("No valid vectors to migrate");
    }

    // Upsert in chunks
    const chunkSize = 100;
    console.log(`\nBeginning upsert of ${validVectors.length} vectors...`);
    
    for (let i = 0; i < validVectors.length; i += chunkSize) {
      const chunk = validVectors.slice(i, i + chunkSize);
      try {
        await index.upsert(chunk);
        console.log(`✅ Upserted chunk ${i / chunkSize + 1}/${Math.ceil(validVectors.length / chunkSize)}`);
      } catch (err) {
        console.error(`❌ Failed to upsert chunk ${i / chunkSize + 1}:`, err.message);
      }
    }

    console.log("\n🎉 Migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrateToPinecone();