import { useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeData } from '../lib/data-normalization';
import { FullReport } from '../types/health';
import {
  FlaskConical, Brain, AlertCircle, Database,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { cn } from '../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAmphetamineTested(val: any): boolean {
  return val !== null && val !== undefined && val !== '' && val !== '-';
}
function isAmphetaminePositive(val: any): boolean {
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return s.includes('posit') || s === 'pos' || s === 'พบ' || s === 'found';
}
function hasNeurologicalIssue(val: any): boolean {
  if (val === null || val === undefined || val === '' || val === false || val === '-') return false;
  if (val === true) return true;
  const s = String(val).toLowerCase().trim();
  return s.length > 0 && !['no', 'none', 'normal', 'ปกติ', 'negative', 'false', '0'].includes(s);
}

const pct = (n: number, total: number) => total > 0 ? (n / total) * 100 : 0;

function TrendChip({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (isNaN(delta) || Math.abs(delta) < 0.001) return (
    <span className="text-slate-300 text-xs flex items-center gap-0.5"><Minus size={11} /> —</span>
  );
  const bad = inverted ? delta > 0 : delta < 0;
  return (
    <span className={cn('text-xs flex items-center gap-0.5 font-bold', bad ? 'text-red-500' : 'text-emerald-600')}>
      {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}pp
    </span>
  );
}

const TOOLTIP_STYLE = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };

// ── Main Component ────────────────────────────────────────────────────────────

