import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="border border-slate-700 px-2 py-1 text-xs lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            Menu
          </button>
          <Link to="/dashboard" className="text-sm font-bold tracking-wide">
            RiskShield AI
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="hidden sm:inline">{user?.name}</span>
          <span className="border border-slate-700 px-2 py-0.5 font-semibold text-white">
            {user?.role}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="border border-slate-700 px-2 py-1 text-red-300 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-56px)] w-60 shrink-0 lg:block">
          <Sidebar />
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <aside className="relative h-full w-64">
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
