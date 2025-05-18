<h1>Healthcare Triage AI – Semantic Symptom Search</h1>

  <p>
    This project is a Minimal Viable Product (MVP) for a Healthcare Triage AI system. It uses OpenAI embeddings, Supabase with pgvector support, and optionally Pinecone for fast and scalable semantic search.
  </p>

  <hr />

  <h2>What This Project Does</h2>
  <ul>
    <li>Generates vector embeddings from patient symptom descriptions using OpenAI.</li>
    <li>Stores those embeddings in Supabase’s Postgres database with pgvector enabled.</li>
    <li>Defines a PostgreSQL function to find and return similar historical symptom records based on vector similarity.</li>
    <li>Includes an optional script to migrate stored vectors from Supabase to Pinecone for high-performance search use cases.</li>
  </ul>

  <hr />

  <h2>Setup Instructions</h2>

  <h3>1️⃣ Clone the Repository</h3>
  <p>Use <strong>git clone</strong> to download the project locally.</p>

  <h3>2️⃣ Install Dependencies</h3>
  <p>Run <strong>npm install</strong> to install the required packages.</p>

  <h3>3️⃣ Add Environment Variables</h3>
  <p>
    Create a <code>.env</code> file and provide your Supabase keys, Pinecone API key, and OpenAI API key.
  </p>

  <hr />

  <h2>🔍 Code Flow Overview</h2>

  <ol>
    <li>The backend receives a user’s symptom description via an API request.</li>
    <li>It sends the description to OpenAI to generate a semantic embedding vector.</li>
    <li>This vector is passed into a custom SQL function (<code>match_symptoms</code>) in Supabase.</li>
    <li>The SQL function returns the most similar stored symptom reports based on vector similarity using <code><=></code> operator.</li>
    <li>Results are returned to the frontend with similarity scores for triage recommendation.</li>
  </ol>

  <hr />

  <h2>✅ Technologies Used</h2>
  <ul>
    <li>Node.js & Express – Server and API</li>
    <li>OpenAI API – Embedding generation</li>
    <li>Supabase (PostgreSQL + pgvector) – Vector storage & similarity search</li>
  </ul>

  <hr />

  <h2>📌 Notes</h2>
  <ul>
    <li>The system supports both local vector search via Supabase and external search via Pinecone.</li>
    <li>Ensure that your Supabase database has the <code>pgvector</code> extension enabled.</li>
    <li>For production use, consider adding error handling and authentication for secure usage.</li>
  </ul>