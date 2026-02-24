import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import { Users, Wine, Cigarette, AlertCircle, Database, ClipboardCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '../lib/utils';

const COLORS = ['#0f172a', '#94a3b8', '#e2e8f0'];

function TrendBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0) return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus size={12} /> 0%</span>;
  const isGood = inverted ? value < 0 : value > 0;
  return (
    <span className={cn("text-xs flex items-center gap-0.5 font-bold", isGood ? "text-emerald-600" : "text-red-500")}>
      {value > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export default function Overview({ year }: { year: string }) {
  const [data, setData] = useState<FullReport[]>([]);
  const [data2024, setData2024] = useState<FullReport[]>([]);
  const [data2025, setData2025] = useState<FullReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Set "current view" data based on selected year
  useEffect(() => {
    setData(year === '2024' ? data2024 : data2025);
  }, [year, data2024, data2025]);

  if (!isSupabaseConfigured) return (
    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <Database className="mx-auto text-blue-400 mb-4" size={40} />
      <h3 className="text-xl font-bold text-slate-900">Supabase Not Connected</h3>
      <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
        Add <code className="bg-slate-100 px-1 rounded text-blue-600">VITE_SUPABASE_URL</code> and{' '}
        <code className="bg-slate-100 px-1 rounded text-blue-600">VITE_SUPABASE_ANON_KEY</code> to your .env file.
      </p>
    </div>
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />)}
      </div>
      <div className="h-48 bg-white rounded-2xl border border-slate-100" />
      <div className="h-96 bg-white rounded-2xl border border-slate-100" />
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-700">
      <AlertCircle size={20} className="inline mr-2" />
      {error}
    </div>
  );

  if (data.length === 0) return (
    <div className="p-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <ClipboardCheck className="mx-auto text-slate-300 mb-4" size={40} />
      <h3 className="text-xl font-bold text-slate-900">No data for {year}</h3>
      <p className="text-slate-500 mt-2 text-sm">Table <code>health_{year}</code> is empty or doesn't exist.</p>
    </div>
  );

  // Current year metrics
  const totalEmployees = data.length;
  const drinkers = data.filter(d => d.drink).length;
  const smokers = data.filter(d => d.smoke).length;
  const abnormal = data.filter(d => d.overall_result?.includes('ผิดปกติ')).length;

  // Year-over-year rates for benchmarking section
  const rate = (n: number, total: number) => total > 0 ? (n / total) * 100 : 0;
  const smokeRate2024 = rate(data2024.filter(d => d.smoke).length, data2024.length);
  const smokeRate2025 = rate(data2025.filter(d => d.smoke).length, data2025.length);
  const drinkRate2024 = rate(data2024.filter(d => d.drink).length, data2024.length);
  const drinkRate2025 = rate(data2025.filter(d => d.drink).length, data2025.length);
  const abnRate2024 = rate(data2024.filter(d => d.overall_result?.includes('ผิดปกติ')).length, data2024.length);
  const abnRate2025 = rate(data2025.filter(d => d.overall_result?.includes('ผิดปกติ')).length, data2025.length);

  // Gender distribution
  const genderData = [
    { name: 'Male', value: data.filter(d => d.gender === 'M').length },
    { name: 'Female', value: data.filter(d => d.gender === 'F').length },
  ].filter(d => d.value > 0);

  // Age distribution
  const ageData = [
    { range: '<30', count: data.filter(d => d.age < 30).length },
    { range: '30-39', count: data.filter(d => d.age >= 30 && d.age < 40).length },
    { range: '40-49', count: data.filter(d => d.age >= 40 && d.age < 50).length },
    { range: '50+', count: data.filter(d => d.age >= 50).length },
  ];

  // Branch (สาขา) breakdown
  const branches = Array.from(new Set([...data2024, ...data2025].map(d => d.branch).filter(Boolean)));
  const branchData = branches.map(branch => ({
    name: branch,
    count2024: data2024.filter(d => d.branch === branch).length,
    count2025: data2025.filter(d => d.branch === branch).length,
    smoke2024: data2024.filter(d => d.branch === branch && d.smoke).length,
    smoke2025: data2025.filter(d => d.branch === branch && d.smoke).length,
    drink2024: data2024.filter(d => d.branch === branch && d.drink).length,
    drink2025: data2025.filter(d => d.branch === branch && d.drink).length,
  })).sort((a, b) => (b.count2024 + b.count2025) - (a.count2024 + a.count2025));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* 2024 vs 2025 Benchmarking Row */}
      {data2024.length > 0 && data2025.length > 0 && (
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Year-over-Year Benchmark: 2024 vs 2025</p>
          <div className="grid grid-cols-3 gap-6">
            {/* Smoking Rate */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Smoking Rate</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2024</p>
                  <p className="text-xl font-bold text-slate-900">{smokeRate2024.toFixed(1)}%</p>
                </div>
                <div className="pb-1">
                  <TrendBadge value={smokeRate2025 - smokeRate2024} inverted={true} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2025</p>
                  <p className="text-xl font-bold text-slate-900">{smokeRate2025.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full" style={{ width: `${smokeRate2024}%` }} />
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${smokeRate2025}%` }} />
              </div>
            </div>

            {/* Drinking Rate */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Drinking Rate</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2024</p>
                  <p className="text-xl font-bold text-slate-900">{drinkRate2024.toFixed(1)}%</p>
                </div>
                <div className="pb-1">
                  <TrendBadge value={drinkRate2025 - drinkRate2024} inverted={true} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2025</p>
                  <p className="text-xl font-bold text-slate-900">{drinkRate2025.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full" style={{ width: `${drinkRate2024}%` }} />
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${drinkRate2025}%` }} />
              </div>
            </div>

            {/* Abnormal Rate */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Abnormal Result Rate</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2024</p>
                  <p className="text-xl font-bold text-slate-900">{abnRate2024.toFixed(1)}%</p>
                </div>
                <div className="pb-1">
                  <TrendBadge value={abnRate2025 - abnRate2024} inverted={true} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">2025</p>
                  <p className="text-xl font-bold text-slate-900">{abnRate2025.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full" style={{ width: `${abnRate2024}%` }} />
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${abnRate2025}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Year Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff ({year})</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-slate-900">{totalEmployees}</h3>
            <Users className="text-slate-200" size={24} />
          </div>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drinkers</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-slate-900">{drinkers}</h3>
            <Wine className="text-slate-200" size={24} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{totalEmployees > 0 ? ((drinkers / totalEmployees) * 100).toFixed(1) : 0}% of staff</p>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Smokers</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-slate-900">{smokers}</h3>
            <Cigarette className="text-slate-200" size={24} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{totalEmployees > 0 ? ((smokers / totalEmployees) * 100).toFixed(1) : 0}% of staff</p>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abnormal Results</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-red-500">{abnormal}</h3>
            <AlertCircle className="text-red-100" size={24} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{totalEmployees > 0 ? ((abnormal / totalEmployees) * 100).toFixed(1) : 0}% of staff</p>
        </div>
      </div>

      {/* Branch Breakdown */}
      {branchData.length > 0 && (
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Employee Count by สาขา (Branch) — 2024 vs 2025</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} />
                <Bar dataKey="count2024" name="2024" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count2025" name="2025" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gender + Age */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Gender Distribution ({year})</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {genderData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="font-bold text-slate-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-minimal p-8 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Age Demographics ({year})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Branch Benchmark Table */}
      {branchData.length > 0 && (
        <div className="card-minimal overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Branch (สาขา) Benchmarking — Smoking & Drinking Rates</h3>
            <p className="text-xs text-slate-400 mt-1">Rates shown as % of employees in that branch</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4 text-center">Staff 2024</th>
                  <th className="px-6 py-4 text-center">Staff 2025</th>
                  <th className="px-6 py-4 text-center" colSpan={2}>Smoke Rate</th>
                  <th className="px-6 py-4 text-center" colSpan={2}>Drink Rate</th>
                </tr>
                <tr className="text-[10px] text-slate-300 bg-slate-50/30">
                  <th className="px-6 pb-3" />
                  <th className="px-6 pb-3" />
                  <th className="px-6 pb-3" />
                  <th className="px-6 pb-3 text-center">2024</th>
                  <th className="px-6 pb-3 text-center">2025</th>
                  <th className="px-6 pb-3 text-center">2024</th>
                  <th className="px-6 pb-3 text-center">2025</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branchData.map(b => {
                  const smokeR2024 = b.count2024 > 0 ? (b.smoke2024 / b.count2024) * 100 : 0;
                  const smokeR2025 = b.count2025 > 0 ? (b.smoke2025 / b.count2025) * 100 : 0;
                  const drinkR2024 = b.count2024 > 0 ? (b.drink2024 / b.count2024) * 100 : 0;
                  const drinkR2025 = b.count2025 > 0 ? (b.drink2025 / b.count2025) * 100 : 0;
                  return (
                    <tr key={b.name} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-900">{b.name}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{b.count2024}</td>
                      <td className="px-6 py-4 text-center text-slate-900 font-medium">{b.count2025}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{smokeR2024.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("font-bold", smokeR2025 > smokeR2024 ? "text-red-500" : smokeR2025 < smokeR2024 ? "text-emerald-600" : "text-slate-500")}>
                          {smokeR2025.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500">{drinkR2024.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("font-bold", drinkR2025 > drinkR2024 ? "text-red-500" : drinkR2025 < drinkR2024 ? "text-emerald-600" : "text-slate-500")}>
                          {drinkR2025.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Records */}
      <div className="card-minimal overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Recent Health Records ({year})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">BMI</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice(0, 8).map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{emp.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.branch || emp.department}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{emp.bmi}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      emp.overall_result?.includes('ปกติ') && !emp.overall_result?.includes('ผิดปกติ')
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    )}>
                      {emp.overall_result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
