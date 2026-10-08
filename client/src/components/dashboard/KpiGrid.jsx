import { formatNumber, formatPercent } from './dashboardUtils';
import { Skeleton } from './ui';

function KpiCard({ label, value, secondary, accent }) {
  return (
    <article className="card p-4 transition-shadow hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-1 text-xs ${accent || 'text-slate-500'}`}>{secondary}</p>
    </article>
  );
}

function trendText(kpi, comparisonAvailable) {
  if (!comparisonAvailable || kpi?.changePercent == null) {
    return 'No comparison available';
  }
  const sign = kpi.changePercent > 0 ? '+' : '';
  return `${sign}${kpi.changePercent}% vs previous period`;
}

export default function KpiGrid({ kpis, comparisonAvailable, loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  const total = kpis?.totalTransactions || {};
  const high = kpis?.highRiskTransactions || {};
  const critical = kpis?.criticalRisk || {};
  const alerts = kpis?.openAlerts || {};
  const fraud = kpis?.fraudSuspected || {};
  const anomalies = kpis?.anomaliesDetected || {};

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard
        label="Total Transactions"
        value={formatNumber(total.value)}
        secondary={trendText(total, comparisonAvailable)}
        accent={total.changePercent > 0 ? 'text-amber-700' : 'text-slate-500'}
      />
      <KpiCard
        label="High-Risk Transactions"
        value={formatNumber(high.value)}
        secondary={
          high.sharePercent == null
            ? 'Share unavailable'
            : `${formatPercent(high.sharePercent)} of transactions`
        }
      />
      <KpiCard
        label="Critical Risk"
        value={formatNumber(critical.value)}
        secondary="Requires immediate review"
        accent="text-red-700"
      />
      <KpiCard
        label="Open Alerts"
        value={formatNumber(alerts.value)}
        secondary={
          alerts.critical == null ? 'N/A' : `${formatNumber(alerts.critical)} critical`
        }
      />
      <KpiCard
        label="Fraud Suspected"
        value={formatNumber(fraud.value)}
        secondary="Potential fraud, not confirmed"
      />
      <KpiCard
        label="Anomalies Detected"
        value={formatNumber(anomalies.value)}
        secondary="Isolation Forest results"
      />
    </div>
  );
}
