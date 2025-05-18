const express = require('express');
const cors = require('cors');
const pineconeService = require('./pinecone-service');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// POST /submit - Create new symptom report (now takes just description)
app.post('/submit', async (req, res) => {
  const { description } = req.body;
  
  try {
    const report = await pineconeService.createReport(description);
    res.json({ 
      success: true,
      data: {
        id: report.id,
        symptom: report.symptom_description,
        triage_level: report.triage_level,
        created_at: report.created_at,
        embedding_sample: report.embedding_sample, // "0.023, -0.038, 0.008, ..."
        vector_sample: report.embedding_vector.slice(0, 5), // [0.023, -0.038, ...]
        vector_dimensions: report.embedding_vector.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// POST /rag-triage - Get triage recommendation
app.post('/rag-triage', async (req, res) => {
  const { description } = req.body;
  
  try {
    const result = await pineconeService.ragTriage(description);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports - Get similar reports (for debugging)
app.get('/reports', async (req, res) => {
  const { symptom } = req.query;
  
  try {
    const reports = await pineconeService.getSimilarReports(symptom || '');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));