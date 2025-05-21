<h1>🩺 Healthcare Triage AI</h1>

<p>
An AI-powered triage system built using <strong>LangChain</strong>, <strong>Supabase</strong>, <strong>OpenAI</strong>, and <strong>Express.js</strong> to classify and validate symptom descriptions. It categorizes urgency, classifies symptom types, stores them with embeddings, and supports semantic search.
</p>

<h2>🚀 Features</h2>
<ul>
  <li>✅ Validates whether input is health-related</li>
  <li>📊 Classifies urgency level and symptom category using OpenAI GPT</li>
  <li>🧠 Generates text embeddings with OpenAI</li>
  <li>📥 Stores data and embeddings in Supabase</li>
  <li>🔎 Performs semantic search over symptom reports using LangChain + SupabaseVectorStore</li>
</ul>

<h2>⚠️ Edge Cases Handled</h2>
<ul>
  <li>⛔ Empty or invalid descriptions</li>
  <li>🤖 Non-health-related inputs are rejected</li>
  <li>🔁 Retry mechanism for classification errors (e.g. OpenAI failure)</li>
  <li>🧯 Handles OpenAI rate limits gracefully</li>
  <li>❌ Validates that urgency level is among predefined categories</li>
  <li>💥 Logs and stores failed insertions with error messages in Supabase</li>
</ul>

<h2>📁 Project Structure</h2>
<pre>
.
├── index.js
├── routes/
│   ├── submit.js
│   ├── semanticSearch.js
│   └── reports.js
├── langchain/
│   ├── classifier.js
│   ├── embedding.js
│   └── validator.js
├── utils/
│   └── keyword.js
├── .env
└── package.json
</pre>

<h2>⚙️ Setup Instructions</h2>

<ol>
  <li>Clone the repository</li>
  <pre><code>git clone https://github.com/your-username/healthcare-triage-ai.git
cd healthcare-triage-ai</code></pre>

  <li>Install dependencies</li>
  <pre><code>npm install</code></pre>

  <li>Create a <code>.env</code> file at the root using the template below</li>

  <li>Run the server</li>
  <pre><code>node index.js</code></pre>
</ol>

<h2>🌐 API Endpoints</h2>
<ul>
  <li><code>POST /submit</code> - Submit a symptom for validation and classification</li>
  <li><code>POST /semantic-search</code> - Search similar symptom reports</li>
  <li><code>GET /reports</code> - Fetch all stored symptom reports</li>
</ul>

<h2>📄 .env Template</h2>
<pre><code>OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
</code></pre>

<h2>🧪 Tech Stack</h2>
<ul>
  <li>🟢 Node.js + Express.js</li>
  <li>🧠 OpenAI GPT-4o (LangChain wrapper)</li>
  <li>📦 Supabase (Database + Vector Store)</li>
  <li>📐 LangChain (prompt pipelines, embeddings, vector search)</li>
</ul>

<h2>🛡️ License</h2>
<p>MIT License</p>
