/**
 * Normalizes data fetched from Supabase by mapping Thai/exact column names to English ones.
 * Handles both health_2024 and health_2025 schemas.
 */

const THAI_TO_ENGLISH_MAP: Record<string, string> = {
  // Identity
  'HN': 'hn',
  'รหัส': 'employee_id',
  'ชื่อ - นามสกุล': 'full_name',
  'ชื่อ-นามสกุล': 'full_name',
  'ชื่อ - นามสกุล (ไทย)': 'full_name',      // health_2025
  'ชื่อ - นามสกุล (ENG)': 'full_name_eng',  // health_2025
  'แผนก': 'department',
  'ตำแหน่ง': 'position',
  'สาขา': 'branch',
  'โรงงาน': 'factory',
  'Function': 'function',
  'Sub-Function': 'sub_function',
  'Category': 'category',         // health_2025
  'Sub-Category': 'sub_category', // health_2025
  'Group': 'group',               // health_2025
  'Age': 'age',
  'Year of Service': 'year_of_service',
  'M or F': 'gender',
  'Year': 'year',
  'สังกัด SVP': 'svp_group',
  'VP': 'vp',
  'วันที่ลาออก': 'resignation_date',

  // Vitals
  'BP-H': 'bp_high',
  'BP-L': 'bp_low',
  'น้ำหนัก': 'weight',
  'ส่วนสูง': 'height',
  'BMI': 'bmi',
  'SMOKE': 'smoke',
  'DRINK': 'drink',
  'สรุปผลความดัน': 'bp_result',
  'ผลการตรวจ': 'overall_result',

  // Lab tests — exact column names from DB (including units and spacing)
  'ตรวจโรคหอบหืดภูมิแพ้': 'asthma_allergy',
  'Complete Blood Count': 'cbc_result',
  'Urine Analysis': 'ua_result',
  'FBS 70-110 mg%': 'fbs',
  'Cholesterol 0-200 mg%': 'cholesterol',
  'Triglyceride 30-150  mg%': 'triglyceride',  // double space as in DB
  'Triglyceride 30-150 mg%': 'triglyceride',   // single space fallback
  'HDL  >35 mg/dl': 'hdl',                     // double space as in DB
  'HDL >35 mg/dl': 'hdl',                      // single space fallback
  'LDL <=130 mg/dl': 'ldl',
  'Uric Acid 2.4-7.0 mg%': 'uric_acid',
  'B.U.N 5-25 mg%': 'bun',
  'B.U.N': 'bun',
  'Creatinine 0.7-1.5 mg%': 'creatinine',
  'Creatinine': 'creatinine',
  'SGOT 5-40 U/L': 'sgot',
  'SGOT': 'sgot',
  'SGPT 5-40 U/L': 'sgpt',
  'SGPT': 'sgpt',
  'HBs Ag (Negative)': 'hbs_ag',
  'HBs Ag': 'hbs_ag',
  'HBs Ab (Negative)': 'hbs_ab',
  'HBs Ab': 'hbs_ab',
  'HAV lgM (Negative)': 'hav_igm',
  'Anti HAV (Negative)': 'anti_hav',
  'PSA 0 - 4 ng/ml': 'psa',
  'Lead in Blood < 60 ug/dl': 'lead_in_blood',
  '2,5 Hexanedion in Urine < 0.5 mg/L': 'hexanedione',
  'Methyl Ethyl Ketone in Urine < 2 mg/L': 'mek',
  'Methanal in Urine < 15 mg/L': 'methanal',
  'Stool Examintion                          (Parasit Not Found)': 'stool_exam',
  'Stool Culture (Not-Growth)': 'stool_culture',
  'Amphetamine (Negative)': 'amphetamine',

  // Occupational health
  'เอ็กซเรย์ทรวงอก': 'chest_xray',
  'ตรวจโครงสร้างกระดูกสั': 'bone_structure',
  'สมรรถภาพการได้ยิน': 'hearing_test',
  'สมรรถภาพความจุปอด': 'spirometry',
  'สมรรถภาพสายตาอาชีวอนา': 'vision_occupational',    // truncated as stored in DB
  'สมรรถภาพสายตาอาชีวอนามัย': 'vision_occupational', // full version fallback
  'คลื่นไฟฟ้าหัวใจ': 'ekg',

  // Questionnaire / mental health
  'ความผิดปกติของหัวใจและหลอดเลือด - ความดัน': 'cardiovascular_issues',
  'กลุ่มประสาทและสมอง': 'neurological_issues',
  'ทานยานอนหลับ': 'sleeping_pills',
  'โรคติดต่อ': 'infectious_disease',
  'กลุ่มโรคเบาหวานที่ต้องฉีดอินซูลีน': 'insulin_diabetes',
  'แบบทดสอบวัดระดับความง่วงนอนกลางวัน (คะแนน)': 'sleepiness_score',
  'แบบทดสอบวัดระดับความง่วงนอนกลางวัน': 'sleepiness_result',
  'แบบทดสอบการนอนหลับ (คะแนน)': 'sleep_test_score',
  'ความผิดปกติของการนอนหลับ': 'sleep_disorder_result',
  'แบบทดสอบสภาพด้านจิต (คะแนน)': 'mental_health_score',
  'ความผิดปกติทางด้านจิตใจ': 'mental_health_result',
};

/** Normalize DRINK/SMOKE text values to boolean */
function toBooleanFlag(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (value === 'ü') return true;
  const s = String(value).trim();
  // Thai "ไม่..." means "does not..." → false
  if (s.startsWith('ไม่')) return false;
  // Explicit falsy strings
  const falsy = ['false', 'no', '0', '-', 'n/a', 'none'];
  return s.length > 0 && !falsy.includes(s.toLowerCase());
}

export function normalizeData<T>(data: any[]): T[] {
  if (!data || !Array.isArray(data)) return [];

  return data.map(item => {
    const normalized: any = {};

    Object.keys(item).forEach(key => {
      const englishKey = THAI_TO_ENGLISH_MAP[key] || key;
      let value = item[key];

      // Convert drink/smoke text to boolean
      if (englishKey === 'drink' || englishKey === 'smoke') {
        value = toBooleanFlag(value);
      } else if (value === 'ü') {
        value = true;
      }

      normalized[englishKey] = value;
    });

    return normalized as T;
  });
}
