import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wine, Cigarette, Stethoscope, Menu, Activity, Users, Upload, Plus, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { isSupabaseConfigured } from './lib/supabase';
import SignIn, { AUTH_KEY, checkAuth } from './pages/SignIn';

import Overview from './pages/Overview';
import Drinking from './pages/Drinking';
import Smoking from './pages/Smoking';
import OccupationalMedicine from './pages/OccupationalMedicine';
import EmployeeOverview from './pages/EmployeeOverview';
import UploadData from './pages/Upload';

const INITIAL_YEARS = ['2024', '2025'];
const YEARS_KEY = 'healthdash_years';

function getStoredYears(): string[] {
  try {
    const raw = localStorage.getItem(YEARS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_YEARS;
}

function addYear(year: string, years: string[]): string[] {
  if (years.includes(year)) return years;
  const updated = [...years, year].sort();
  localStorage.setItem(YEARS_KEY, JSON.stringify(updated));
  return updated;
}

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
      active
        ? "bg-slate-900 text-white shadow-md"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const Sidebar = ({ isOpen, onSignOut }: { isOpen: boolean; onSignOut: () => void }) => {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transition-transform lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        <div className="p-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">HealthLog</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-4">Navigation</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="text-[9px] uppercase tracking-widest text-slate-300 font-bold px-4 pt-2 pb-1">Dashboard</p>
          <SidebarItem to="/" icon={LayoutDashboard} label="Overview" active={location.pathname === "/"} />
          <SidebarItem to="/employees" icon={Users} label="Employee Data" active={location.pathname === "/employees"} />

          <p className="text-[9px] uppercase tracking-widest text-slate-300 font-bold px-4 pt-4 pb-1">Lifestyle</p>
          <SidebarItem to="/drinking" icon={Wine} label="Drinking" active={location.pathname === "/drinking"} />
          <SidebarItem to="/smoking" icon={Cigarette} label="Smoking" active={location.pathname === "/smoking"} />

          <p className="text-[9px] uppercase tracking-widest text-slate-300 font-bold px-4 pt-4 pb-1">Occupational Health</p>
          <SidebarItem to="/occupational-medicine" icon={Stethoscope} label="Occ Medicine" active={location.pathname === "/occupational-medicine"} />

          <p className="text-[9px] uppercase tracking-widest text-slate-300 font-bold px-4 pt-4 pb-1">Data</p>
          <SidebarItem to="/upload" icon={Upload} label="Upload CSV" active={location.pathname === "/upload"} />
        </nav>

        <div className="p-6 space-y-3">
          {/* Sign out */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Signed in</p>
            <button
              onClick={onSignOut}
              className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>

          {/* Supabase status */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Supabase</p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isSupabaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              )} />
              <span className="text-xs font-medium text-slate-600">
                {isSupabaseConfigured ? "Connected" : "Not Configured"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({
  toggleSidebar,
  selectedYear,
  setSelectedYear,
  years,
  onYearAdded,
}: {
  toggleSidebar: () => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  years: string[];
  onYearAdded: (y: string) => void;
}) => {
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYear, setNewYear] = useState('');

  const handleAddYear = () => {
    const y = newYear.trim();
    if (/^\d{4}$/.test(y) && !years.includes(y)) {
      onYearAdded(y);
      setSelectedYear(y);
    }
    setNewYear('');
    setShowAddYear(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <button onClick={toggleSidebar} className="lg:hidden p-2 text-slate-600">
          <Menu size={20} />
        </button>

        <div className="flex-1 px-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
            VP Logistics Health Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 flex-wrap">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  selectedYear === y ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {y}
              </button>
            ))}
            <button
              onClick={() => setShowAddYear(v => !v)}
              className="px-2 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all"
              title="Add new year"
            >
              <Plus size={14} />
            </button>
          </div>

          {showAddYear && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-md">
              <input
                autoFocus
                type="text"
                placeholder="e.g. 2026"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddYear()}
                className="w-20 text-xs outline-none text-slate-900"
              />
              <button onClick={handleAddYear} className="text-xs text-emerald-600 font-bold">Add</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(checkAuth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [years, setYears] = useState<string[]>(getStoredYears);

  useEffect(() => {
    localStorage.setItem(YEARS_KEY, JSON.stringify(years));
  }, [years]);

  const handleYearAdded = (y: string) => {
    setYears(prev => addYear(y, prev));
  };

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  // Not signed in — show login page
  if (!authed) {
    return <SignIn onSuccess={() => setAuthed(true)} />;
  }

  // Signed in — show dashboard
  return (
    <Router>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
        <Sidebar isOpen={isSidebarOpen} onSignOut={handleSignOut} />

        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <div className="lg:pl-64 flex flex-col min-h-screen">
          <TopBar
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            years={years}
            onYearAdded={handleYearAdded}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Overview year={selectedYear} />} />
              <Route path="/employees" element={<EmployeeOverview year={selectedYear} />} />
              <Route path="/drinking" element={<Drinking />} />
              <Route path="/smoking" element={<Smoking />} />
              <Route path="/occupational-medicine" element={<OccupationalMedicine />} />
              <Route path="/upload" element={<UploadData onYearAdded={handleYearAdded} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
