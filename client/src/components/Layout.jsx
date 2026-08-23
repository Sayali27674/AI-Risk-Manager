import {Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams, } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-900 px-6 py-4 text-xl font-bold text-white">
        <Link to="/dashboard">AI Risk Manager</Link>
      </header>

      <div className="flex">
        <aside className="min-h-[calc(100vh-64px)] w-64 bg-slate-800 p-5 text-white">
          <nav className="flex flex-col gap-3">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/transactions">Transactions</NavLink>
            <NavLink to="/alerts">Alerts</NavLink>

            {['ADMIN', 'ANALYST'].includes(user?.role) && (
              <NavLink to="/vendors">Vendors</NavLink>
            )}

            <NavLink to="/risk-analysis">Risk Analysis</NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 text-left text-red-300"
            >
              Logout
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}