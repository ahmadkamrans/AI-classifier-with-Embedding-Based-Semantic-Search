CREATE TABLE symptom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_description text,
  triage_level text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
