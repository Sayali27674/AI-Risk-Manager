import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserStats, fetchUsers } from '../services/api';
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  SectionCard,
  Skeleton,
} from '../components/dashboard/ui';
import {
  AdminIcon,
  AnalystIcon,
  SearchIcon,
  UsersIcon,
  UserIcon,
} from '../components/icons';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'USER', label: 'User' },
];

const ROLE_TAGS = {
  ADMIN: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  ANALYST: 'bg-amber-100 text-amber-700 border border-amber-200',
  USER: 'bg-slate-100 text-slate-700 border border-slate-200',
};

function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ROLE_TAGS[role] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {role === 'ADMIN' ? (
        <AdminIcon className="h-3 w-3" />
      ) : role === 'ANALYST' ? (
        <AnalystIcon className="h-3 w-3" />
      ) : (
        <UserIcon className="h-3 w-3" />
      )}
      {role}
    </span>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const params = useMemo(
    () => ({ page, limit, search: debouncedSearch, role: roleFilter }),
    [page, limit, debouncedSearch, roleFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [listResult, statsResult] = await Promise.all([
          fetchUsers(params),
          fetchUserStats(),
        ]);
        if (cancelled) return;
        setRows(listResult.items || []);
        setPagination(
          listResult.pagination || {
            page: 1,
            limit,
            total: (listResult.items || []).length,
            totalPages: 1,
          },
        );
        setStats(statsResult);
        setError('');
      } catch (e) {
        if (cancelled) return;
        setError(e.response?.data?.message || 'Unable to load users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, limit]);

  const roleCounts = stats?.roles || [];
  const recent = stats?.recentRegistrations || [];

  return (
    <div className="space-y-4">
      <header className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Role breakdown, recent registrations and full user directory
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
            {user?.name || 'Admin'} · ADMIN
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RoleStatCard
          label="Total Users"
          value={stats?.total ?? 0}
          loading={loading}
          accent="bg-slate-100 text-slate-700"
        />
        <RoleStatCard
          label="Admins"
          value={roleCounts.find((r) => r.role === 'ADMIN')?.count ?? 0}
          loading={loading}
          accent="bg-indigo-100 text-indigo-700"
        />
        <RoleStatCard
          label="Analysts"
          value={roleCounts.find((r) => r.role === 'ANALYST')?.count ?? 0}
          loading={loading}
          accent="bg-amber-100 text-amber-700"
        />
        <RoleStatCard
          label="Users"
          value={roleCounts.find((r) => r.role === 'USER')?.count ?? 0}
          loading={loading}
          accent="bg-slate-100 text-slate-700"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Recent Registrations"
          subtitle="Newly created accounts"
          loading={loading}
        >
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {!loading && recent.length === 0 && (
            <EmptyState
              title="No recent registrations"
              message="Recent sign-ups will appear here."
            />
          )}
          {!loading && recent.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                      {(item.name || item.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name || '(no name)'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                    <span className="tabular-nums">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : '—'}
                    </span>
                    <RoleBadge role={item.role} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Role Distribution"
          subtitle="Account counts by role"
          loading={loading}
        >
          {loading
            && Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-10 w-full" />
            ))}
          {!loading
            && (roleCounts.length === 0)
            && <EmptyState title="No role data" message="Role counts will appear here." />}
          {!loading && roleCounts.length > 0 && (
            <ul className="space-y-3">
              {roleCounts.map((item) => {
                const max = Math.max(...roleCounts.map((r) => r.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <li key={item.role}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <RoleBadge role={item.role} />
                      <span className="font-semibold tabular-nums text-slate-800">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          item.role === 'ADMIN'
                            ? 'bg-indigo-500'
                            : item.role === 'ANALYST'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="All Users"
        subtitle={`${pagination.total ?? 0} total accounts`}
        loading={loading}
        headerExtra={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="relative block">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="input !w-56 !py-2 pl-9 text-sm"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="input !w-36 !py-2 text-sm"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {error && !loading && (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              setError('');
              fetchUsers(params)
                .then((r) => {
                  setRows(r.items || []);
                  setPagination(r.pagination);
                })
                .catch((e) => setError(e.response?.data?.message || 'Failed to load users.'))
                .finally(() => setLoading(false));
            }}
          />
        )}
        {!loading && !error && rows.length === 0 && (
          <EmptyState
            title="No users match your filters"
            message="Try a different search or clear the role filter."
          />
        )}
        {!loading && !error && rows.length > 0 && (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Last Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                            {(row.name || row.email || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {row.name || '(no name)'}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <RoleBadge role={row.role} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600">
                        {row.lastActivity
                          ? new Date(row.lastActivity).toLocaleString()
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            row.isActive === false
                              ? 'border-slate-200 bg-slate-100 text-slate-500'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              row.isActive === false ? 'bg-slate-400' : 'bg-emerald-500'
                            }`}
                          />
                          {row.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={pagination.page ?? 1}
              totalPages={pagination.totalPages ?? 1}
              total={pagination.total ?? rows.length}
              onPage={(p) => setPage(p)}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}

function RoleStatCard({ label, value, loading, accent }) {
  if (loading) {
    return (
      <div className="card p-4">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-3 h-8 w-16" />
      </div>
    );
  }
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
        {value.toLocaleString()}
      </p>
      <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${accent || ''}`}>
        Total
      </p>
    </div>
  );
}

function PaginationBar({ page, totalPages, total, onPage }) {
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-slate-500 tabular-nums">
        Showing {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <PrimaryButton
          variant="ghost"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </PrimaryButton>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`min-w-[2rem] rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${
              p === page
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <PrimaryButton
          variant="ghost"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </PrimaryButton>
      </div>
    </div>
  );
}
