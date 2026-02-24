import { useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import { Ear, Wind, Eye, Brain, Moon, AlertCircle, Database, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn, isAbnormal } from '../lib/utils';

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'hearing',
    label: 'Hearing',
    thaiLabel: 'สมรรถภาพการได้ยิน',
    field: 'hearing_test' as keyof FullReport,
    icon: Ear,
    color: 'blue',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    fill: '#3b82f6',
  },
  {
    id: 'vision',
    label: 'Vision',
    thaiLabel: 'สมรรถภาพสายตา',
    field: 'vision_occupational' as keyof FullReport,
    icon: Eye,
    color: 'purple',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    fill: '#a855f7',
  },
  {
    id: 'lung',
    label: 'Lung Function',
    thaiLabel: 'สมรรถภาพความจุปอด',
    field: 'spirometry' as keyof FullReport,
    icon: Wind,
    color: 'teal',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    fill: '#14b8a6',
  },
  {
    id: 'mental',
    label: 'Mental Health',
    thaiLabel: 'ความผิดปกติทางด้านจิตใจ',
    field: 'mental_health_result' as keyof FullReport,
    icon: Brain,
    color: 'amber',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    fill: '#f59e0b',
  },
  {
    id: 'sleep',
    label: 'Sleep Disorder',
    thaiLabel: 'ความผิดปกติของการนอนหลับ',
    field: 'sleep_disorder_result' as keyof FullReport,
    icon: Moon,
    color: 'indigo',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    fill: '#6366f1',
  },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

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

