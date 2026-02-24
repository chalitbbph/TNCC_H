import { useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { parseCSV } from '../lib/utils';
import { Upload, FileText, CheckCircle, AlertCircle, Database, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

const CREATE_TABLE_SQL = (year: string) => `-- Run this ONCE in Supabase SQL editor to create the table for ${year}:
CREATE TABLE health_${year} (LIKE health_2024 INCLUDING ALL);`;

export default function UploadData({ onYearAdded }: { onYearAdded?: (year: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv). To convert from Excel: File → Save As → CSV UTF-8.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        setError('Could not parse CSV. Make sure it has column headers in the first row.');
        return;
      }

      // Normalize: map Thai headers → English field names
      const normalized = normalizeData<Record<string, any>>(rows);
      const mappedKeys = normalized.length > 0 ? Object.keys(normalized[0]) : [];

      setRawHeaders(headers);
      setMappedHeaders(mappedKeys);
      setTotalRows(rows.length);
      setParsedRows(normalized);
      setPreview(normalized.slice(0, 5));
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(f, 'utf-8');
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!parsedRows.length || !year.trim()) {
      setError('Please select a year and upload a CSV file first.');
      return;
    }
    if (!/^\d{4}$/.test(year.trim())) {
      setError('Year must be a 4-digit number (e.g. 2026).');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add credentials to your .env file.');
      return;
    }

    setUploading(true);
    setResult(null);
    setError(null);

    const tableName = `health_${year.trim()}`;
    const BATCH = 100;
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < parsedRows.length; i += BATCH) {
        const batch = parsedRows.slice(i, i + BATCH);
        const { error: upsertError, count } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: 'employee_id' });

        if (upsertError) {
          if (upsertError.code === '42P01') {
            // Table does not exist
            throw new Error(`Table "${tableName}" does not exist in Supabase. See the SQL below to create it.`);
          }
          errorCount += batch.length;
          console.error('Upsert error:', upsertError);
        } else {
          successCount += batch.length;
        }
      }

      setResult({ success: successCount, errors: errorCount, message: `Upload complete for ${year}.` });
      onYearAdded?.(year.trim());
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
      if (err.message?.includes('does not exist')) setShowSQL(true);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRawHeaders([]);
    setMappedHeaders([]);
    setPreview([]);
    setParsedRows([]);
    setTotalRows(0);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Upload Health Data</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload a CSV file to add or update employee health records. Works for any year — no code changes needed.
        </p>
      </div>

      {/* How it works */}
      <div className="card-minimal p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">How to add data for a new year</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { n: '1', text: 'Export your Excel file to CSV (File → Save As → CSV UTF-8)' },
            { n: '2', text: 'Create table in Supabase (one-time): duplicate health_2024 structure' },
            { n: '3', text: 'Enter the year and upload the CSV here' },
            { n: '4', text: 'All charts and pages update automatically — zero code changes' },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Year Input */}
      <div className="card-minimal p-6">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Year</label>
        <div className="flex items-center gap-3 mt-3">
          <input
            type="text"
            placeholder="e.g. 2026"
            value={year}
            onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-400 w-36 text-center text-slate-900"
          />
          <p className="text-xs text-slate-400">The data will be uploaded to the <code className="bg-slate-100 px-1 rounded text-blue-600">health_{year || 'YYYY'}</code> table.</p>
        </div>
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all",
          dragOver ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
        )}
      >
        <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} className="hidden" />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="text-slate-400" size={40} />
            <p className="font-bold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-400">{totalRows} rows detected</p>
            <button onClick={e => { e.stopPropagation(); reset(); }} className="text-xs text-red-500 hover:text-red-700">Remove file</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="text-slate-300" size={48} />
            <p className="font-bold text-slate-600">Drop CSV file here or click to browse</p>
            <p className="text-xs text-slate-400">Thai or English column headers — both supported</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
          <div className="flex items-start gap-2 text-red-700">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Upload Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          {showSQL && year && (
            <div className="mt-4">
              <button
                onClick={() => setShowSQL(v => !v)}
                className="text-xs text-red-600 font-bold flex items-center gap-1"
              >
                {showSQL ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                View SQL to create table
              </button>
              <pre className="mt-2 p-4 bg-red-100 rounded-xl text-xs text-red-800 overflow-auto">
                {CREATE_TABLE_SQL(year)}
              </pre>
              <p className="text-xs text-red-500 mt-2">Copy the SQL above and run it in your Supabase SQL editor, then try uploading again.</p>
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">{result.message}</p>
            <p className="text-sm mt-1">{result.success} records uploaded successfully.{result.errors > 0 ? ` ${result.errors} records failed.` : ''}</p>
            <p className="text-xs mt-2 text-emerald-600">The year {year} is now available in the year selector. Navigate to any page to see the data.</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Preview</h3>
              <p className="text-xs text-slate-400 mt-0.5">{totalRows} total rows · {mappedHeaders.length} columns mapped</p>
            </div>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 font-medium"
            >
              <Eye size={14} />
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPreview && (
            <>
              {/* Column mapping */}
              <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Column Mapping (Thai → English)</p>
                <div className="flex flex-wrap gap-2">
                  {rawHeaders.slice(0, 20).map((raw, i) => (
                    <div key={raw} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs">
                      <span className="text-slate-500">{raw}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-bold text-slate-900">{mappedHeaders[i] || raw}</span>
                    </div>
                  ))}
                  {rawHeaders.length > 20 && (
                    <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-400">+{rawHeaders.length - 20} more</div>
                  )}
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50">
                      {['employee_id', 'full_name', 'branch', 'department', 'smoke', 'drink', 'overall_result'].map(h => (
                        <th key={h} className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/30">
                        {['employee_id', 'full_name', 'branch', 'department', 'smoke', 'drink', 'overall_result'].map(h => (
                          <td key={h} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {String(row[h] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Button */}
      {parsedRows.length > 0 && year && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading || !isSupabaseConfigured}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
              uploading || !isSupabaseConfigured
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-700 shadow-md hover:shadow-lg"
            )}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading {totalRows} records...
              </>
            ) : (
              <>
                <Database size={16} />
                Upload {totalRows} Records to health_{year}
              </>
            )}
          </button>
          {!isSupabaseConfigured && (
            <p className="text-xs text-red-500">Supabase not configured</p>
          )}
        </div>
      )}

      {/* SQL Helper */}
      <div className="card-minimal p-6">
        <button
          onClick={() => setShowSQL(v => !v)}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 w-full text-left"
        >
          {showSQL ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Need to create a table for a new year?
        </button>
        {showSQL && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Run this SQL in your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">Supabase SQL editor</a> to create a new year table (replace YYYY with the target year):
            </p>
            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs overflow-auto">
              {`-- Create table for new year (example: 2026)
CREATE TABLE health_2026 (LIKE health_2024 INCLUDING ALL);

-- Enable public read access
ALTER TABLE health_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read" ON health_2026 FOR SELECT USING (true);
CREATE POLICY "allow_insert" ON health_2026 FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update" ON health_2026 FOR UPDATE USING (true);`}
            </pre>
            <p className="text-xs text-slate-400">
              This is a one-time setup. After that, just upload a CSV here and everything works automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