export default function SpecialScreening() {
  const [data2024, setData2024] = useState<FullReport[]>([]);
  const [data2025, setData2025] = useState<FullReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<'amphetamine' | 'neuro'>('amphetamine');

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured) { setLoading(false); return; }
      setLoading(true);
      try {
        const [r24, r25] = await Promise.all([
          supabase.from('health_2024').select('*').limit(5000),
          supabase.from('health_2025').select('*').limit(5000),
        ]);
        if (r24.error) throw r24.error;
        if (r25.error) throw r25.error;
        setData2024(normalizeData<FullReport>(r24.data || []));
        setData2025(normalizeData<FullReport>(r25.data || []));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Amphetamine derived data ──────────────────────────────────────────────
  const amp24 = useMemo(() => {
    const tested   = data2024.filter(d => isAmphetamineTested(d.amphetamine));
    const positive = tested.filter(d => isAmphetaminePositive(d.amphetamine));
    const negative = tested.filter(d => !isAmphetaminePositive(d.amphetamine));
    return { total: data2024.length, tested: tested.length, positive, negative, notTested: data2024.length - tested.length, rate: pct(positive.length, tested.length) };
  }, [data2024]);

  const amp25 = useMemo(() => {
    const tested   = data2025.filter(d => isAmphetamineTested(d.amphetamine));
    const positive = tested.filter(d => isAmphetaminePositive(d.amphetamine));
    const negative = tested.filter(d => !isAmphetaminePositive(d.amphetamine));
    return { total: data2025.length, tested: tested.length, positive, negative, notTested: data2025.length - tested.length, rate: pct(positive.length, tested.length) };
  }, [data2025]);

  const ampBranches = useMemo(() => {
    const all = [...data2024, ...data2025];
    return Array.from(new Set(all.map(d => d.branch).filter(Boolean))).map(b => ({
      name: b,
      pos2024: data2024.filter(d => d.branch === b && isAmphetaminePositive(d.amphetamine)).length,
      neg2024: data2024.filter(d => d.branch === b && isAmphetamineTested(d.amphetamine) && !isAmphetaminePositive(d.amphetamine)).length,
      pos2025: data2025.filter(d => d.branch === b && isAmphetaminePositive(d.amphetamine)).length,
      neg2025: data2025.filter(d => d.branch === b && isAmphetamineTested(d.amphetamine) && !isAmphetaminePositive(d.amphetamine)).length,
    })).sort((a, b) => (b.pos2024 + b.pos2025) - (a.pos2024 + a.pos2025));
  }, [data2024, data2025]);

  const ampPositiveAll = useMemo(() => [
    ...amp24.positive.map(e => ({ ...e, _year: '2024' })),
    ...amp25.positive.map(e => ({ ...e, _year: '2025' })),
  ], [amp24.positive, amp25.positive]);

  // ── Neurological derived data ─────────────────────────────────────────────
  const neuro24 = useMemo(() => {
    const affected  = data2024.filter(d => hasNeurologicalIssue(d.neurological_issues));
    const clear     = data2024.filter(d => !hasNeurologicalIssue(d.neurological_issues) && d.neurological_issues !== undefined && d.neurological_issues !== null && d.neurological_issues !== '');
    const noData    = data2024.filter(d => d.neurological_issues === null || d.neurological_issues === undefined || d.neurological_issues === '');
    return { total: data2024.length, affected, clear, noData, rate: pct(affected.length, data2024.length) };
  }, [data2024]);

  const neuro25 = useMemo(() => {
    const affected  = data2025.filter(d => hasNeurologicalIssue(d.neurological_issues));
    const clear     = data2025.filter(d => !hasNeurologicalIssue(d.neurological_issues) && d.neurological_issues !== undefined && d.neurological_issues !== null && d.neurological_issues !== '');
    const noData    = data2025.filter(d => d.neurological_issues === null || d.neurological_issues === undefined || d.neurological_issues === '');
    return { total: data2025.length, affected, clear, noData, rate: pct(affected.length, data2025.length) };
  }, [data2025]);

  const neuroBranches = useMemo(() => {
    const all = [...data2024, ...data2025];
    return Array.from(new Set(all.map(d => d.branch).filter(Boolean))).map(b => ({
      name: b,
      affected2024: data2024.filter(d => d.branch === b && hasNeurologicalIssue(d.neurological_issues)).length,
      affected2025: data2025.filter(d => d.branch === b && hasNeurologicalIssue(d.neurological_issues)).length,
    })).sort((a, b) => (b.affected2024 + b.affected2025) - (a.affected2024 + a.affected2025));
  }, [data2024, data2025]);

  const neuroAffectedAll = useMemo(() => [
    ...neuro24.affected.map(e => ({ ...e, _year: '2024' })),
    ...neuro25.affected.map(e => ({ ...e, _year: '2025' })),
  ], [neuro24.affected, neuro25.affected]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (!isSupabaseConfigured) return (
    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
      <Database className="mx-auto text-blue-400 mb-4" size={40} />
      <h3 className="text-xl font-bold">Supabase Not Connected</h3>
    </div>
  );
  if (loading) return (
    <div className="animate-pulse space-y-6">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100" />)}
    </div>
  );
  if (error) return (
    <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-700">
      <AlertCircle size={20} className="inline mr-2" />{error}
    </div>
  );

  const ampRateDelta  = amp25.rate  - amp24.rate;
  const neuroRateDelta = neuro25.rate - neuro24.rate;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Special Health Screening</h2>
          <p className="text-sm text-slate-500 mt-1">Amphetamine drug test results · Neurological conditions (ลมชัก)</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('amphetamine')}
            className={cn('flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all',
              tab === 'amphetamine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
          >
            <FlaskConical size={14} /> Amphetamine (ยาบ้า)
          </button>
          <button
            onClick={() => setTab('neuro')}
            className={cn('flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all',
              tab === 'neuro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
          >
            <Brain size={14} /> ลมชัก / Neurological
          </button>
        </div>
      </div>

      {/* ══════════════════════ AMPHETAMINE TAB ══════════════════════ */}
      {tab === 'amphetamine' && (
        <div className="space-y-6">
          {/* Red alert if any positives exist */}
          {ampPositiveAll.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Positive Cases Detected</p>
                <p className="text-xs text-red-500 mt-0.5">
                  {amp24.positive.length} in 2024 · {amp25.positive.length} in 2025 — see employee list below.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tested 2025</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{amp25.tested}</h3>
              <p className="text-[10px] text-slate-400 mt-1">of {amp25.total} employees</p>
            </div>
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Negative 2025</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">{amp25.negative.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {amp25.tested > 0 ? pct(amp25.negative.length, amp25.tested).toFixed(1) : 0}% of tested
              </p>
            </div>
            <div className={cn('card-minimal p-6', amp25.positive.length > 0 && 'border-red-200 bg-red-50/40')}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Positive 2025</p>
              <h3 className={cn('text-3xl font-bold mt-2', amp25.positive.length > 0 ? 'text-red-600' : 'text-slate-900')}>
                {amp25.positive.length}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-400">{amp25.rate.toFixed(2)}% rate</p>
                <TrendChip delta={ampRateDelta} inverted />
              </div>
            </div>
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Not Tested 2025</p>
              <h3 className="text-3xl font-bold text-amber-500 mt-2">{amp25.notTested}</h3>
              <p className="text-[10px] text-slate-400 mt-1">no result on record</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie */}
            <div className="card-minimal p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">2025 Result Breakdown</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Negative',   value: amp25.negative.length, color: '#10b981' },
                        { name: 'Positive',   value: amp25.positive.length, color: '#ef4444' },
                        { name: 'Not Tested', value: amp25.notTested,        color: '#e2e8f0' },
                      ]}
                      dataKey="value" cx="50%" cy="50%" outerRadius={66} innerRadius={36} strokeWidth={0}
                    >
                      {[{ color:'#10b981' },{ color:'#ef4444' },{ color:'#e2e8f0' }].map((e,i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {[
                  { label: 'Negative',   val: amp25.negative.length, color: '#10b981' },
                  { label: 'Positive',   val: amp25.positive.length,  color: '#ef4444' },
                  { label: 'Not Tested', val: amp25.notTested,         color: '#e2e8f0' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      {r.label}
                    </span>
                    <span className="font-bold text-slate-700">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Positive by branch */}
            <div className="card-minimal p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Positive Cases by Branch (2024 vs 2025)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ampBranches.filter(b => b.pos2024 > 0 || b.pos2025 > 0)} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="pos2024" name="Positive 2024" fill="#fca5a5" radius={[4,4,0,0]} />
                    <Bar dataKey="pos2025" name="Positive 2025" fill="#ef4444"  radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {ampBranches.every(b => b.pos2024 === 0 && b.pos2025 === 0) && (
                <p className="text-center text-slate-400 text-xs mt-6">No positive cases detected in any branch</p>
              )}
            </div>
          </div>

          {/* Branch table */}
          <div className="card-minimal p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Branch Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Branch</th>
                    <th className="pb-3 text-right">Neg 2024</th>
                    <th className="pb-3 text-right">Pos 2024</th>
                    <th className="pb-3 text-right">Neg 2025</th>
                    <th className="pb-3 text-right">Pos 2025</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ampBranches.map(b => (
                    <tr key={b.name} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-700">{b.name}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-bold">{b.neg2024}</td>
                      <td className={cn('py-2.5 text-right font-bold', b.pos2024 > 0 ? 'text-red-600' : 'text-slate-300')}>{b.pos2024}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-bold">{b.neg2025}</td>
                      <td className={cn('py-2.5 text-right font-bold', b.pos2025 > 0 ? 'text-red-600' : 'text-slate-300')}>{b.pos2025}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Positive employee list */}
          {ampPositiveAll.length > 0 && (
            <div className="card-minimal overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h3 className="text-sm font-bold text-red-600">Positive Cases — Employee List</h3>
                <p className="text-xs text-slate-400 mt-0.5">All employees with a positive amphetamine test result</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Result</th>
                      <th className="px-6 py-4">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ampPositiveAll.map((emp) => (
                      <tr key={`${emp.employee_id}-${emp._year}`} className="hover:bg-red-50/30">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">{emp.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{emp.branch || '—'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{emp.department}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg">
                            {String(emp.amphetamine)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp._year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ NEUROLOGICAL TAB ══════════════════════ */}
      {tab === 'neuro' && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <Brain size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700">ลมชัก / กลุ่มประสาทและสมอง (Neurological Conditions)</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Employees who reported neurological conditions — including epilepsy (ลมชัก) — in the health questionnaire.
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total 2025</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{neuro25.total}</h3>
            </div>
            <div className={cn('card-minimal p-6', neuro25.affected.length > 0 && 'border-amber-200 bg-amber-50/30')}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Has Condition 2025</p>
              <h3 className={cn('text-3xl font-bold mt-2', neuro25.affected.length > 0 ? 'text-amber-600' : 'text-slate-900')}>
                {neuro25.affected.length}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-400">{neuro25.rate.toFixed(1)}%</p>
                <TrendChip delta={neuroRateDelta} inverted />
              </div>
            </div>
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clear 2025</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">{neuro25.clear.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">no issues reported</p>
            </div>
            <div className="card-minimal p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Record 2025</p>
              <h3 className="text-3xl font-bold text-slate-400 mt-2">{neuro25.noData.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">questionnaire missing</p>
            </div>
          </div>

          {/* Year comparison */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card-minimal p-4 text-center">
              <p className="text-xs text-slate-400">2024 — With Condition</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{neuro24.affected.length}</p>
              <p className="text-[10px] text-slate-400 mt-1">{neuro24.rate.toFixed(1)}% of {neuro24.total}</p>
            </div>
            <div className="card-minimal p-4 text-center border-2 border-slate-100">
              <p className="text-xs text-slate-400">Year-on-Year</p>
              <p className={cn('text-2xl font-bold mt-1', neuroRateDelta > 0 ? 'text-red-500' : neuroRateDelta < 0 ? 'text-emerald-600' : 'text-slate-400')}>
                {neuroRateDelta > 0 ? `+${neuroRateDelta.toFixed(1)}` : neuroRateDelta.toFixed(1)}pp
              </p>
              <p className="text-[10px] text-slate-400 mt-1">prevalence change</p>
            </div>
            <div className="card-minimal p-4 text-center">
              <p className="text-xs text-slate-400">2025 — With Condition</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{neuro25.affected.length}</p>
              <p className="text-[10px] text-slate-400 mt-1">{neuro25.rate.toFixed(1)}% of {neuro25.total}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie */}
            <div className="card-minimal p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">2025 Breakdown</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Has Condition', value: neuro25.affected.length, color: '#f59e0b' },
                        { name: 'Clear',         value: neuro25.clear.length,    color: '#10b981' },
                        { name: 'No Record',     value: neuro25.noData.length,   color: '#e2e8f0' },
                      ]}
                      dataKey="value" cx="50%" cy="50%" outerRadius={66} innerRadius={36} strokeWidth={0}
                    >
                      {[{ color:'#f59e0b' },{ color:'#10b981' },{ color:'#e2e8f0' }].map((e,i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {[
                  { label: 'Has Condition', val: neuro25.affected.length, color: '#f59e0b' },
                  { label: 'Clear',         val: neuro25.clear.length,    color: '#10b981' },
                  { label: 'No Record',     val: neuro25.noData.length,   color: '#e2e8f0' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      {r.label}
                    </span>
                    <span className="font-bold text-slate-700">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch bar */}
            <div className="card-minimal p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Cases by Branch (2024 vs 2025)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={neuroBranches.filter(b => b.affected2024 > 0 || b.affected2025 > 0)} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="affected2024" name="Affected 2024" fill="#fcd34d" radius={[4,4,0,0]} />
                    <Bar dataKey="affected2025" name="Affected 2025" fill="#f59e0b"  radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {neuroBranches.every(b => b.affected2024 === 0 && b.affected2025 === 0) && (
                <p className="text-center text-slate-400 text-xs mt-6">No neurological conditions reported in any branch</p>
              )}
            </div>
          </div>

          {/* Employee list */}
          {neuroAffectedAll.length > 0 && (
            <div className="card-minimal overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h3 className="text-sm font-bold text-amber-600">Employees with Neurological Conditions</h3>
                <p className="text-xs text-slate-400 mt-0.5">กลุ่มประสาทและสมอง — reported in health questionnaire</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Condition</th>
                      <th className="px-6 py-4">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {neuroAffectedAll.map((emp) => (
                      <tr key={`${emp.employee_id}-${emp._year}`} className="hover:bg-amber-50/30">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">{emp.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{emp.branch || '—'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{emp.department}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg">
                            {emp.neurological_issues === (true as any) ? 'Reported' : String(emp.neurological_issues)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp._year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
