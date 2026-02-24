export interface HealthRecord {
  id: number;
  hn: number;
  employee_id: string;
  full_name: string;
  department: string;
  position: string;
  branch: string;
  factory: string;
  function: string;
  sub_function: string;
  age: number;
  year_of_service: number;
  gender: 'M' | 'F';
  year: number;
  bp_high: number;
  bp_low: number;
  weight: number;
  height: number;
  bmi: number;
  smoke: boolean;
  drink: boolean;
  bp_result: string;
  overall_result: string;
  cbc_result: string;
  ua_result: string;
  chest_xray: string;
  hearing_test: string;
  spirometry: string;
  vision_occupational: string;
  ekg: string;
  fbs: number;
  cholesterol: number;
  triglyceride: number;
  hdl: number;
  ldl: number;
  uric_acid: number;
  bun: number;
  creatinine: number;
  sgot: number;
  sgpt: number;
  hbs_ag: string;
  hbs_ab: string;
  amphetamine: string;
  created_at: string;
}

export interface QuestionnaireRecord {
  id: number;
  employee_id: string;
  full_name_th: string;
  department: string;
  position: string;
  svp_group: string;
  vp: string;
  cardiovascular_issues: string;
  neurological_issues: string;
  sleeping_pills: string;
  infectious_disease: string;
  insulin_diabetes: string;
  sleepiness_score: number;
  sleepiness_result: string;
  sleep_test_score: number;
  sleep_disorder_result: string;
  mental_health_score: number;
  mental_health_result: string;
  resignation_date: string | null;
  created_at: string;
}

export interface FullReport extends HealthRecord {
  svp_group: string;
  vp: string;
  cardiovascular_issues: string;
  neurological_issues: string;
  sleepiness_score: number;
  sleepiness_result: string;
  sleep_test_score: number;
  sleep_disorder_result: string;
  mental_health_score: number;
  mental_health_result: string;
  resignation_date: string | null;
}
