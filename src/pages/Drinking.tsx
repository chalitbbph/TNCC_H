import { useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import { Wine, TrendingUp, TrendingDown, AlertCircle, Database, UserCheck, UserX, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '../lib/utils';

function TrendChip({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (isNaN(delta) || delta === 0) return <span className="text-slate-300 text-xs flex items-center gap-0.5"><Minus size={11} /> —</span>;
  const bad = inverted ? delta > 0 : delta < 0;
  return (
    <span className={cn("text-xs flex items-center gap-0.5 font-bold", bad ? "text-red-500" : "text-emerald-600")}>
      {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}pp
    </span>
  );
}

export default function Drinking() {
  const [data2024, setData2024] = useState<FullReport[]>([]);
  const [data2025, setData2025] = useState<FullReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured) { setLoading(false); return; }
      setLoading(true);
      try {
        const [r2024, r2025] = await Promise.all([
          supabase.from('health_2024').select('*').limit(5000),
          supabase.from('health_2025').select('*').limit(5000),
        ]);
        if (r2024.error) throw r2024.error;
        if (r2025.error) throw r2025.error;
        setData2024(normalizeData<FullReport>(r2024.data || []));
        setData2025(normalizeData<FullReport>(r2025.data || []));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const rate = (n: number, total: number) => total > 0 ? (n / total) * 100 : 0;

  const drinkers2024 = useMemo(() => data2024.filter(d => d.drink), [data2024]);
  const drinkers2025 = useMemo(() => data2025.filter(d => d.drink), [data2025]);
  const drinkRate2024 = rate(drinkers2024.length, data2024.length);
  const drinkRate2025 = rate(drinkers2025.length, data2025.length);

  // Behavior change: matched by employee_id
  const newDrinkers = useMemo(() =>
    data2025.filter(emp25 => {
      const emp24 = data2024.find(e => e.employee_id === emp25.employee_id);
      return emp25.drink && (!emp24 || !emp24.drink);
    }), [data2024, data2025]);

  const quitters = useMemo(() =>
    data2024.filter(emp24 => {
      const emp25 = data2025.find(e => e.employee_id === emp24.employee_id);
      return emp24.drink && emp25 && !emp25.drink;
    }), [data2024, data2025]);

  // Branch (สาขา) breakdown
  const branches = useMemo(() => {
    const all = Array.from(new Set([...data2024, ...data2025].map(d => d.branch).filter(Boolean)));
    return all.map(branch => {
      const total24 = data2024.filter(d => d.branch === branch).length;
      const total25 = data2025.filter(d => d.branch === branch).length;
      const drink24 = data2024.filter(d => d.branch === branch && d.drink).length;
      const drink25 = data2025.filter(d => d.branch === branch && d.drink).length;
      return {
        name: branch,
        rate2024: rate(drink24, total24),
        rate2025: rate(drink25, total25),
        drinkers2024: drink24,
        drinkers2025: drink25,
        total2024: total24,
        total2025: total25,
      };
    }).sort((a, b) => b.rate2025 - a.rate2025);
  }, [data2024, data2025]);

  // Liver & metabolic markers among drinkers
  const highBMI2024 = drinkers2024.filter(d => d.bmi > 25).length;
  const highBMI2025 = drinkers2025.filter(d => d.bmi > 25).length;
  const abnLiver2024 = drinkers2024.filter(d => d.overall_result?.includes('ผิดปกติ')).length;
  const abnLiver2025 = drinkers2025.filter(d => d.overall_result?.includes('ผิดปกติ')).length;

  if (!isSupabaseConfigured) return (
    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <Database className="mx-auto text-blue-400 mb-4" size={40} />
      <h3 className="text-xl font-bold">Supabase Not Connected</h3>
    </div>
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />)}</div>
      <div className="h-80 bg-white rounded-2xl border border-slate-100" />
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-700">
      <AlertCircle size={20} className="inline mr-2" />{error}
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Drinking Analysis</h2>
        <p className="text-sm text-slate-500 mt-1">2024 vs 2025 comparison — grouped by สาขา (Branch)</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2024 Drinkers</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{drinkers2024.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{drinkRate2024.toFixed(1)}% of {data2024.length} staff</p>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2025 Drinkers</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{drinkers2025.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{drinkRate2025.toFixed(1)}% of {data2025.length} staff</p>
          <div className="mt-1"><TrendChip delta={drinkRate2025 - drinkRate2024} inverted={true} /></div>
        </div>
        <div className="card-minimal p-6 border-l-4 border-l-red-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Drinkers in 2025</p>
          <h3 className="text-3xl font-bold text-red-500 mt-2">{newDrinkers.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Didn't drink in 2024</p>
        </div>
        <div className="card-minimal p-6 border-l-4 border-l-emerald-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stopped by 2025</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">{quitters.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Drank in 2024, stopped</p>
        </div>
      </div>

      {/* Health Impact Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">High BMI &gt;25 (Drinkers)</p>
          <div className="flex items-end gap-4 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{highBMI2024}</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-red-500">{highBMI2025}</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Abnormal Results (Drinkers)</p>
          <div className="flex items-end gap-4 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{abnLiver2024}</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-red-500">{abnLiver2025}</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Drinking Rate</p>
          <div className="flex items-end gap-3 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{drinkRate2024.toFixed(1)}%</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-slate-900">{drinkRate2025.toFixed(1)}%</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Rate Change</p>
          <div className="mt-3">
            <TrendChip delta={drinkRate2025 - drinkRate2024} inverted={true} />
            <p className="text-[10px] text-slate-400 mt-1">vs previous year</p>
          </div>
        </div>
      </div>

      {/* Branch Comparison Chart */}
      {branches.length > 0 && (
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Drinking Rate by สาขา (Branch) — 2024 vs 2025</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} />
                <Bar dataKey="rate2024" name="2024 Rate (%)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rate2025" name="2025 Rate (%)" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Branch Benchmarking Table */}
      {branches.length > 0 && (
        <div className="card-minimal overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Branch Benchmarking — Drinking Rate</h3>
            <p className="text-xs text-slate-400 mt-1">Red = rate worsened · Green = rate improved</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Branch (สาขา)</th>
                  <th className="px-6 py-4 text-center">2024 Staff</th>
                  <th className="px-6 py-4 text-center">2024 Drinkers</th>
                  <th className="px-6 py-4 text-center">2024 Rate</th>
                  <th className="px-6 py-4 text-center">2025 Staff</th>
                  <th className="px-6 py-4 text-center">2025 Drinkers</th>
                  <th className="px-6 py-4 text-center">2025 Rate</th>
                  <th className="px-6 py-4 text-center">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branches.map(b => (
                  <tr key={b.name} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{b.name}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.total2024}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.drinkers2024}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.rate2024.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-center text-slate-700">{b.total2025}</td>
                    <td className="px-6 py-4 text-center text-slate-900 font-medium">{b.drinkers2025}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("font-bold", b.rate2025 > b.rate2024 ? "text-red-500" : b.rate2025 < b.rate2024 ? "text-emerald-600" : "text-slate-500")}>
                        {b.rate2025.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrendChip delta={b.rate2025 - b.rate2024} inverted={true} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Behavior Change Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Drinkers */}
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center gap-2">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
              <UserX size={14} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">New Drinkers in 2025</h3>
              <p className="text-xs text-slate-400">Did NOT drink in 2024 → drink in 2025</p>
            </div>
          </div>
          {newDrinkers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No new drinkers detected</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">BMI</th>
                    <th className="px-5 py-3">SGOT/SGPT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {newDrinkers.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-red-50/30">
                      <td className="px-5 py-3 font-bold text-slate-900">{emp.full_name}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{emp.employee_id}</td>
                      <td className="px-5 py-3 text-slate-500">{emp.branch}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                          emp.bmi > 25 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
                        )}>{emp.bmi ? emp.bmi.toFixed(1) : '—'}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-500 text-[10px]">{emp.sgot ?? '—'}/{emp.sgpt ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quitters */}
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <UserCheck size={14} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stopped Drinking by 2025</h3>
              <p className="text-xs text-slate-400">Drank in 2024 → no longer drink in 2025</p>
            </div>
          </div>
          {quitters.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No quitters detected</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">BMI '24</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quitters.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-emerald-50/30">
                      <td className="px-5 py-3 font-bold text-slate-900">{emp.full_name}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{emp.employee_id}</td>
                      <td className="px-5 py-3 text-slate-500">{emp.branch}</td>
                      <td className="px-5 py-3 text-slate-500">{emp.bmi ? emp.bmi.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Drinker Table (2025) */}
      <div className="card-minimal overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-900">2025 Drinkers — Health Profile</h3>
          <p className="text-xs text-slate-400 mt-1">{drinkers2025.length} drinkers in 2025</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">BMI</th>
                <th className="px-6 py-4">Cholesterol</th>
                <th className="px-6 py-4">Triglyceride</th>
                <th className="px-6 py-4">Liver SGOT/SGPT</th>
                <th className="px-6 py-4">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {drinkers2025.slice(0, 15).map(emp => (
                <tr key={emp.employee_id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{emp.branch}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-bold", emp.bmi > 25 ? "text-amber-500" : "text-slate-900")}>
                      {emp.bmi ? emp.bmi.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{emp.cholesterol ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{emp.triglyceride ?? '—'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{emp.sgot ?? '—'}/{emp.sgpt ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      emp.overall_result?.includes('ปกติ') && !emp.overall_result?.includes('ผิดปกติ')
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    )}>{emp.overall_result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {drinkers2025.length > 15 && (
            <div className="px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-50">
              Showing 15 of {drinkers2025.length} drinkers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
