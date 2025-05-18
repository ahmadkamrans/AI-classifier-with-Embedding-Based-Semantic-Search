# Symptom Triage API (OpenAI + Pinecone)

An Express.js API for healthcare triage using OpenAI (GPT-4 & Embeddings) and Pinecone vector database. Submit patient symptoms, classify urgency levels, and retrieve similar past cases for RAG (retrieval-augmented generation) triage.

---

## Features

- Classifies symptoms into categories: `Emergency`, `Urgent Care`, `Non-Urgent`, `Follow-Up Needed`, `Allergy`, `Infection`
- Uses GPT-4 for classification and triage recommendation
- Stores vector embeddings in Pinecone for similarity search
- Retrieves past similar cases using Pinecone vector search
- Testable via Postman

---

## Setup

1. **Clone & install**

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```
## Environment variable

2. **Create .env**
```bash
OPENAI_API_KEY=your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=your-pinecone-index-name
```

## Start the server

3. **Env**
```bash
node pine_Index.js
```

## API Endpoints (Test in Postman API)
4. **POST/submit**
5. **Purpose:**

6. Submit a symptom → Classifies it → Embeds it → Stores in Pinecone.
   ```bash
   {
    "description": "Shortness of breath and chest pain"
   }
   ```
7. **Response:** 
  
8.  ```bash
    {
        "success": true,
        "data": {
            "id": "report_...",
            "symptom": "Shortness of breath and chest pain",
            "triage_level": "Emergency",
            "created_at": "...",
            "embedding_sample": "0.023, -0.038, ...",
            "vector_sample": [0.023, -0.038, ...],
            "vector_dimensions": 1536
        }
    }
    ```
9. **POST/rag-triage**
10. **Purpose:**

11. Returns a triage recommendation using similar past reports (RAG).
12. **Request:**

13. ```bash
    {
        "description": "Persistent coughing with mild fever"
    }
    ```
14. **Response:**

15. ```bash
    {
    "recommendation": "Based on the symptoms ... this appears to require Urgent Care.",
    "similar_cases": [
        {
        "id": "report_...",
        "score": 0.92,
        "symptom_description": "...",
        "triage_level": "...",
        "created_at": "..."
        },
        ...
        ]
    }
    ```

