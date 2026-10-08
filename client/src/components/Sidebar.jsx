import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import {
  AlertIcon,
  AnalyticsIcon,
  BehaviorIcon,
  DashboardIcon,
  InvestigationIcon,
  LogoutIcon,
  ProfileIcon,
  ShieldIcon,
  TransactionsIcon,
  VendorIcon,
} from './icons';

function NavItem({ to, label, badge, icon: NavIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-brand-600 font-semibold text-white shadow-sm shadow-slate-950/40'
            : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {NavIcon && (
        <NavIcon className="h-4.5 w-4.5 shrink-0 opacity-90" />
      )}
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

function Group({ title, children }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
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
      <div className="flex items-center gap-2.5 border-b border-slate-800/80 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ShieldIcon className="h-4.5 w-4.5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide">RiskShield AI</p>
          <p className="text-[11px] text-slate-400">AI Risk Manager</p>
        </div>
      </div>

      <nav
        className="dashboard-scroll flex-1 overflow-y-auto px-2.5 py-4"
        onClick={onNavigate}
      >
        <Group title="Overview">
          <NavItem to="/dashboard" label="Dashboard" icon={DashboardIcon} />
        </Group>

        <Group title="Risk Management">
          <NavItem
            to="/transactions"
            label="Transactions"
            icon={TransactionsIcon}
          />
          {staff && (
            <NavItem to="/alerts" label="Alerts" badge={unreadCount} icon={AlertIcon} />
          )}
          <NavItem to="/risk-analysis" label="Risk Analysis" icon={AnalyticsIcon} />
        </Group>

        <Group title="Intelligence">
          {staff && (
            <NavItem
              to="/risk-profile"
              label="Behavioral Risk"
              icon={BehaviorIcon}
            />
          )}
          {staff && (
            <NavItem
              to="/investigation"
              label="AI Investigation"
              icon={InvestigationIcon}
            />
          )}
          {staff && <NavItem to="/vendors" label="Vendors" icon={VendorIcon} />}
        </Group>

        <Group title="Account">
          <NavItem to="/profile" label="Profile" icon={ProfileIcon} />
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            <LogoutIcon className="h-4.5 w-4.5" />
            Logout
          </button>
        </Group>
      </nav>
    </div>
  );
}
