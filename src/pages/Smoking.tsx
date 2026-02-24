import { useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import { Cigarette, TrendingUp, TrendingDown, AlertCircle, Database, UserCheck, UserX, Minus } from 'lucide-react';
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

export default function Smoking() {
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

  const smokers2024 = useMemo(() => data2024.filter(d => d.smoke), [data2024]);
  const smokers2025 = useMemo(() => data2025.filter(d => d.smoke), [data2025]);
  const smokeRate2024 = rate(smokers2024.length, data2024.length);
  const smokeRate2025 = rate(smokers2025.length, data2025.length);

  // Behavior change: matched by employee_id
  const newSmokers = useMemo(() =>
    data2025.filter(emp25 => {
      const emp24 = data2024.find(e => e.employee_id === emp25.employee_id);
      return emp25.smoke && (!emp24 || !emp24.smoke);
    }), [data2024, data2025]);

  const quitters = useMemo(() =>
    data2024.filter(emp24 => {
      const emp25 = data2025.find(e => e.employee_id === emp24.employee_id);
      return emp24.smoke && emp25 && !emp25.smoke;
    }), [data2024, data2025]);

  // Branch breakdown (using สาขา)
  const branches = useMemo(() => {
    const all = Array.from(new Set([...data2024, ...data2025].map(d => d.branch).filter(Boolean)));
    return all.map(branch => {
      const total24 = data2024.filter(d => d.branch === branch).length;
      const total25 = data2025.filter(d => d.branch === branch).length;
      const smoke24 = data2024.filter(d => d.branch === branch && d.smoke).length;
      const smoke25 = data2025.filter(d => d.branch === branch && d.smoke).length;
      return {
        name: branch,
        rate2024: rate(smoke24, total24),
        rate2025: rate(smoke25, total25),
        smokers2024: smoke24,
        smokers2025: smoke25,
        total2024: total24,
        total2025: total25,
      };
    }).sort((a, b) => b.rate2025 - a.rate2025);
  }, [data2024, data2025]);

  // Lung health metrics among smokers
  const abnLung2024 = smokers2024.filter(d => d.spirometry?.includes('ผิดปกติ')).length;
  const abnLung2025 = smokers2025.filter(d => d.spirometry?.includes('ผิดปกติ')).length;
  const abnXray2024 = smokers2024.filter(d => d.chest_xray?.includes('ผิดปกติ')).length;
  const abnXray2025 = smokers2025.filter(d => d.chest_xray?.includes('ผิดปกติ')).length;

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
        <h2 className="text-xl font-bold text-slate-900">Smoking Analysis</h2>
        <p className="text-sm text-slate-500 mt-1">2024 vs 2025 comparison — grouped by สาขา (Branch)</p>
      </div>

      {/* Key Metrics: 2024 vs 2025 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2024 Smokers</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{smokers2024.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{smokeRate2024.toFixed(1)}% of {data2024.length} staff</p>
        </div>
        <div className="card-minimal p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2025 Smokers</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{smokers2025.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{smokeRate2025.toFixed(1)}% of {data2025.length} staff</p>
          <div className="mt-1">
            <TrendChip delta={smokeRate2025 - smokeRate2024} inverted={true} />
          </div>
        </div>
        <div className="card-minimal p-6 border-l-4 border-l-red-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Smokers in 2025</p>
          <h3 className="text-3xl font-bold text-red-500 mt-2">{newSmokers.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Didn't smoke in 2024</p>
        </div>
        <div className="card-minimal p-6 border-l-4 border-l-emerald-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quit by 2025</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">{quitters.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Smoked in 2024, stopped</p>
        </div>
      </div>

      {/* Lung Health Among Smokers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Abnormal Lung (Smokers)</p>
          <div className="flex items-end gap-4 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{abnLung2024}</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-red-500">{abnLung2025}</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Abnormal X-Ray (Smokers)</p>
          <div className="flex items-end gap-4 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{abnXray2024}</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-red-500">{abnXray2025}</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Smoking Rate</p>
          <div className="flex items-end gap-3 mt-2">
            <div><p className="text-[10px] text-slate-400">2024</p><p className="text-2xl font-bold text-slate-700">{smokeRate2024.toFixed(1)}%</p></div>
            <div><p className="text-[10px] text-slate-400">2025</p><p className="text-2xl font-bold text-slate-900">{smokeRate2025.toFixed(1)}%</p></div>
          </div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Rate Change</p>
          <div className="mt-3">
            <TrendChip delta={smokeRate2025 - smokeRate2024} inverted={true} />
            <p className="text-[10px] text-slate-400 mt-1">vs previous year</p>
          </div>
        </div>
      </div>

      {/* Branch Comparison Chart */}
      {branches.length > 0 && (
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Smoking Rate by สาขา (Branch) — 2024 vs 2025</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(0)}%`}
                />
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
            <h3 className="text-sm font-bold text-slate-900">Branch Benchmarking — Smoking Rate</h3>
            <p className="text-xs text-slate-400 mt-1">Red = rate worsened · Green = rate improved</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Branch (สาขา)</th>
                  <th className="px-6 py-4 text-center">2024 Staff</th>
                  <th className="px-6 py-4 text-center">2024 Smokers</th>
                  <th className="px-6 py-4 text-center">2024 Rate</th>
                  <th className="px-6 py-4 text-center">2025 Staff</th>
                  <th className="px-6 py-4 text-center">2025 Smokers</th>
                  <th className="px-6 py-4 text-center">2025 Rate</th>
                  <th className="px-6 py-4 text-center">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branches.map(b => (
                  <tr key={b.name} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{b.name}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.total2024}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.smokers2024}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{b.rate2024.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-center text-slate-700">{b.total2025}</td>
                    <td className="px-6 py-4 text-center text-slate-900 font-medium">{b.smokers2025}</td>
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
        {/* New Smokers */}
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center gap-2">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
              <UserX size={14} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">New Smokers in 2025</h3>
              <p className="text-xs text-slate-400">Did NOT smoke in 2024 → smoke in 2025</p>
            </div>
          </div>
          {newSmokers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No new smokers detected</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Spirometry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {newSmokers.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-red-50/30">
                      <td className="px-5 py-3 font-bold text-slate-900">{emp.full_name}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{emp.employee_id}</td>
                      <td className="px-5 py-3 text-slate-500">{emp.branch}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                          emp.spirometry?.includes('ผิดปกติ') ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
                        )}>{emp.spirometry || '—'}</span>
                      </td>
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
              <h3 className="text-sm font-bold text-slate-900">Quit Smoking by 2025</h3>
              <p className="text-xs text-slate-400">Smoked in 2024 → no longer smoke in 2025</p>
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
                    <th className="px-5 py-3">Spirometry '24</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quitters.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-emerald-50/30">
                      <td className="px-5 py-3 font-bold text-slate-900">{emp.full_name}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{emp.employee_id}</td>
                      <td className="px-5 py-3 text-slate-500">{emp.branch}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                          emp.spirometry?.includes('ผิดปกติ') ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
                        )}>{emp.spirometry || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Smoker Table (2025) */}
      <div className="card-minimal overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-900">2025 Smokers — Occupational Health Detail</h3>
          <p className="text-xs text-slate-400 mt-1">{smokers2025.length} smokers in 2025</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Spirometry</th>
                <th className="px-6 py-4">Chest X-Ray</th>
                <th className="px-6 py-4">Hearing</th>
                <th className="px-6 py-4">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {smokers2025.slice(0, 15).map(emp => (
                <tr key={emp.employee_id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{emp.branch}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      emp.spirometry?.includes('ผิดปกติ') ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
                    )}>{emp.spirometry || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      emp.chest_xray?.includes('ผิดปกติ') ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
                    )}>{emp.chest_xray || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{emp.hearing_test || '—'}</td>
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
          {smokers2025.length > 15 && (
            <div className="px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-50">
              Showing 15 of {smokers2025.length} smokers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
