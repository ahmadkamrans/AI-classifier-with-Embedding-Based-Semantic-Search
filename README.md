 <h1>AI Maintenance MVP (Phase 1)</h1>

  <p><strong>Status:</strong> ✅ Initial MVP Completed</p>

  <h2>📦 Features Included</h2>
  <ul>
    <li>🔍 AI classification via <strong>OpenAI GPT-4o</strong></li>
    <li>📚 Supabase with PostgreSQL as the backend database</li>
    <li>🌐 REST API endpoints using <code>Express.js</code></li>
    <li>📈 Metabase-ready data structure for analytics</li>
    <li>🛠️ SQL schema for reproducibility</li>
    <li>🧪 Postman used for API testing</li>
  </ul>

  <h2>🚀 How to Run</h2>
  <ol>
    <li>Create a Supabase project and execute the SQL schema provided in <code>schema.sql</code>.</li>
    <li>Create a <code>.env</code> file and add the following keys:
      <pre>
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
      </pre>
    </li>
    <li>Run the backend server:
      <pre>
npm install
npm start
      </pre>
    </li>
    <li>Use the provided <code>index.html</code> file or Postman to test API endpoints.</li>
    <li>Connect your Supabase DB to Metabase for data dashboarding.</li>
  </ol>

  <h2>🧪 Postman API Testing</h2>
  <p>Below are screenshots of API testing using Postman for endpoints like <code>/submit</code> and <code>/reports</code>:</p>
  <img src="Healthcare Triage/pictures/allReports.png" alt="Postman Request 1">
  <img src="Healthcare Triage/pictures/askGPT.png" alt="Postman Request 2">
  <img src="Healthcare Triage/pictures/checkConnection.png" alt="Po![alt text](image.png)stman Request 3">

  <h2>🗃️ Supabase Setup</h2>
  <p>Below are images from the Supabase dashboard showing the database schema and example data inserted:</p>
  <img src="Healthcare Triage/pictures/SQL_editor.png" alt="Supabase Table View">
  <img src="Healthcare Triage/pictures/TableView.png" alt="Supabase Data View">

  <h2>📊 Metabase Integration</h2>
  <p>Here are 6 visuals from Metabase showing data analytics and dashboards connected to the Supabase DB:</p>
  <img src="Healthcare Triage/pictures/one.png" alt="Metabase Dashboard 1">
  <img src="Healthcare Triage/pictures/two.png" alt="Metabase Dashboard 2">
  <img src="Healthcare Triage/pictures/tjree.png" alt="Metabase Dashboard 3">

  <h2>🧾 Schema</h2>
  <p>Run the following SQL in Supabase SQL Editor:</p>
  <pre>
CREATE TABLE symptom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_description text,
  triage_level text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
  </pre>

  <h2>🧠 AI Prompt Logic</h2>
  <p>Prompt used for classification via OpenAI:</p>
  <pre>
Classify this patient symptom into one of the following categories: 
[Emergency, Urgent Care, Non-Urgent, Follow-Up Needed, Allergy, Infection]. 
Only return the label.

Symptom: "..."
  </pre>