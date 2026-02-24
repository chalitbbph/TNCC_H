import { useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import { Users, AlertCircle, Download, Search, Database, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, exportToCSV } from '../lib/utils';

const CRITICAL_FIELDS: { key: keyof FullReport; label: string }[] = [
  { key: 'branch', label: 'สาขา' },
  { key: 'smoke', label: 'Smoke' },
  { key: 'drink', label: 'Drink' },
  { key: 'hearing_test', label: 'Hearing' },
  { key: 'vision_occupational', label: 'Vision' },
  { key: 'spirometry', label: 'Spirometry' },
  { key: 'chest_xray', label: 'Chest X-Ray' },
  { key: 'mental_health_result', label: 'Mental Health' },
  { key: 'sleep_disorder_result', label: 'Sleep' },
  { key: 'overall_result', label: 'Overall Result' },
];

function isMissing(value: any): boolean {
  return value === null || value === undefined || value === '' || value === '-';
}

function getMissingFields(emp: FullReport): string[] {
  return CRITICAL_FIELDS.filter(f => isMissing(emp[f.key])).map(f => f.label);
}

export default function EmployeeOverview({ year }: { year: string }) {
  const [data, setData] = useState<FullReport[]>([]);
  const [data2024, setData2024] = useState<FullReport[]>([]);
  const [data2025, setData2025] = useState<FullReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'missing'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [r2024, r2025] = await Promise.all([
          supabase.from('health_2024').select('*').limit(5000),
          supabase.from('health_2025').select('*').limit(5000),
        ]);
        if (r2024.error) throw r2024.error;
        if (r2025.error) throw r2025.error;
        const d2024 = normalizeData<FullReport>(r2024.data || []);
        const d2025 = normalizeData<FullReport>(r2025.data || []);
        setData2024(d2024);
        setData2025(d2025);
        const tableName = `health_${year}`;
        const yearData = year === '2024' ? d2024 : d2025;
        setData(yearData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [year]);

  // Update displayed data when year changes
  useEffect(() => {
    setData(year === '2024' ? data2024 : data2025);
  }, [year, data2024, data2025]);

  const withMissing = useMemo(() =>
    data.map(emp => ({ ...emp, _missingFields: getMissingFields(emp) }))
      .filter(emp => emp._missingFields.length > 0),
    [data]
  );

  const searchLower = search.toLowerCase();
  const filtered = useMemo(() => {
    const source = tab === 'missing' ? withMissing : data.map(emp => ({ ...emp, _missingFields: getMissingFields(emp) }));
    if (!search) return source;
    return source.filter(emp =>
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      emp.branch?.toLowerCase().includes(searchLower)
    );
  }, [tab, data, withMissing, search, searchLower]);

  const branches = useMemo(() => {
    const all = [...data2024, ...data2025];
    const branchSet = Array.from(new Set(all.map(d => d.branch).filter(Boolean)));
    return branchSet.map(branch => ({
      name: branch,
      count2024: data2024.filter(d => d.branch === branch).length,
      count2025: data2025.filter(d => d.branch === branch).length,
    })).sort((a, b) => (b.count2024 + b.count2025) - (a.count2024 + a.count2025));
  }, [data2024, data2025]);

  const inBothYears = useMemo(() => {
    const ids2024 = new Set(data2024.map(d => d.employee_id));
    const ids2025 = new Set(data2025.map(d => d.employee_id));
    return [...ids2024].filter(id => ids2025.has(id)).length;
  }, [data2024, data2025]);

  const onlyIn2024 = data2024.length - inBothYears;
  const onlyIn2025 = data2025.length - inBothYears;

  const handleExportAll = () => {
    exportToCSV(
      data.map(emp => ({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        branch: emp.branch,
        department: emp.department,
        position: emp.position,
        gender: emp.gender,
        age: emp.age,
        missing_fields: getMissingFields(emp).join(' | ') || 'None',
      })),
      `employee_list_${year}.csv`
    );
  };

  const handleExportMissing = () => {
    exportToCSV(
      withMissing.map(emp => ({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        branch: emp.branch,
        department: emp.department,
        missing_fields: emp._missingFields.join(' | '),
      })),
      `missing_data_${year}.csv`
    );
  };

  if (!isSupabaseConfigured) return (
    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <Database className="mx-auto text-blue-400 mb-4" size={40} />
      <h3 className="text-xl font-bold">Supabase Not Connected</h3>
    </div>
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-slate-100" />
      <div className="h-96 bg-white rounded-2xl border border-slate-100" />
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-700">
      <AlertCircle size={20} className="inline mr-2" />
      {error}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Data Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Track employee records, completeness, and branch breakdown</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2024 Employees</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{data2024.length}</h3>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2025 Employees</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{data2025.length}</h3>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Both Years</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">{inBothYears}</h3>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing Data ({year})</p>
          <h3 className="text-3xl font-bold text-amber-500 mt-2">{withMissing.length}</h3>
          <p className="text-[10px] text-slate-400 mt-1">
            {data.length > 0 ? ((withMissing.length / data.length) * 100).toFixed(1) : 0}% of {year}
          </p>
        </div>
      </div>

      {/* Year Continuity Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-minimal p-4 text-center">
          <p className="text-xs text-slate-400">Only in 2024</p>
          <p className="text-2xl font-bold text-slate-500 mt-1">{onlyIn2024}</p>
          <p className="text-[10px] text-slate-400 mt-1">Left / not checked 2025</p>
        </div>
        <div className="card-minimal p-4 text-center border-2 border-emerald-100">
          <p className="text-xs text-slate-400">In Both Years</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{inBothYears}</p>
          <p className="text-[10px] text-slate-400 mt-1">Continuous employees</p>
        </div>
        <div className="card-minimal p-4 text-center">
          <p className="text-xs text-slate-400">Only in 2025</p>
          <p className="text-2xl font-bold text-slate-500 mt-1">{onlyIn2025}</p>
          <p className="text-[10px] text-slate-400 mt-1">New / not checked 2024</p>
        </div>
      </div>

      {/* Branch Breakdown */}
      {branches.length > 0 && (
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Employee Count by สาขา (Branch)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count2024" name="2024" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count2025" name="2025" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Branch Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">Branch (สาขา)</th>
                  <th className="pb-3 text-right">2024</th>
                  <th className="pb-3 text-right">2025</th>
                  <th className="pb-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branches.map(b => {
                  const delta = b.count2025 - b.count2024;
                  return (
                    <tr key={b.name} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-700">{b.name}</td>
                      <td className="py-3 text-right text-slate-500">{b.count2024}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{b.count2025}</td>
                      <td className={cn("py-3 text-right text-xs font-bold", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-slate-400")}>
                        {delta > 0 ? `+${delta}` : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Table with Tabs */}
      <div className="card-minimal overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('all')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                tab === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              All Employees ({data.length})
            </button>
            <button
              onClick={() => setTab('missing')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                tab === 'missing' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500")}
            >
              Missing Data ({withMissing.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, branch..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 w-52"
              />
            </div>
            <button
              onClick={tab === 'missing' ? handleExportMissing : handleExportAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">สาขา (Branch)</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Gender / Age</th>
                <th className="px-6 py-4">Data Status</th>
                {tab === 'missing' && <th className="px-6 py-4">Missing Fields</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {tab === 'missing' ? 'All employees have complete data!' : 'No records found.'}
                  </td>
                </tr>
              )}
              {filtered.slice(0, 100).map((emp) => {
                const missing = emp._missingFields;
                return (
                  <tr key={`${emp.employee_id}-${emp.full_name}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{emp.branch || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{emp.department}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{emp.gender} / {emp.age}</td>
                    <td className="px-6 py-4">
                      {missing.length === 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle size={12} /> Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                          <XCircle size={12} /> {missing.length} missing
                        </span>
                      )}
                    </td>
                    {tab === 'missing' && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {missing.map(f => (
                            <span key={f} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div className="px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-50">
              Showing 100 of {filtered.length} records. Export CSV to see all.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
