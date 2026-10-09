import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAnalystDashboardOverview,
  fetchDashboardHighRisk,
  updateAlertStatus,
} from '../services/api';
import { useAlerts } from '../context/AlertContext';
import FilterBar from '../components/dashboard/FilterBar';
import KpiGrid from '../components/dashboard/KpiGrid';
import {
  RiskDistributionChart,
  RiskTrendChart,
} from '../components/dashboard/Charts';
import {
  formatDate,
  formatTime,
  rangeFromPreset,
  toQueryParams,
} from '../components/dashboard/dashboardUtils';
import { ErrorState, PrimaryButton } from '../components/dashboard/ui';
import {
  InvestigationQueuePanel,
  AttentionAlertsPanel,
  FraudPredictionPanel,
  AnomalyDetectionPanel,
  BehavioralInsightsPanel,
  AiInsightsPanel,
  AnalystQuickActions,
} from '../components/dashboard/AnalystPanels';

const DEFAULT_FILTERS = {
  preset: '30d',
  riskLevel: '',
  status: '',
  vendorId: '',
  riskType: '',
  customFrom: '',
  customTo: '',
};

export default function AnalystDashboard() {
  const { user } = useAuth();
  const { connected, addAlertListener } = useAlerts();

  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [trendMetric, setTrendMetric] = useState('totalTransactions');

  const queryParams = useMemo(() => {
    const range = rangeFromPreset(applied.preset, applied.customFrom, applied.customTo);
    return toQueryParams({ ...applied, ...range });
  }, [applied]);

  const loadOverview = useCallback(async (params, { silent } = {}) => {
    if (!silent) setLoading(true);
    setApplying(true);
    try {
      const data = await fetchAnalystDashboardOverview(params);
      setOverview(data);
      setUpdatedAt(data?.generatedAt || new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'Unable to load analyst analytics.',
      );
    } finally {
      setLoading(false);
      setApplying(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(queryParams);
  }, [loadOverview, queryParams]);

  useEffect(() => {
    const refresh = () => loadOverview(queryParams, { silent: true });
    return addAlertListener((event) => {
      if (
        event === 'risk:alert'
        || event === 'risk:updated'
        || event === 'alert:resolved'
        || event === 'alert:dismissed'
        || event === 'alert:status_updated'
        || event === 'reconnect'
      ) {
        refresh();
      }
    });
  }, [addAlertListener, loadOverview, queryParams]);

  async function handleAlertStatus(id, status) {
    try {
      await updateAlertStatus(id, status);
      loadOverview(queryParams, { silent: true });
    } catch {
      setError('Unable to update alert status.');
    }
  }

  if (error && !overview) {
    return (
      <ErrorState message={error} onRetry={() => loadOverview(queryParams)} />
    );
  }

  const kpiTxnsAnalyzed = overview?.kpis?.totalTransactions?.value ?? 0;
  const kpiHighRisk = overview?.kpis?.highRiskTransactions?.value ?? 0;
  const kpiCritical = overview?.kpis?.criticalRisk?.value ?? 0;
  const kpiOpenAlerts = overview?.kpis?.openAlerts?.value ?? 0;
  const kpiInvestigating =
    overview?.alertCenter?.statusCounts?.investigating
    ?? overview?.alertCenter?.counts?.investigating
    ?? 0;
  const kpiPotentialFraud =
    overview?.fraudPredictionSummary?.highProbabilityCount
    ?? overview?.fraudPredictionSummary?.potentialFraudCount
    ?? 0;

  const customKpis = {
    totalTransactions: { value: kpiTxnsAnalyzed, ...overview?.kpis?.totalTransactions },
    highRiskTransactions: { value: kpiHighRisk, ...overview?.kpis?.highRiskTransactions },
    criticalRisk: { value: kpiCritical, ...overview?.kpis?.criticalRisk },
    openAlerts: { value: kpiOpenAlerts, ...overview?.kpis?.openAlerts },
  };

  return (
    <div className="space-y-4">
      <header className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Analyst Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Investigation queue, fraud signals and AI-driven risk insights
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
              Analyst: {user?.name || 'User'}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              ANALYST
            </span>
            <span>{formatDate(new Date())}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            <span className="font-semibold text-slate-800">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Last updated: {updatedAt ? formatTime(updatedAt) : 'N/A'}
          </span>
          <PrimaryButton onClick={() => loadOverview(queryParams)}>
            Refresh
          </PrimaryButton>
        </div>
      </header>

      {!connected && (
        <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Socket.IO disconnected. Metrics remain available over REST until the live feed reconnects.
        </p>
      )}

      <FilterBar
        value={{
          ...draft,
          setPreset: (preset) => setDraft((c) => ({ ...c, preset })),
          setRiskLevel: (riskLevel) => setDraft((c) => ({ ...c, riskLevel })),
          setStatus: (status) => setDraft((c) => ({ ...c, status })),
          setVendorId: (vendorId) => setDraft((c) => ({ ...c, vendorId })),
          setRiskType: (riskType) => setDraft((c) => ({ ...c, riskType })),
          setCustomFrom: (customFrom) => setDraft((c) => ({ ...c, customFrom })),
          setCustomTo: (customTo) => setDraft((c) => ({ ...c, customTo })),
        }}
        vendors={overview?.filterOptions?.vendors || []}
        onApply={() => setApplied(draft)}
        onReset={() => {
          setDraft(DEFAULT_FILTERS);
          setApplied(DEFAULT_FILTERS);
        }}
        applying={applying}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AnalystKpi
          label="Transactions Analyzed"
          value={kpiTxnsAnalyzed}
          secondary={
            typeof customKpis.totalTransactions.changePercent === 'number'
              ? `${customKpis.totalTransactions.changePercent > 0 ? '+' : ''}${customKpis.totalTransactions.changePercent}% vs previous`
              : 'No comparison'
          }
          loading={loading}
        />
        <AnalystKpi
          label="High Risk"
          value={kpiHighRisk}
          secondary={
            customKpis.highRiskTransactions.sharePercent != null
              ? `${customKpis.highRiskTransactions.sharePercent}% of total`
              : 'Share unavailable'
          }
          accent="text-orange-700"
          loading={loading}
        />
        <AnalystKpi
          label="Critical Risk"
          value={kpiCritical}
          secondary="Requires immediate review"
          accent="text-red-700"
          loading={loading}
        />
        <AnalystKpi
          label="Open Alerts"
          value={kpiOpenAlerts}
          secondary={
            customKpis.openAlerts.critical != null
              ? `${customKpis.openAlerts.critical} critical`
              : 'N/A'
          }
          loading={loading}
        />
        <AnalystKpi
          label="Investigating"
          value={kpiInvestigating}
          secondary="Assigned under review"
          accent="text-amber-700"
          loading={loading}
        />
        <AnalystKpi
          label="Potential Fraud"
          value={kpiPotentialFraud}
          secondary="High probability signals"
          accent="text-rose-700"
          loading={loading}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RiskTrendChart
          data={overview?.trend}
          metric={trendMetric}
          onMetricChange={setTrendMetric}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
        <RiskDistributionChart
          data={overview?.riskDistribution}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
      </div>

      <InvestigationQueuePanel
        rows={overview?.investigationQueue}
        loading={loading}
        onStatus={handleAlertStatus}
      />

      <AttentionAlertsPanel
        rows={overview?.attentionAlerts}
        loading={loading}
        onStatus={handleAlertStatus}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <FraudPredictionPanel
          data={overview?.fraudPredictionSummary}
          loading={loading}
        />
        <AnomalyDetectionPanel
          data={overview?.anomalySummary}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BehavioralInsightsPanel
          data={overview?.behavioralInsights}
          loading={loading}
        />
        <AiInsightsPanel
          data={overview?.aiInsights}
          loading={loading}
        />
      </div>

      <AnalystQuickActions />
    </div>
  );
}

function AnalystKpi({ label, value, secondary, accent, loading }) {
  if (loading) {
    return (
      <div className="card p-4">
        <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }
  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n ?? '—');
  return (
    <article className="card p-4 transition-shadow hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
        {fmt(value)}
      </p>
      <p className={`mt-1 text-xs ${accent || 'text-slate-500'}`}>{secondary}</p>
    </article>
  );
}
