import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  EyeIcon,
  FlagIcon,
  SparklesIcon,
  BellIcon,
  ShieldIcon,
  ActivityIcon,
  ChartIcon,
  RiskIcon,
  BrainIcon,
} from '../icons';
import {
  EmptyState,
  SectionCard,
  Skeleton,
  RiskLevelBadge,
  StatusBadge,
} from './ui';
import { formatAmount, formatFraudProbability, formatNumber } from './dashboardUtils';

function StatusButton({ onClick, kind, children, disabled }) {
  const styles = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    ghost: 'bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200',
    danger: 'bg-rose-100 hover:bg-rose-200 text-rose-700 ring-1 ring-rose-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
        styles[kind] || styles.ghost
      }`}
    >
      {children}
    </button>
  );
}

export function InvestigationQueuePanel({ rows = [], loading, onStatus }) {
  return (
    <SectionCard
      title="Investigation Queue"
      subtitle="Priority-ranked alerts — highest risk first (top 25)"
      loading={loading}
    >
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={<CheckCircleIcon className="h-6 w-6 text-emerald-500" />}
          title="Investigation queue is empty"
          message="All items resolved or no recent alerts in this range."
        />
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Priority
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Transaction
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Vendor
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Amount
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Risk Score
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Level
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Fraud Prob.
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Anomaly
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Alert Status
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Triggered
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, idx) => (
                <tr
                  key={row.id || `${row.transactionId || row.alertId || idx}-${idx}`}
                  className="hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-500">
                    #{idx + 1}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex flex-col">
                      <Link
                        to={`/transactions/${row.id ?? row.transactionId}`}
                        className="text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Txn #{row.id ?? row.transactionId}
                      </Link>
                      <span className="text-[11px] text-slate-500">
                        {row.user?.name || row.userName || 'Unknown user'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                    {row.vendor?.name || row.vendorName || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-slate-900">
                    {formatAmount(row.amount, row.currency)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-bold tabular-nums text-slate-900">
                    {formatNumber(row.riskScore)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <RiskLevelBadge level={row.riskLevel} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-slate-700">
                    {row.fraudProbability != null
                      ? formatFraudProbability(row.fraudProbability)
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-slate-700">
                    {row.anomalyScore != null ? formatNumber(row.anomalyScore) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {row.alertStatus && row.alertStatus !== 'NONE' ? (
                      <StatusBadge status={row.alertStatus} />
                    ) : (
                      <span className="text-xs text-slate-400">No alert</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">
                    {row.timestamp
                      ? new Date(row.timestamp).toLocaleString()
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        to={`/transactions/${row.id ?? row.transactionId}`}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-brand-700"
                      >
                        <EyeIcon className="h-3 w-3" />
                        Investigate
                      </Link>
                      {row.alertId && (
                        <>
                          <StatusButton
                            kind="success"
                            onClick={() => onStatus?.(row.alertId, 'RESOLVED')}
                          >
                            <CheckCircleIcon className="h-3 w-3" />
                            Resolve
                          </StatusButton>
                          <StatusButton
                            kind="danger"
                            onClick={() => onStatus?.(row.alertId, 'DISMISSED')}
                          >
                            <FlagIcon className="h-3 w-3" />
                            Dismiss
                          </StatusButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function AttentionAlertsPanel({ rows = [], loading, onStatus }) {
  return (
    <SectionCard
      title="Alerts Requiring Attention"
      subtitle="Open and investigating alerts"
      loading={loading}
    >
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={<CheckCircleIcon className="h-6 w-6 text-emerald-500" />}
          title="No attention alerts"
          message="All open alerts are handled or none in this time range."
        />
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Alert
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Severity
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Risk Score
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Created
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">
                        {row.message || row.type || row.alertType || 'Risk alert'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {row.transactionId
                          ? `Txn ${row.transactionId}`
                          : row.userName || ''}
                        {row.vendor ? ` · ${row.vendor}` : ''}
                        {row.user ? ` · ${row.user}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <RiskLevelBadge level={row.severity || row.riskLevel || 'MEDIUM'} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {row.riskScore != null ? formatNumber(row.riskScore) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <StatusBadge status={row.status || 'OPEN'} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <StatusButton
                        kind="primary"
                        onClick={() => onStatus?.(row.id, 'INVESTIGATING')}
                      >
                        <EyeIcon className="h-3 w-3" />
                        Investigate
                      </StatusButton>
                      <StatusButton
                        kind="success"
                        onClick={() => onStatus?.(row.id, 'RESOLVED')}
                      >
                        <CheckCircleIcon className="h-3 w-3" />
                        Resolve
                      </StatusButton>
                      <StatusButton
                        kind="danger"
                        onClick={() => onStatus?.(row.id, 'DISMISSED')}
                      >
                        <FlagIcon className="h-3 w-3" />
                        Dismiss
                      </StatusButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function FraudPredictionPanel({ data, loading }) {
  // Backend sends fraudPredictionSummary as
  // { highProbabilityCount, averageProbability, recent: [serialized transactions] }.
  const items = data?.recent || data?.items || [];
  const potentialFraudCount =
    data?.highProbabilityCount ?? data?.potentialFraudCount ?? 0;
  const averageProbability = data?.averageProbability ?? null;
  const predictionLabel = (probability) => {
    if (probability == null) return 'Under review';
    if (probability >= 0.75) return 'High';
    if (probability >= 0.5) return 'Elevated';
    return 'Under review';
  };
  return (
    <SectionCard
      title="Fraud Prediction Overview"
      subtitle="Model probability (predictions only, not a confirmed finding)"
      loading={loading}
      headerExtra={
        !loading && averageProbability != null ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
            Avg probability {formatFraudProbability(averageProbability)}
          </span>
        ) : null
      }
    >
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <EmptyState
          title="No flagged predictions"
          message="No high fraud probability items in this time range."
        />
      )}
      {!loading && items.length > 0 && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            <span className="font-semibold text-rose-700">
              {potentialFraudCount}
            </span>{' '}
            transaction(s) with high fraud probability in this range — predictions,
            not confirmed fraud.
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {items.map((item, idx) => {
              const probability = item.fraudProbability ?? item.probability ?? null;
              return (
                <li
                  key={item.id || item.transactionId || idx}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        Prediction
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          (probability ?? 0) >= 0.75
                            ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                            : (probability ?? 0) >= 0.5
                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                        }`}
                      >
                        {predictionLabel(probability)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.id || item.transactionId ? (
                        <Link
                          to={`/transactions/${item.id ?? item.transactionId}`}
                          className="text-brand-700 hover:underline"
                        >
                          Txn {item.id ?? item.transactionId}
                        </Link>
                      ) : null}
                      {item.user?.name || item.userName
                        ? ` · ${item.user?.name || item.userName}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-xs font-semibold text-slate-500">
                      Fraud Probability
                    </p>
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {formatFraudProbability(probability)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

export function AnomalyDetectionPanel({ data, loading }) {
  // Backend sends anomalySummary as
  // { count, averageAnomalyScore, recent: [serialized transactions] }.
  // Anomaly score (0–100, Isolation Forest) is a different concept from
  // fraud probability (0–1, XGBoost) — keep labels distinct.
  const items = data?.recent || data?.items || [];
  const anomalyCount = data?.count ?? data?.anomalyCount ?? 0;
  const averageScore = data?.averageAnomalyScore ?? null;
  return (
    <SectionCard
      title="Anomaly Detection"
      subtitle="Isolation Forest anomaly score (separate from fraud probability)"
      loading={loading}
      headerExtra={
        !loading && averageScore != null ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            Avg score {averageScore}
          </span>
        ) : null
      }
    >
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <EmptyState
          title="No notable anomalies"
          message="Anomaly scores are within the expected distribution."
        />
      )}
      {!loading && items.length > 0 && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            <span className="font-semibold text-amber-700">{anomalyCount}</span>{' '}
            outlier transactions detected in this range.
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {items.map((item, idx) => {
              const score = Number(item.anomalyScore ?? item.score ?? 0) || 0;
              const pct = Math.min(100, Math.max(0, Math.round(score)));
              return (
                <li
                  key={item.id || item.transactionId || idx}
                  className="px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.id || item.transactionId ? (
                          <Link
                            to={`/transactions/${item.id ?? item.transactionId}`}
                            className="text-brand-700 hover:underline"
                          >
                            Txn {item.id ?? item.transactionId}
                          </Link>
                        ) : (
                          'Transaction'
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.user?.name
                          || item.userName
                          || item.vendor?.name
                          || item.vendorName
                          || 'Anomalous pattern'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Anomaly Score
                      </p>
                      <p className="text-sm font-bold tabular-nums text-slate-900">
                        {formatNumber(score)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 75
                          ? 'bg-rose-500'
                          : pct >= 50
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

const BEHAVIOR_CATEGORIES = [
  { key: 'unusualAmount', label: 'Unusual amounts', message: 'Transactions far above the user baseline' },
  { key: 'newDevice', label: 'New devices', message: 'First-seen devices used for transactions' },
  { key: 'newLocation', label: 'Unusual locations', message: 'Locations outside the user pattern' },
  { key: 'unusualTime', label: 'Unusual times', message: 'Transactions outside usual hours' },
  { key: 'highFrequency', label: 'High-frequency activity', message: '8+ transactions within the last 24 hours' },
  { key: 'unusualVendor', label: 'Unusual vendors', message: 'Vendors unseen in the user history' },
];

export function BehavioralInsightsPanel({ data, loading }) {
  // Backend sends behavioralInsights as { rows, insufficient, categories }.
  const categories = data?.categories || {};
  const allRows = data?.rows || [];
  const rows = allRows.filter((row) => row.available);
  const insufficient = rows.length === 0;
  const topRows = [...rows]
    .sort(
      (a, b) => (Number(b.behavioralScore) || 0) - (Number(a.behavioralScore) || 0),
    )
    .slice(0, 4);

  return (
    <SectionCard
      title="Behavioral Risk Insights"
      subtitle="Unusual amounts, devices, locations, times, frequency and vendors"
      loading={loading}
    >
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {!loading && insufficient && (
        <EmptyState
          icon={<ActivityIcon className="h-6 w-6 text-amber-500" />}
          title="Insufficient behavioral history"
          message="Not enough prior transactions to build a behavioral baseline for this range."
        />
      )}
      {!loading && !insufficient && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BEHAVIOR_CATEGORIES.map((cat) => {
              const count = Number(categories[cat.key]) || 0;
              const badge =
                count === 0
                  ? 'bg-slate-100 text-slate-600 ring-slate-200'
                  : count < 3
                  ? 'bg-amber-100 text-amber-700 ring-amber-200'
                  : 'bg-rose-100 text-rose-700 ring-rose-200';
              return (
                <article
                  key={cat.key}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge}`}
                    >
                      <ActivityIcon className="h-3 w-3" />
                      {count === 0 ? 'None detected' : `${count} flagged`}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {cat.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{cat.message}</p>
                </article>
              );
            })}
          </div>
          {topRows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Top behavioral deviations
              </p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {topRows.map((row, idx) => (
                  <li
                    key={row.transactionId || idx}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {row.user?.name || 'User'}
                        <span className="ml-2 text-[11px] font-normal text-slate-500">
                          Txn #{row.transactionId}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.newDevice && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            New device
                          </span>
                        )}
                        {row.newLocation && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            New location
                          </span>
                        )}
                        {row.unusualTime && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Unusual time
                          </span>
                        )}
                        {row.unusualVendor && (
                          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                            Unusual vendor
                          </span>
                        )}
                        {row.amountDeviation != null && row.amountDeviation >= 2 && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            {row.amountDeviation}× avg amount
                          </span>
                        )}
                        {row.transactionFrequency != null && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {row.transactionFrequency}/24h
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-brand-700 ring-1 ring-brand-200">
                      Score {row.behavioralScore ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

export function AiInsightsPanel({ data, loading }) {
  // Backend sends aiInsights as a named object:
  // { highestRiskTransaction, highestFraudProbability, mostSuspiciousVendor,
  //   largestRiskIncrease, mostUnusualUserBehavior }
  // Map each real insight to a card with an entity link where possible.
  const insights = [];
  if (data?.highestRiskTransaction) {
    const item = data.highestRiskTransaction;
    insights.push({
      source: 'Risk Engine',
      title: 'Highest Risk Transaction',
      message: `${item.label}${item.score != null ? ` · score ${item.score}` : ''}${item.level ? ` (${item.level})` : ''}`,
      to: item.entityId != null ? `/transactions/${item.entityId}` : null,
    });
  }
  if (data?.highestFraudProbability) {
    const item = data.highestFraudProbability;
    insights.push({
      source: 'XGBoost',
      title: 'Highest Fraud Probability',
      message: `${item.label} · predicted probability ${formatFraudProbability(item.probability)}`,
      to: item.entityId != null ? `/transactions/${item.entityId}` : null,
    });
  }
  if (data?.mostSuspiciousVendor) {
    const item = data.mostSuspiciousVendor;
    insights.push({
      source: 'Ensemble',
      title: 'Most Suspicious Vendor',
      message: `${item.label} · avg risk ${item.averageRisk ?? '—'}${item.highSharePercent != null ? ` · ${item.highSharePercent}% high-risk share` : ''}`,
      to: item.entityId != null ? '/vendors' : null,
    });
  }
  if (data?.largestRiskIncrease) {
    const item = data.largestRiskIncrease;
    insights.push({
      source: 'Trend',
      title: 'Largest Risk Increase',
      message: `High/critical share ${item.direction === 'UP' ? 'increased' : 'decreased'} by ${Math.abs(item.deltaPercent)} pts vs the previous period`,
      to: null,
    });
  }
  if (data?.mostUnusualUserBehavior) {
    const item = data.mostUnusualUserBehavior;
    insights.push({
      source: 'Behavioral',
      title: 'Most Unusual User Behavior',
      message: `${item.label} · behavioral score ${item.behavioralScore ?? '—'}`,
      to: item.transactionId != null ? `/transactions/${item.transactionId}` : null,
    });
  }

  return (
    <SectionCard
      title="AI Risk Insights"
      subtitle="Model-flagged high-signal patterns from the ensemble"
      loading={loading}
      headerExtra={
        !loading ? (
          <Link
            to="/investigation"
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Investigate with AI
          </Link>
        ) : null
      }
    >
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {!loading && insights.length === 0 && (
        <EmptyState
          icon={<BrainIcon className="h-6 w-6 text-brand-500" />}
          title="No AI insights right now"
          message="The ensemble has no new high-signal patterns to surface."
        />
      )}
      {!loading && insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
          {insights.map((item, idx) => (
            <article
              key={idx}
              className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/40 to-white p-3 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  <BrainIcon className="h-3 w-3" />
                  AI
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  · {item.source}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.message}
              </p>
              {item.to && (
                <Link
                  to={item.to}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                >
                  View details →
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

const ANALYST_QUICK_ACTIONS = [
  {
    label: 'Investigate High-Risk',
    description: 'Open the high-risk transaction queue',
    to: '/transactions?riskLevel=HIGH',
    icon: RiskIcon,
    accent: 'bg-brand-50 text-brand-700',
  },
  {
    label: 'View Alerts',
    description: 'All alerts + filters',
    to: '/alerts',
    icon: BellIcon,
    accent: 'bg-rose-50 text-rose-700',
  },
  {
    label: 'View Transactions',
    description: 'Transaction search & filters',
    to: '/transactions',
    icon: ChartIcon,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Risk Analytics',
    description: 'Trends and distributions',
    to: '/risk-analysis',
    icon: ActivityIcon,
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    label: 'AI Investigation',
    description: 'Ask the AI agent a question',
    to: '/investigation',
    icon: SparklesIcon,
    accent: 'bg-indigo-50 text-indigo-700',
  },
  {
    label: 'Generate Report',
    description: 'AI-written investigation report',
    to: '/investigation',
    icon: ShieldIcon,
    accent: 'bg-slate-100 text-slate-700',
  },
];

export function AnalystQuickActions() {
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500">
            Investigate alerts, transactions and vendor risk from here.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ANALYST_QUICK_ACTIONS.map((action) => {
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
