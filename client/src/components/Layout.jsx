import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { CloseIcon, LogoutIcon, MenuIcon, ShieldIcon } from './icons';

const PAGE_TITLES = {
  '/dashboard': 'Risk Intelligence Center',
  '/transactions': 'Transactions',
  '/alerts': 'Alerts',
  '/vendors': 'Vendors',
  '/risk-analysis': 'Risk Analysis',
  '/risk-profile': 'Behavioral Risk',
  '/investigation': 'AI Investigation',
  '/profile': 'Profile',
};

const ROLE_STYLES = {
  ADMIN: 'bg-brand-100 text-brand-700 ring-brand-200',
  ANALYST: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  AUDITOR: 'bg-amber-100 text-amber-700 ring-amber-200',
};

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/transactions/')
      ? 'Transaction Details'
      : 'RiskShield AI');

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="btn-ghost !p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-brand-300">
              <ShieldIcon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-slate-900">
                RiskShield AI
              </span>
              <span className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
                {title}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-sm font-medium text-slate-600">
              {user?.name}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
                ROLE_STYLES[user?.role] ||
                'bg-slate-100 text-slate-600 ring-slate-200'
              }`}
            >
              {user?.role}
            </span>
          </div>

          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-white"
            aria-hidden="true"
          >
            {initials(user?.name)}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-ghost !px-3 !py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 lg:block">
          <Sidebar />
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <aside className="relative h-full w-72 shadow-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
