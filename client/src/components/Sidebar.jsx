import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';

function NavItem({ to, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2 text-sm ${
          isActive
            ? 'bg-slate-800 font-semibold text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

function Group({ title, children }) {
  return (
    <div className="mb-5">
      <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAlerts() || { unreadCount: 0 };
  const staff = ['ADMIN', 'ANALYST'].includes(user?.role);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-4 py-4">
        <p className="text-sm font-bold tracking-wide">RiskShield AI</p>
        <p className="mt-0.5 text-[11px] text-slate-400">AI Risk Manager</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4" onClick={onNavigate}>
        <Group title="Overview">
          <NavItem to="/dashboard" label="Dashboard" />
        </Group>

        <Group title="Risk Management">
          <NavItem to="/transactions" label="Transactions" />
          {staff && <NavItem to="/alerts" label="Alerts" badge={unreadCount} />}
          <NavItem to="/risk-analysis" label="Risk Analysis" />
          <NavItem to="/risk-analysis" label="Analytics" />
        </Group>

        <Group title="Intelligence">
          {staff && <NavItem to="/risk-profile" label="Behavioral Risk" />}
          {staff && <NavItem to="/investigation" label="AI Investigation" />}
          {staff && <NavItem to="/vendors" label="Vendors" />}
        </Group>

        <Group title="Reporting">
          {staff && <NavItem to="/investigation" label="Investigation Reports" />}
        </Group>

        <Group title="Account">
          <NavItem to="/profile" label="Profile" />
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="px-3 py-2 text-left text-sm text-red-300 hover:bg-slate-800"
          >
            Logout
          </button>
        </Group>
      </nav>
    </div>
  );
}
