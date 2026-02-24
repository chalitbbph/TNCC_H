import { useState } from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';

// ── Add / edit credentials here ───────────────────────────────────────────────
const USERS: Record<string, string> = {
  'admin2025': 'Namthip2025#',
};
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_KEY = 'healthdash_auth';

export function checkAuth(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export default function SignIn({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (USERS[username] && USERS[username] === password) {
      localStorage.setItem(AUTH_KEY, 'true');
      onSuccess();
    } else {
      setError('Incorrect username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Activity className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HealthLog</h1>
          <p className="text-sm text-slate-400 mt-1">VP Logistics Health Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Sign in</h2>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-all mt-2"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Contact your administrator to get access.
        </p>
      </div>
    </div>
  );
}
