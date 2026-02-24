import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importHealthRecords(filePath: string) {
  console.log(`Importing health records from ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(n => n.includes('ผลการตรวจสุขภาพ รวม'));
  if (!sheetName) throw new Error("Sheet not found");
  
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  const records = data.map((row: any) => ({
    hn: parseInt(row['HN']),
    employee_id: String(row['รหัส']),
    full_name: row['ชื่อ - นามสกุล'],
    department: row['แผนก'],
    position: row['ตำแหน่ง'],
    branch: row['สาขา'],
    factory: row['โรงงาน'],
    function: row['Function'],
    sub_function: row['Sub-Function'],
    age: parseInt(row['Age']),
    year_of_service: parseInt(row['Year of Service']),
    gender: row['M or F'],
    year: parseInt(row['Year']),
    bp_high: parseFloat(row['BP-H']),
    bp_low: parseFloat(row['BP-L']),
    weight: parseFloat(row['น้ำหนัก']),
    height: parseFloat(row['ส่วนสูง']),
    bmi: parseFloat(row['BMI']),
    smoke: row['SMOKE'] === 'ü',
    drink: row['DRINK'] === 'ü',
    bp_result: row['สรุปผลความดัน'],
    overall_result: row['ผลการตรวจ'],
    cbc_result: row['Complete Blood Count'],
    ua_result: row['Urine Analysis'],
    chest_xray: row['เอ็กซเรย์ทรวงอก'],
    hearing_test: row['สมรรถภาพการได้ยิน'],
    spirometry: row['สมรรถภาพความจุปอด'],
    vision_occupational: row['สมรรถภาพสายตาอาชีวอนามัย'],
    ekg: row['คลื่นไฟฟ้าหัวใจ'],
    fbs: parseFloat(row['FBS 70-110 mg%']),
    cholesterol: parseFloat(row['Cholesterol 0-200 mg%']),
    triglyceride: parseFloat(row['Triglyceride 30-150 mg%']),
    hdl: parseFloat(row['HDL >35 mg/dl']),
    ldl: parseFloat(row['LDL <=130 mg/dl']),
    uric_acid: parseFloat(row['Uric Acid 2.4-7.0 mg%']),
    bun: parseFloat(row['B.U.N']),
    creatinine: parseFloat(row['Creatinine']),
    sgot: parseFloat(row['SGOT']),
    sgpt: parseFloat(row['SGPT']),
    hbs_ag: row['HBs Ag'],
    hbs_ab: row['HBs Ab'],
    amphetamine: row['Amphetamine (Negative)'],
  }));

  const { error } = await supabase.from('health_records').upsert(records, { onConflict: 'employee_id' });
  if (error) console.error("Error importing health records:", error);
  else console.log(`Successfully imported ${records.length} health records.`);
}

async function importQuestionnaireRecords(filePath: string) {
  console.log(`Importing questionnaire records from ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const records = data.map((row: any) => ({
    employee_id: String(row['รหัส']),
    full_name_th: row['ชื่อ-นามสกุล'],
    department: row['แผนก'],
    position: row['ตำแหน่ง'],
    svp_group: row['สังกัด SVP'],
    vp: row['VP'],
    cardiovascular_issues: row['ความผิดปกติของหัวใจและหลอดเลือด - ความดัน'],
    neurological_issues: row['กลุ่มประสาทและสมอง'],
    sleeping_pills: row['ทานยานอนหลับ'],
    infectious_disease: row['โรคติดต่อ'],
    insulin_diabetes: row['กลุ่มโรคเบาหวานที่ต้องฉีดอินซูลีน'],
    sleepiness_score: parseInt(row['แบบทดสอบวัดระดับความง่วงนอนกลางวัน (คะแนน)']),
    sleepiness_result: row['แบบทดสอบวัดระดับความง่วงนอนกลางวัน'],
    sleep_test_score: parseInt(row['แบบทดสอบการนอนหลับ (คะแนน)']),
    sleep_disorder_result: row['ความผิดปกติของการนอนหลับ'],
    mental_health_score: parseInt(row['แบบทดสอบสภาพด้านจิต (คะแนน)']),
    mental_health_result: row['ความผิดปกติทางด้านจิตใจ'],
    resignation_date: row['วันที่ลาออก'] ? new Date(row['วันที่ลาออก']).toISOString().split('T')[0] : null,
  }));

  const { error } = await supabase.from('questionnaire_records').upsert(records, { onConflict: 'employee_id' });
  if (error) console.error("Error importing questionnaire records:", error);
  else console.log(`Successfully imported ${records.length} questionnaire records.`);
}

// Usage: tsx scripts/import-data.ts <file1> <file2>
const [file1, file2] = process.argv.slice(2);
if (file1) importHealthRecords(file1);
if (file2) importQuestionnaireRecords(file2);
