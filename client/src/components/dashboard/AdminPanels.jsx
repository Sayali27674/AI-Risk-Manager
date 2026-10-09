import { Link } from 'react-router-dom';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
  ActivityIcon,
  BellIcon,
  ChartIcon,
  RiskIcon,
  UserIcon,
  AdminIcon,
  AnalystIcon,
} from '../icons';
import { EmptyState, SectionCard, Skeleton, StatusBadge } from './ui';

const HEALTH_STATUS_STYLES = {
  AVAILABLE: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200',
  DEGRADED: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200',
  UNAVAILABLE: 'text-red-700 bg-red-50 ring-1 ring-red-200',
};

const COMPONENT_META = [
  {
    key: 'ruleEngine',
    label: 'Rule Engine',
    description: 'Static threshold & policy rules',
    icon: ShieldIcon,
  },
  {
    key: 'behavioral',
    label: 'Behavioral Engine',
    description: 'User behaviour baselines',
    icon: UserIcon,
  },
  {
    key: 'isolationForest',
    label: 'Isolation Forest',
    description: 'Unsupervised anomaly detection',
    icon: ActivityIcon,
  },
  {
    key: 'xgboost',
    label: 'XGBoost Classifier',
    description: 'Risk probability model',
    icon: ChartIcon,
  },
  {
    key: 'shap',
    label: 'SHAP Explainer',
    description: 'Local explainability outputs',
    icon: SparklesIcon,
  },
  {
    key: 'aiInvestigationAgent',
    label: 'AI Investigation Agent',
    description: 'Natural language investigation',
    icon: BellIcon,
  },
];

