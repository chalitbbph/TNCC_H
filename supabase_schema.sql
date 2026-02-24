-- Main health check results table (from 2024 file)
CREATE TABLE health_records (
  id SERIAL PRIMARY KEY,
  hn INTEGER,
  employee_id TEXT UNIQUE,
  full_name TEXT,
  department TEXT,
  position TEXT,
  branch TEXT,
  factory TEXT,
  function TEXT,
  sub_function TEXT,
  age INTEGER,
  year_of_service INTEGER,
  gender TEXT, -- 'M' or 'F'
  year INTEGER,
  
  -- Vitals
  bp_high NUMERIC,
  bp_low NUMERIC,
  weight NUMERIC,
  height NUMERIC,
  bmi NUMERIC,
  
  -- Lifestyle
  smoke BOOLEAN,
  drink BOOLEAN,
  
  -- Results (ปกติ/ผิดปกติ/null)
  bp_result TEXT,
  overall_result TEXT,
  cbc_result TEXT,
  ua_result TEXT,
  chest_xray TEXT,
  hearing_test TEXT,
  spirometry TEXT,
  vision_occupational TEXT,
  ekg TEXT,
  
  -- Lab values (numeric)
  fbs NUMERIC,
  cholesterol NUMERIC,
  triglyceride NUMERIC,
  hdl NUMERIC,
  ldl NUMERIC,
  uric_acid NUMERIC,
  bun NUMERIC,
  creatinine NUMERIC,
  sgot NUMERIC,
  sgpt NUMERIC,
  
  -- Other tests
  hbs_ag TEXT,
  hbs_ab TEXT,
  amphetamine TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Questionnaire results table (from 2568 file)
CREATE TABLE questionnaire_records (
  id SERIAL PRIMARY KEY,
  employee_id TEXT UNIQUE,
  full_name_th TEXT,
  department TEXT,
  position TEXT,
  svp_group TEXT,
  vp TEXT,
  
  -- Medical history
  cardiovascular_issues TEXT,
  neurological_issues TEXT,
  sleeping_pills TEXT,
  infectious_disease TEXT,
  insulin_diabetes TEXT,
  
  -- Scores
  sleepiness_score INTEGER,
  sleepiness_result TEXT,
  sleep_test_score INTEGER,
  sleep_disorder_result TEXT,
  mental_health_score INTEGER,
  mental_health_result TEXT,
  
  resignation_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Join View
CREATE OR REPLACE VIEW employee_full_report AS
SELECT h.*, 
       q.svp_group, q.vp,
       q.cardiovascular_issues, q.neurological_issues,
       q.sleepiness_score, q.sleepiness_result,
       q.sleep_test_score, q.sleep_disorder_result,
       q.mental_health_score, q.mental_health_result,
       q.resignation_date
FROM health_records h
LEFT JOIN questionnaire_records q ON h.employee_id = q.employee_id;