// ── Category Tab Content ───────────────────────────────────────────────────────
function CategoryPanel({
  cat,
  data2024,
  data2025,
  branches,
}: {
  cat: typeof CATEGORIES[number];
  data2024: FullReport[];
  data2025: FullReport[];
  branches: string[];
}) {
  const Icon = cat.icon;
  const rate = (n: number, total: number) => total > 0 ? (n / total) * 100 : 0;

  const abn2024 = data2024.filter(d => isAbnormal(String(d[cat.field] ?? '')));
  const abn2025 = data2025.filter(d => isAbnormal(String(d[cat.field] ?? '')));
  const r2024 = rate(abn2024.length, data2024.length);
  const r2025 = rate(abn2025.length, data2025.length);

  const branchData = branches.map(branch => {
    const t24 = data2024.filter(d => d.branch === branch).length;
    const t25 = data2025.filter(d => d.branch === branch).length;
    const a24 = data2024.filter(d => d.branch === branch && isAbnormal(String(d[cat.field] ?? ''))).length;
    const a25 = data2025.filter(d => d.branch === branch && isAbnormal(String(d[cat.field] ?? ''))).length;
    return {
      name: branch,
      rate2024: rate(a24, t24),
      rate2025: rate(a25, t25),
      abn2024: a24,
      abn2025: a25,
      total2024: t24,
      total2025: t25,
    };
  }).sort((a, b) => b.rate2025 - a.rate2025);

  const abnEmployees2025 = data2025.filter(d => isAbnormal(String(d[cat.field] ?? '')));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">2024 Abnormal</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{abn2024.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{r2024.toFixed(1)}% of {data2024.length}</p>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">2025 Abnormal</p>
          <h3 className={cn("text-3xl font-bold mt-2", abn2025.length > abn2024.length ? "text-red-500" : "text-emerald-600")}>
            {abn2025.length}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{r2025.toFixed(1)}% of {data2025.length}</p>
          <div className="mt-1"><TrendChip delta={r2025 - r2024} inverted={true} /></div>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">2024 Normal</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{data2024.length - abn2024.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{(100 - r2024).toFixed(1)}%</p>
        </div>
        <div className="card-minimal p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">2025 Normal</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{data2025.length - abn2025.length}</h3>
          <p className="text-xs text-slate-400 mt-1">{(100 - r2025).toFixed(1)}%</p>
        </div>
      </div>

      {/* Branch Chart */}
      {branchData.length > 0 && (
        <div className="card-minimal p-8">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Abnormal Rate by สาขา — 2024 vs 2025</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '14px', fontSize: '12px' }} />
                <Bar dataKey="rate2024" name="2024 Abnormal (%)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rate2025" name="2025 Abnormal (%)" fill={cat.fill} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Branch Table */}
      {branchData.length > 0 && (
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Branch Breakdown — {cat.label}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3 text-center">2024 Total</th>
                  <th className="px-5 py-3 text-center">2024 Abn</th>
                  <th className="px-5 py-3 text-center">2024 Rate</th>
                  <th className="px-5 py-3 text-center">2025 Total</th>
                  <th className="px-5 py-3 text-center">2025 Abn</th>
                  <th className="px-5 py-3 text-center">2025 Rate</th>
                  <th className="px-5 py-3 text-center">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branchData.map(b => (
                  <tr key={b.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-bold text-slate-900">{b.name}</td>
                    <td className="px-5 py-3 text-center text-slate-500">{b.total2024}</td>
                    <td className="px-5 py-3 text-center text-slate-500">{b.abn2024}</td>
                    <td className="px-5 py-3 text-center text-slate-500">{b.rate2024.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-center text-slate-700">{b.total2025}</td>
                    <td className="px-5 py-3 text-center font-medium text-slate-900">{b.abn2025}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn("font-bold", b.rate2025 > b.rate2024 ? "text-red-500" : b.rate2025 < b.rate2024 ? "text-emerald-600" : "text-slate-500")}>
                        {b.rate2025.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <TrendChip delta={b.rate2025 - b.rate2024} inverted={true} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Abnormal Employees Table (2025) */}
      {abnEmployees2025.length > 0 && (
        <div className="card-minimal overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Abnormal Employees — {cat.label} (2025)</h3>
            <p className="text-xs text-slate-400 mt-0.5">{abnEmployees2025.length} employees with abnormal {cat.label.toLowerCase()}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">{cat.label} Result</th>
                  <th className="px-5 py-3">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {abnEmployees2025.slice(0, 20).map(emp => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-bold text-slate-900">{emp.full_name}</td>
                    <td className="px-5 py-3 font-mono text-slate-400 text-xs">{emp.employee_id}</td>
                    <td className="px-5 py-3 text-slate-500">{emp.branch}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">
                        {String(emp[cat.field] || '—')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",
                        emp.overall_result?.includes('ปกติ') && !emp.overall_result?.includes('ผิดปกติ')
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      )}>{emp.overall_result || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {abnEmployees2025.length > 20 && (
              <div className="px-5 py-3 text-center text-xs text-slate-400 border-t border-slate-50">
                Showing 20 of {abnEmployees2025.length} employees
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OccupationalMedicine() {
  const [data2024, setData2024] = useState<FullReport[]>([]);
  const [data2025, setData2025] = useState<FullReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryId>('hearing');

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

  const branches = useMemo(() => {
    return Array.from(new Set([...data2024, ...data2025].map(d => d.branch).filter(Boolean)));
  }, [data2024, data2025]);

  // Summary table data for all 5 categories
  const summaryData = useMemo(() =>
    CATEGORIES.map(cat => {
      const rate = (n: number, total: number) => total > 0 ? ((n / total) * 100) : 0;
      const abn24 = data2024.filter(d => isAbnormal(String(d[cat.field] ?? ''))).length;
      const abn25 = data2025.filter(d => isAbnormal(String(d[cat.field] ?? ''))).length;
      return {
        ...cat,
        abn2024: abn24,
        abn2025: abn25,
        rate2024: rate(abn24, data2024.length),
        rate2025: rate(abn25, data2025.length),
      };
    }), [data2024, data2025]);

  if (!isSupabaseConfigured) return (
    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <Database className="mx-auto text-blue-400 mb-4" size={40} />
      <h3 className="text-xl font-bold">Supabase Not Connected</h3>
    </div>
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-16 bg-white rounded-2xl border border-slate-100" />
      <div className="grid grid-cols-5 gap-3">{CATEGORIES.map(c => <div key={c.id} className="h-28 bg-white rounded-2xl border border-slate-100" />)}</div>
      <div className="h-80 bg-white rounded-2xl border border-slate-100" />
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-700">
      <AlertCircle size={20} className="inline mr-2" />{error}
    </div>
  );

  const activeCategory = CATEGORIES.find(c => c.id === activeTab)!;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Occupational Medicine</h2>
        <p className="text-sm text-slate-500 mt-1">5 health categories — 2024 vs 2025 comparison by สาขา (Branch)</p>
      </div>

      {/* All-5 Summary Table */}
      <div className="card-minimal overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Summary: All 5 Categories — 2024 vs 2025</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4 text-center">2024 Abnormal</th>
                <th className="px-5 py-4 text-center">2024 Rate</th>
                <th className="px-5 py-4 text-center">2025 Abnormal</th>
                <th className="px-5 py-4 text-center">2025 Rate</th>
                <th className="px-5 py-4 text-center">Change</th>
                <th className="px-5 py-4 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summaryData.map(cat => {
                const Icon = cat.icon;
                const delta = cat.rate2025 - cat.rate2024;
                return (
                  <tr
                    key={cat.id}
                    className={cn("hover:bg-slate-50/50 cursor-pointer transition-colors", activeTab === cat.id && "bg-slate-50")}
                    onClick={() => setActiveTab(cat.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", cat.bg)}>
                          <Icon size={14} className={cat.text} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{cat.label}</p>
                          <p className="text-[10px] text-slate-400">{cat.thaiLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-500">{cat.abn2024}</td>
                    <td className="px-5 py-4 text-center text-slate-500">{cat.rate2024.toFixed(1)}%</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-900">{cat.abn2025}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={cn("font-bold", cat.abn2025 > cat.abn2024 ? "text-red-500" : cat.abn2025 < cat.abn2024 ? "text-emerald-600" : "text-slate-500")}>
                        {cat.rate2025.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {delta === 0 ? '—' : <span className={cn("font-bold text-xs", delta > 0 ? "text-red-500" : "text-emerald-600")}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}pp</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {delta === 0
                        ? <span className="text-slate-300 text-xs">—</span>
                        : delta > 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500"><TrendingUp size={12} /> Worse</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><TrendingDown size={12} /> Better</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Tabs */}
      <div>
        <div className="flex overflow-x-auto gap-2 pb-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0",
                  isActive
                    ? `${cat.bg} ${cat.text} border ${cat.border}`
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon size={15} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category Detail */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", activeCategory.bg)}>
            <activeCategory.icon size={18} className={activeCategory.text} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{activeCategory.label}</h3>
            <p className="text-xs text-slate-400">{activeCategory.thaiLabel}</p>
          </div>
        </div>
        <CategoryPanel
          cat={activeCategory}
          data2024={data2024}
          data2025={data2025}
          branches={branches}
        />
      </div>
    </div>
  );
}
