import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBMICategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmi < 23) return { label: "Normal", color: "text-green-500" };
  if (bmi < 25) return { label: "Overweight", color: "text-yellow-500" };
  if (bmi < 30) return { label: "Obese Class I", color: "text-orange-500" };
  return { label: "Obese Class II", color: "text-red-500" };
}

export function formatNumber(num: number | undefined | null) {
  if (num === undefined || num === null) return "-";
  return new Intl.NumberFormat().format(num);
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('\n') || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });

  return { headers, rows };
}

export function isAbnormal(value: string | undefined | null): boolean {
  if (!value || value.trim() === '' || value === '-') return false;
  if (value.includes('ผิดปกติ')) return true;
  if (value === 'ปกติ') return false;
  return true; // non-empty, non-normal values (like watchlist levels) count
}
