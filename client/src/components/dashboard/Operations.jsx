import { Link, useNavigate } from 'react-router-dom';
import {
  formatAmount,
  formatDateTime,
  formatFraudProbability,
  formatNumber,
} from './dashboardUtils';
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  RiskLevelBadge,
  SecondaryButton,
  SectionCard,
  Skeleton,
  StatusBadge,
} from './ui';

export function ThreatMonitor({ events, loading, error, onRetry, canInvestigate }) {
  return (
    <SectionCard
      title="Live Threat Monitor"
      subtitle="Recent HIGH and CRITICAL risk events"
    >
      {loading && <Skeleton className="h-64" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!events || events.length === 0) && (
        <EmptyState message="No critical risks detected" />
      )}
      {!loading && !error && events?.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {events.map((event) => (
            <article
              key={event.id}
              className="border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <RiskLevelBadge level={event.riskLevel} />
                <span className="text-[11px] text-slate-500">{formatDateTime(event.timestamp)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Transaction #{event.id}
              </p>
              <p className="text-sm text-slate-600">
                {formatAmount(event.amount, event.currency)} · {event.vendor?.name || 'Unknown vendor'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Risk Score: {event.riskScore ?? 'N/A'}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                {(event.reasons || []).slice(0, 4).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
                {(!event.reasons || event.reasons.length === 0) && (
                  <li>No risk reasons recorded</li>
                )}
              </ul>
              <Link
                to={`/transactions/${event.id}`}
                className="mt-3 inline-flex border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Investigate
              </Link>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function HighRiskTable({
  items,
  pagination,
  loading,
  error,
  onRetry,
  search,
  setSearch,
  tableRiskLevel,
  setTableRiskLevel,
  tableStatus,
  setTableStatus,
  sort,
  dir,
  onSort,
  onPage,
  canInvestigate,
}) {
  const navigate = useNavigate();

  return (
    <SectionCard
      title="Highest Risk Transactions"
      subtitle="Search, sort, and investigate elevated-risk activity"
    >
      <div className="mb-3 grid gap-2 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ID, user, vendor…"
          className="border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={tableRiskLevel}
          onChange={(event) => setTableRiskLevel(event.target.value)}
          className="border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">HIGH + CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <select
          value={tableStatus}
          onChange={(event) => setTableStatus(event.target.value)}
          className="border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="FLAGGED">FLAGGED</option>
        </select>
        <SecondaryButton onClick={onRetry}>Refresh table</SecondaryButton>
      </div>

      {loading && <Skeleton className="h-56" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!items || items.length === 0) && (
        <EmptyState message="No high-risk transactions found" />
      )}
      {!loading && !error && items?.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    ['id', 'Transaction ID'],
                    ['timestamp', 'Date/Time'],
                    [null, 'User'],
                    [null, 'Vendor'],
                    ['amount', 'Amount'],
                    ['riskScore', 'Risk Score'],
                    [null, 'Risk Level'],
                    ['fraudProbability', 'Fraud Probability'],
                    [null, 'Anomaly'],
                    [null, 'Status'],
                    [null, 'Action'],
                  ].map(([key, label]) => (
                    <th key={label} className="px-2 py-2">
                      {key ? (
                        <button
                          type="button"
                          className="font-semibold hover:text-slate-900"
                          onClick={() => onSort(key)}
                        >
                          {label}
                          {sort === key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => navigate(`/transactions/${row.id}`)}
                  >
                    <td className="px-2 py-2 font-medium">#{row.id}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDateTime(row.timestamp)}</td>
                    <td className="px-2 py-2">{row.user?.name || 'N/A'}</td>
                    <td className="px-2 py-2">{row.vendor?.name || 'N/A'}</td>
                    <td className="px-2 py-2">{formatAmount(row.amount, row.currency)}</td>
                    <td className="px-2 py-2">{row.riskScore ?? 'N/A'}</td>
                    <td className="px-2 py-2"><RiskLevelBadge level={row.riskLevel} /></td>
                    <td className="px-2 py-2">{formatFraudProbability(row.fraudProbability)}</td>
                    <td className="px-2 py-2">{row.isAnomaly ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-2 py-2">
                      <Link
                        to={`/transactions/${row.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-xs font-semibold text-slate-800 underline"
                      >
                        Investigate
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination?.page || 1} of {pagination?.totalPages || 1} ·{' '}
              {formatNumber(pagination?.total)} records
            </span>
            <div className="flex gap-2">
              <SecondaryButton
                disabled={(pagination?.page || 1) <= 1}
                onClick={() => onPage((pagination?.page || 1) - 1)}
              >
                Previous
              </SecondaryButton>
              <SecondaryButton
                disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
                onClick={() => onPage((pagination?.page || 1) + 1)}
              >
                Next
              </SecondaryButton>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

export function AlertCenter({
  counts,
  recent,
  loading,
  error,
  onRetry,
  onStatus,
  canManage,
  canInvestigate,
}) {
  return (
    <SectionCard title="Alert Center" subtitle="Open and recent alerts from the selected period">
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <div key={level} className="border border-slate-200 p-3">
                <p className="text-[11px] font-semibold text-slate-500">{level}</p>
                <p className="mt-1 text-xl font-semibold">{formatNumber(counts?.[level])}</p>
              </div>
            ))}
          </div>
          {(!recent || recent.length === 0) && <EmptyState message="No alerts in this period" />}
          <div className="space-y-2">
            {(recent || []).map((alert) => (
              <article key={alert.id} className="border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RiskLevelBadge level={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <span className="text-[11px] text-slate-500">{formatDateTime(alert.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-800">{alert.message || 'Alert generated'}</p>
                <p className="text-xs text-slate-500">
                  Transaction #{alert.transactionId}
                  {alert.vendor ? ` · ${alert.vendor}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canInvestigate && (
                    <Link
                      to={`/transactions/${alert.transactionId}`}
                      className="border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Investigate
                    </Link>
                  )}
                  {canManage && alert.status !== 'RESOLVED' && (
                    <SecondaryButton onClick={() => onStatus(alert.id, 'RESOLVED')}>
                      Resolve
                    </SecondaryButton>
                  )}
                  {canManage && alert.status !== 'DISMISSED' && (
                    <SecondaryButton onClick={() => onStatus(alert.id, 'DISMISSED')}>
                      Dismiss
                    </SecondaryButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

export function QuickActions({ staff }) {
  const actions = [
    { to: '/transactions?riskLevel=CRITICAL', label: 'View Critical Risks' },
    staff ? { to: '/alerts?status=OPEN', label: 'Review Open Alerts' } : null,
    { to: '/transactions', label: 'Analyze Transactions' },
    { to: '/risk-analysis', label: 'Risk Analytics' },
    staff ? { to: '/investigation', label: 'Investigate with AI' } : null,
    staff ? { to: '/investigation', label: 'Generate Report' } : null,
  ].filter(Boolean);

  return (
    <SectionCard title="Quick Actions">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
