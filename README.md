# VP Logistics Health Dashboard

A minimal, professional web application for visualizing employee health check-up results for VP Logistics (2024 & 2025 datasets).

## Features
- **Minimal White Theme**: Clean utility-focused design using Inter typography and subtle shadows.
- **Year Selection**: Switch between 2024 and 2025 health datasets seamlessly.
- **Comprehensive Analytics**:
  - **Overview**: High-level stats, gender breakdown, and age demographics.
  - **Drinking Analysis**: Correlation between drinking habits and health indicators (BMI, Cholesterol, Liver enzymes).
  - **Smoking Analysis**: Impact of smoking on lung capacity (Spirometry) and Chest X-rays.
  - **Occupational Medicine**: Tracking hearing loss, vision issues, and mental health results.
- **Responsive Design**: Optimized for desktop and tablet viewing.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide React.
- **Backend**: Supabase (PostgreSQL).
- **Server**: Express (Vite Middleware mode).

## Setup Instructions

### 1. Supabase Configuration
Create two tables in your Supabase project: `health_2024` and `health_2025`. 

**Run this SQL in your Supabase SQL Editor:**
```sql
-- Create health_2024 table (repeat for health_2025)
CREATE TABLE health_2024 (
  employee_id TEXT PRIMARY KEY,
  full_name TEXT,
  department TEXT,
  gender TEXT, -- 'M' or 'F'
  age INTEGER,
  bmi DECIMAL,
  drink BOOLEAN,
  smoke BOOLEAN,
  overall_result TEXT,
  spirometry TEXT,
  chest_xray TEXT,
  hearing_test TEXT,
  vision_occupational TEXT,
  mental_health_result TEXT,
  sleep_disorder_result TEXT,
  sleepiness_result TEXT,
  cholesterol DECIMAL,
  triglyceride DECIMAL,
  sgot DECIMAL,
  sgpt DECIMAL
);

-- IMPORTANT: Disable RLS for testing or add a policy
ALTER TABLE health_2024 DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_2025 DISABLE ROW LEVEL SECURITY;
```

**Note on Column Names:**
The dashboard includes a normalization layer that automatically maps Thai column names (from manual Excel uploads) to English ones. However, using the provided import script is still recommended for the best experience.

### 2. Environment Variables
Create a `.env` file in the root directory (use `.env.example` as a template):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation
```bash
npm install
```

### 4. Development
```bash
npm run dev
```

## How to upload to GitHub
1. Create a new repository on GitHub.
2. Initialize git in your local project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: VP Logistics Health Dashboard"
   ```
3. Link to your GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## Data Import
To import your Excel files into Supabase, use the provided script:
```bash
# Set your SUPABASE_SERVICE_ROLE_KEY in .env first
tsx scripts/import-data.ts path/to/your/excel_file.xlsx
```
Note: Ensure the Excel column names match the mapping in `scripts/import-data.ts`.
