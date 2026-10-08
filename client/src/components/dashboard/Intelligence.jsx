import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatAmount,
  formatDateTime,
  formatFraudProbability,
  formatNumber,
  formatPercent,
} from './dashboardUtils';
import {
  EmptyState,
  ErrorState,
  RiskLevelBadge,
  SectionCard,
  Skeleton,
} from './ui';

export function BehavioralIntelligence({ rows, insufficient, loading, error, onRetry }) {
  return (
    <SectionCard
      title="Behavioral Risk Intelligence"
      subtitle="Unusual behavior from the existing analysis service"
    >
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (insufficient || !rows?.length) && (
        <EmptyState message="Insufficient behavioral history" />
      )}
      {!loading && !error && rows?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Behavior Score</th>
                <th className="px-2 py-2">Amount Deviation</th>
                <th className="px-2 py-2">Transaction Frequency</th>
                <th className="px-2 py-2">New Device</th>
                <th className="px-2 py-2">New Location</th>
                <th className="px-2 py-2">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.user?.id}-${row.transactionId}`} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    <Link className="font-medium underline" to={`/transactions/${row.transactionId}`}>
                      {row.user?.name || 'N/A'}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {row.available ? formatNumber(row.behavioralScore) : 'Insufficient behavioral history'}
                  </td>
                  <td className="px-2 py-2">
                    {row.available && row.amountDeviation != null
                      ? `${Number(row.amountDeviation).toFixed(2)}x avg`
                      : 'N/A'}
                  </td>
                  <td className="px-2 py-2">
                    {row.available && row.transactionFrequency != null
                      ? formatNumber(row.transactionFrequency)
                      : 'N/A'}
                  </td>
                  <td className="px-2 py-2">{row.available ? (row.newDevice ? 'Yes' : 'No') : 'N/A'}</td>
                  <td className="px-2 py-2">{row.available ? (row.newLocation ? 'Yes' : 'No') : 'N/A'}</td>
                  <td className="px-2 py-2"><RiskLevelBadge level={row.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function AnomalyIntelligence({ data, loading, error, onRetry }) {
  const unavailable = data && data.aiAvailable === false && !data.recent?.length && !data.total;

  return (
    <SectionCard title="Anomaly Detection" subtitle="Isolation Forest results">
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && unavailable && (
        <EmptyState message="AI anomaly analysis unavailable" />
      )}
      {!loading && !error && !unavailable && (
        <>
          {data?.notice && (
            <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {data.notice}
            </p>
          )}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500">Total anomalies</p>
              <p className="text-lg font-semibold">{formatNumber(data?.total)}</p>
            </div>
            <div className="border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500">Anomaly rate</p>
              <p className="text-lg font-semibold">{formatPercent(data?.rate)}</p>
            </div>
            <div className="border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500">Avg anomaly score</p>
              <p className="text-lg font-semibold">{data?.averageScore ?? 'N/A'}</p>
            </div>
          </div>
          {(!data?.recent || data.recent.length === 0) && (
            <EmptyState message="No anomalous transactions in this period" />
          )}
          <ul className="space-y-2">
            {(data?.recent || []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 px-3 py-2 text-sm">
                <Link to={`/transactions/${item.id}`} className="font-medium underline">
                  Transaction #{item.id}
                </Link>
                <span>{formatAmount(item.amount, item.currency)}</span>
                <span>Score {item.anomalyScore ?? 'N/A'}</span>
                <RiskLevelBadge level={item.riskLevel} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

export function FraudIntelligence({ data, loading, error, onRetry }) {
  return (
    <SectionCard
      title="Fraud Prediction Intelligence"
      subtitle="Potential fraud based on model probability — not confirmed fraud"
    >
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && data?.aiAvailable === false && !data?.distribution?.available && (
        <EmptyState message="AI analysis temporarily unavailable. Rule-based risk monitoring remains active." />
      )}
      {!loading && !error && (
        <>
          {data?.notice && data.aiAvailable === false && (
            <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {data.notice}
            </p>
          )}
          <p className="mb-3 text-sm text-slate-600">
            Fraud suspected: <strong>{formatNumber(data?.suspected)}</strong>
          </p>
          {data?.distribution?.available ? (
            <div className="mb-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution.buckets}>
                  <CartesianGrid stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Transactions" fill="#0f172a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="Fraud probability distribution unavailable" />
          )}
          <ul className="space-y-2">
            {(data?.recent || []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 px-3 py-2 text-sm">
                <Link to={`/transactions/${item.id}`} className="font-medium underline">
                  Transaction #{item.id}
                </Link>
                <span>Fraud probability {formatFraudProbability(item.fraudProbability)}</span>
                <RiskLevelBadge level={item.riskLevel} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

export function ShapPanel({ shap, loading, error, onRetry }) {
  return (
    <SectionCard
      title="Why Are Transactions Being Flagged?"
      subtitle="Model Explanation — SHAP contributions, not probabilities"
    >
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && !shap?.available && (
        <EmptyState message={shap?.reason || 'No SHAP explanation is available.'} />
      )}
      {!loading && !error && shap?.available && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ol className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Risk Drivers</p>
            {shap.drivers.map((driver, index) => (
              <li key={driver.feature} className="flex items-center justify-between border border-slate-200 px-3 py-2 text-sm">
                <span>
                  {index + 1}. {driver.feature} {driver.direction === 'UP' ? '↑' : '↓'}
                </span>
                <span className="text-xs text-slate-500">
                  avg |SHAP| {driver.averageContribution} · n={driver.sampleCount}
                </span>
              </li>
            ))}
          </ol>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Flagged transactions
            </p>
            {(shap.samples || []).length === 0 && (
              <EmptyState message="No high-risk SHAP samples in this period" />
            )}
            <ul className="space-y-2">
              {(shap.samples || []).map((sample) => (
                <li key={sample.transactionId}>
                  <Link
                    to={`/transactions/${sample.transactionId}#shap`}
                    className="flex items-center justify-between border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span>Transaction #{sample.transactionId}</span>
                    <span className="text-xs text-slate-500">{sample.topFactor}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function VendorOverview({ rows, loading, error, onRetry, canView }) {
  if (!canView) return null;

  return (
    <SectionCard title="Vendor Risk Overview" subtitle="Aggregated from PostgreSQL transaction data">
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!rows || rows.length === 0) && (
        <EmptyState message="No vendor risk data for the selected period" />
      )}
      {!loading && !error && rows?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Vendor</th>
                <th className="px-2 py-2">Transactions</th>
                <th className="px-2 py-2">Average Risk</th>
                <th className="px-2 py-2">High/Critical %</th>
                <th className="px-2 py-2">Alerts</th>
                <th className="px-2 py-2">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.vendorId} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium">{row.vendor}</td>
                  <td className="px-2 py-2">{formatNumber(row.transactions)}</td>
                  <td className="px-2 py-2">{row.averageRisk ?? 'N/A'}</td>
                  <td className="px-2 py-2">{formatPercent(row.highCriticalPercent)}</td>
                  <td className="px-2 py-2">{formatNumber(row.alerts)}</td>
                  <td className="px-2 py-2"><RiskLevelBadge level={row.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function HighRiskUsers({ rows, loading, error, onRetry, canView }) {
  if (!canView) return null;

  return (
    <SectionCard title="Highest Risk Users" subtitle="Staff-only aggregated user risk">
      {loading && <Skeleton className="h-48" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!rows || rows.length === 0) && (
        <EmptyState message="No high-risk users in this period" />
      )}
      {!loading && !error && rows?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Transactions</th>
                <th className="px-2 py-2">Average Risk</th>
                <th className="px-2 py-2">Highest Risk</th>
                <th className="px-2 py-2">Behavior Score</th>
                <th className="px-2 py-2">Alerts</th>
                <th className="px-2 py-2">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium">{row.user}</td>
                  <td className="px-2 py-2">{formatNumber(row.transactions)}</td>
                  <td className="px-2 py-2">{row.averageRisk ?? 'N/A'}</td>
                  <td className="px-2 py-2">{row.highestRisk ?? 'N/A'}</td>
                  <td className="px-2 py-2">
                    {row.behaviorAvailable ? formatNumber(row.behaviorScore) : 'Insufficient behavioral history'}
                  </td>
                  <td className="px-2 py-2">{formatNumber(row.alerts)}</td>
                  <td className="px-2 py-2">{formatDateTime(row.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function InsightsPanel({ insights, loading, error, onRetry, canInvestigate }) {
  return (
    <SectionCard
      title="AI Risk Insights"
      subtitle="Generated only from current analytics results"
      action={
        canInvestigate ? (
          <Link
            to="/investigation"
            className="border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            Investigate with AI
          </Link>
        ) : null
      }
    >
      {loading && <Skeleton className="h-36" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && insights?.available === false && (
        <EmptyState message={insights?.summary || 'AI insights currently unavailable.'} />
      )}
      {!loading && !error && insights?.available && (
        <div className="space-y-2 text-sm text-slate-700">
          {insights.notice && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {insights.notice}
            </p>
          )}
          <p className="font-medium">{insights.summary}</p>
          <ul className="list-disc space-y-1 pl-5">
            {(insights.highlights || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function RecentActivity({ events, loading, error, onRetry }) {
  return (
    <SectionCard title="Recent Risk Activity" subtitle="Audit and risk events from real records">
      {loading && <Skeleton className="h-40" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!events || events.length === 0) && (
        <EmptyState message="No recent risk activity" />
      )}
      {!loading && !error && events?.length > 0 && (
        <ol className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-800">{event.message}</p>
                {event.transactionId ? (
                  <Link to={`/transactions/${event.transactionId}`} className="text-xs underline">
                    Transaction #{event.transactionId}
                  </Link>
                ) : null}
              </div>
              <span className="text-[11px] text-slate-500">{formatDateTime(event.timestamp)}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