export function AiSystemHealthPanel({ health, loading }) {
  return (
    <SectionCard
      title="AI / ML System Health"
      subtitle="Component availability with live liveness data"
      loading={loading}
      headerExtra={
        loading ? null : <SummaryPill health={health} />
      }
    >
      {loading && (
        <div className="space-y-3">
          {COMPONENT_META.map((m) => (
            <div key={m.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1 h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {!loading && (!health || Object.keys(health).length === 0) && (
        <EmptyState
          icon={<AlertTriangleIcon className="h-5 w-5 text-amber-500" />}
          title="No health data returned"
          message="The system health endpoint may be offline or missing."
        />
      )}
      {!loading && health && Object.keys(health).length > 0 && (
        <ul className="space-y-3">
          {COMPONENT_META.map((meta) => {
            const raw = health[meta.key];
            // Backend returns plain status strings; also accept {status, latencyMs, detail}.
            const entry = raw == null
              ? { status: 'UNAVAILABLE', latencyMs: null, detail: 'No data' }
              : typeof raw === 'string'
              ? { status: raw, latencyMs: null, detail: null }
              : raw;
            const Icon = meta.icon;
            return (
              <li
                key={meta.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {meta.label}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {meta.description}
                      {entry.detail ? ` · ${entry.detail}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof entry.latencyMs === 'number' && (
                    <span className="text-[11px] font-medium tabular-nums text-slate-500">
                      {entry.latencyMs} ms
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      HEALTH_STATUS_STYLES[entry.status]
                      || HEALTH_STATUS_STYLES.UNAVAILABLE
                    }`}
                  >
                    {entry.status === 'AVAILABLE' ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : entry.status === 'DEGRADED' ? (
                      <AlertTriangleIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldIcon className="h-3.5 w-3.5" />
                    )}
                    {entry.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function SummaryPill({ health }) {
  const entries = Object.values(health || {}).map((entry) =>
    typeof entry === 'string' ? { status: entry } : entry,
  );
  if (entries.length === 0) return null;
  const available = entries.filter((e) => e?.status === 'AVAILABLE').length;
  const degraded = entries.filter((e) => e?.status === 'DEGRADED').length;
  const unavailable = entries.filter((e) => !e || e.status === 'UNAVAILABLE').length;
  const worst = unavailable > 0
    ? 'UNAVAILABLE'
    : degraded > 0
    ? 'DEGRADED'
    : 'AVAILABLE';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
        HEALTH_STATUS_STYLES[worst] || HEALTH_STATUS_STYLES.UNAVAILABLE
      }`}
    >
      {available}/{entries.length} available
    </span>
  );
}

export function UserOverviewPanel({ userStats, loading, onManageUsers }) {
  // Backend sends userStats as { total, byRole: {ADMIN, ANALYST, USER}, recent }.
  const byRole = userStats?.byRole || {};
  const roles = Array.isArray(userStats?.roles) && userStats.roles.length
    ? userStats.roles
    : Object.entries(byRole).map(([role, count]) => ({ role, count }));
  const recent = userStats?.recent || userStats?.recentRegistrations || [];
  const total = userStats?.total ?? 0;
  const roleCount = (role) =>
    roles.find((entry) => entry.role === role)?.count ?? byRole[role] ?? 0;
  return (
    <SectionCard
      title="User Management Overview"
      subtitle="Role counts and recent registrations"
      loading={loading}
      headerExtra={
        <button
          type="button"
          onClick={onManageUsers}
          className="rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
        >
          Open Users →
        </button>
      }
    >
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mt-2 h-10 w-full" />
            ))}
          </div>
        </div>
      )}
      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RoleMini
              label="Total"
              value={total}
              icon={<UsersIcon className="h-4 w-4" />}
              accent="bg-slate-100 text-slate-700"
            />
            <RoleMini
              label="Admins"
              value={roleCount('ADMIN')}
              icon={<AdminIcon className="h-4 w-4" />}
              accent="bg-indigo-100 text-indigo-700"
            />
            <RoleMini
              label="Analysts"
              value={roleCount('ANALYST')}
              icon={<AnalystIcon className="h-4 w-4" />}
              accent="bg-amber-100 text-amber-700"
            />
            <RoleMini
              label="Users"
              value={roleCount('USER')}
              icon={<UserIcon className="h-4 w-4" />}
              accent="bg-emerald-100 text-emerald-700"
            />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Recently Registered
            </p>
            {recent.length === 0 ? (
              <EmptyState
                compact
                title="No recent registrations"
                message="New accounts will show up here."
              />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {recent.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {(u.name || u.email || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {u.name || '(no name)'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 tabular-nums text-slate-600">
                        {(u.registeredAt || u.createdAt)
                          ? new Date(u.registeredAt || u.createdAt).toLocaleDateString()
                          : '—'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-indigo-100 text-indigo-700'
                            : u.role === 'ANALYST'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                        {u.status || 'ACTIVE'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function RoleMini({ label, value, icon, accent }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-xl font-bold tabular-nums text-slate-900">
          {value.toLocaleString()}
        </p>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${accent}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

const ADMIN_QUICK_ACTIONS = [
  {
    label: 'View Transactions',
    description: 'Search and review all transactions',
    to: '/transactions',
    icon: ActivityIcon,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'View Alerts',
    description: 'All alerts & status management',
    to: '/alerts',
    icon: BellIcon,
    accent: 'bg-rose-50 text-rose-700',
  },
  {
    label: 'View Analytics',
    description: 'Risk trends and distribution',
    to: '/risk-analysis',
    icon: ChartIcon,
    accent: 'bg-brand-50 text-brand-700',
  },
  {
    label: 'Manage Users',
    description: 'Invite, list and manage accounts',
    to: '/users',
    icon: UsersIcon,
    accent: 'bg-indigo-50 text-indigo-700',
  },
  {
    label: 'Manage Vendors',
    description: 'Third-party risk summaries',
    to: '/vendors',
    icon: ShieldIcon,
    accent: 'bg-sky-50 text-sky-700',
  },
  {
    label: 'AI Investigation',
    description: 'Ask the AI agent a question',
    to: '/investigation',
    icon: SparklesIcon,
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    label: 'Generate Report',
    description: 'AI-written investigation report',
    to: '/investigation',
    icon: RiskIcon,
    accent: 'bg-slate-100 text-slate-700',
  },
];

export function AdminQuickActions() {
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500">
            Jump between the Admin, Analyst and User consoles.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {ADMIN_QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${action.accent}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                  {action.label}
                </p>
                <p className="text-[11px] leading-snug text-slate-500">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
