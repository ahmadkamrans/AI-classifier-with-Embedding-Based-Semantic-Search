require('dotenv').config();
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

class PineconeService {
  constructor() {
    this.index = pinecone.Index(process.env.PINECONE_INDEX);
    this.triageCategories = [
      "Emergency",
      "Urgent Care", 
      "Non-Urgent",
      "Follow-Up Needed",
      "Allergy",
      "Infection"
    ];
  }

  async classifySymptom(symptom) {
    const prompt = `Classify this patient symptom into exactly one of these categories: ${this.triageCategories.join(", ")}. Only respond with the category name.\n\nSymptom: "${symptom}"`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a medical triage classifier." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const classification = response.choices[0].message.content.trim();
    
    // Validate the response is one of our categories
    if (!this.triageCategories.includes(classification)) {
      throw new Error(`Invalid classification: ${classification}`);
    }
    
    return classification;
  }

  async createReport(symptom) {
    try {
        // First classify the symptom
        const triageLevel = await this.classifySymptom(symptom);
        
        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: symptom
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Create Pinecone vector
        const vector = {
        id: `report_${Date.now()}`,
        values: embedding,
        metadata: {
            symptom_description: symptom,
            triage_level: triageLevel,
            created_at: new Date().toISOString(),
            // Store as string instead of array
            embedding_sample: embedding.slice(0, 5).join(', ') 
        }
        };

        // Upsert to Pinecone
        await this.index.upsert([vector]);
        
        return {
        ...vector.metadata,
        id: vector.id,
        // Return both string and array versions
        embedding_sample: vector.metadata.embedding_sample,
        embedding_vector: vector.values 
        };
    } catch (error) {
        console.error('Error creating report:', error);
        throw error;
    }
  }

  async getSimilarReports(symptom, topK = 5) {
    try {
      // Generate embedding for query
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: symptom
      });

      // Query Pinecone
      const results = await this.index.query({
        vector: embedding.data[0].embedding,
        topK,
        includeMetadata: true
      });

      return results.matches.map(match => ({
        id: match.id,
        score: match.score,
        ...match.metadata
      }));
    } catch (error) {
      console.error('Error finding similar reports:', error);
      throw error;
    }
  }

  async ragTriage(symptom) {
    try {
      // Get similar reports
      const similarReports = await this.getSimilarReports(symptom);
      
      // Format context
      const context = similarReports.map(report => 
        `Previous case: ${report.symptom_description}\n` +
        `Triage: ${report.triage_level}\n` +
        `Date: ${report.created_at}`
      ).join('\n\n');

      // Get triage recommendation
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a medical triage assistant. Use the provided context to inform your response."
          },
          {
            role: "user",
            content: `Patient symptoms: ${symptom}\n\nContext from similar cases:\n${context}`
          }
        ],
        temperature: 0,
      });

      return {
        recommendation: response.choices[0].message.content,
        similar_cases: similarReports
      };
    } catch (error) {
      console.error('Error in RAG triage:', error);
      throw error;
    }
  }
}

module.exports = new PineconeService();