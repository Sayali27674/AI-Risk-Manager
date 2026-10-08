import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchDashboardHighRisk,
  fetchDashboardOverview,
  updateAlertStatus,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import FilterBar from '../components/dashboard/FilterBar';
import KpiGrid from '../components/dashboard/KpiGrid';
import {
  RiskDistributionChart,
  RiskTrendChart,
  ScoreDistributionChart,
} from '../components/dashboard/Charts';
import {
  AlertCenter,
  HighRiskTable,
  QuickActions,
  ThreatMonitor,
} from '../components/dashboard/Operations';
import {
  AnomalyIntelligence,
  BehavioralIntelligence,
  FraudIntelligence,
  HighRiskUsers,
  InsightsPanel,
  RecentActivity,
  ShapPanel,
  VendorOverview,
} from '../components/dashboard/Intelligence';
import {
  formatDate,
  formatTime,
  rangeFromPreset,
  toQueryParams,
} from '../components/dashboard/dashboardUtils';
import { ErrorState, PrimaryButton } from '../components/dashboard/ui';

const DEFAULT_FILTERS = {
  preset: '30d',
  riskLevel: '',
  status: '',
  vendorId: '',
  riskType: '',
  customFrom: '',
  customTo: '',
};

export default function Dashboard() {
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

  const [table, setTable] = useState({
    items: [],
    pagination: { page: 1, limit: 8, total: 0, totalPages: 1 },
  });
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [search, setSearch] = useState('');
  const [tableRiskLevel, setTableRiskLevel] = useState('');
  const [tableStatus, setTableStatus] = useState('');
  const [sort, setSort] = useState('riskScore');
  const [dir, setDir] = useState('desc');
  const [page, setPage] = useState(1);

  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const queryParams = useMemo(() => {
    const range = rangeFromPreset(applied.preset, applied.customFrom, applied.customTo);
    return toQueryParams({ ...applied, ...range });
  }, [applied]);

  const loadOverview = useCallback(async (params, { silent } = {}) => {
    if (!silent) setLoading(true);
    setApplying(true);
    try {
      const data = await fetchDashboardOverview(params);
      setOverview(data);
      setUpdatedAt(data?.generatedAt || new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'Unable to load risk analytics.',
      );
    } finally {
      setLoading(false);
      setApplying(false);
    }
  }, []);

  const loadTable = useCallback(async (params) => {
    setTableLoading(true);
    try {
      const result = await fetchDashboardHighRisk({
        ...params,
        search: debouncedSearch,
        tableRiskLevel,
        tableStatus,
        sort,
        dir,
        page,
        limit: 8,
      });
      setTable(result);
      setTableError('');
    } catch (requestError) {
      setTableError(
        requestError.response?.data?.message || 'Unable to load high-risk transactions.',
      );
    } finally {
      setTableLoading(false);
    }
  }, [debouncedSearch, tableRiskLevel, tableStatus, sort, dir, page]);

  useEffect(() => {
    loadOverview(queryParams);
  }, [loadOverview, queryParams]);

  useEffect(() => {
    loadTable(queryParams);
  }, [loadTable, queryParams]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    const refresh = () => {
      loadOverview(queryParams, { silent: true });
      loadTable(queryParams);
    };

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
  }, [addAlertListener, loadOverview, loadTable, queryParams]);

  function applyFilters() {
    setApplied(draft);
    setPage(1);
  }

  function resetFilters() {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  }

  async function handleAlertStatus(id, status) {
    try {
      await updateAlertStatus(id, status);
      loadOverview(queryParams, { silent: true });
    } catch {
      setError('Unable to update alert status.');
    }
  }

  const staff = ['ADMIN', 'ANALYST'].includes(user?.role);
  const capabilities = overview?.capabilities || {
    canInvestigate: staff,
    canManageAlerts: staff,
    canViewUsers: staff,
    canViewVendors: staff,
    canViewShap: staff,
  };

  if (error && !overview) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadOverview(queryParams)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4 border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Risk Intelligence Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time monitoring and AI-powered risk analysis
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>{user?.name || 'Unknown user'}</span>
            <span className="font-semibold">{user?.role || 'N/A'}</span>
            <span>{formatDate(new Date())}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`}
              aria-hidden="true"
            />
            <span className="font-semibold text-slate-800">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Last updated: {updatedAt ? formatTime(updatedAt) : 'N/A'}
          </span>
          <PrimaryButton
            onClick={() => {
              loadOverview(queryParams);
              loadTable(queryParams);
            }}
          >
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
          setPreset: (preset) => setDraft((current) => ({ ...current, preset })),
          setRiskLevel: (riskLevel) => setDraft((current) => ({ ...current, riskLevel })),
          setStatus: (status) => setDraft((current) => ({ ...current, status })),
          setVendorId: (vendorId) => setDraft((current) => ({ ...current, vendorId })),
          setRiskType: (riskType) => setDraft((current) => ({ ...current, riskType })),
          setCustomFrom: (customFrom) => setDraft((current) => ({ ...current, customFrom })),
          setCustomTo: (customTo) => setDraft((current) => ({ ...current, customTo })),
        }}
        vendors={overview?.filterOptions?.vendors || []}
        onApply={applyFilters}
        onReset={resetFilters}
        applying={applying}
      />

      <KpiGrid
        kpis={overview?.kpis}
        comparisonAvailable={overview?.comparisonAvailable}
        loading={loading}
      />

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

      <ScoreDistributionChart
        data={overview?.scoreDistribution}
        loading={loading}
        error={error}
        onRetry={() => loadOverview(queryParams)}
      />

      <ThreatMonitor
        events={overview?.threatMonitor}
        loading={loading}
        error={error}
        onRetry={() => loadOverview(queryParams)}
        canInvestigate={capabilities.canInvestigate}
      />

      <HighRiskTable
        items={table.items}
        pagination={table.pagination}
        loading={tableLoading}
        error={tableError}
        onRetry={() => loadTable(queryParams)}
        search={search}
        setSearch={setSearch}
        tableRiskLevel={tableRiskLevel}
        setTableRiskLevel={(value) => {
          setTableRiskLevel(value);
          setPage(1);
        }}
        tableStatus={tableStatus}
        setTableStatus={(value) => {
          setTableStatus(value);
          setPage(1);
        }}
        sort={sort}
        dir={dir}
        onSort={(key) => {
          if (sort === key) setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
          else {
            setSort(key);
            setDir('desc');
          }
        }}
        onPage={setPage}
        canInvestigate={capabilities.canInvestigate}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AlertCenter
          counts={overview?.alertCenter?.counts}
          recent={overview?.alertCenter?.recent}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
          onStatus={handleAlertStatus}
          canManage={capabilities.canManageAlerts}
          canInvestigate={capabilities.canInvestigate}
        />
        <InsightsPanel
          insights={overview?.insights}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
          canInvestigate={capabilities.canInvestigate}
        />
      </div>

      <BehavioralIntelligence
        rows={overview?.behavioral?.rows}
        insufficient={overview?.behavioral?.insufficient}
        loading={loading}
        error={error}
        onRetry={() => loadOverview(queryParams)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AnomalyIntelligence
          data={overview?.anomaly}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
        <FraudIntelligence
          data={overview?.fraud}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
      </div>

      {capabilities.canViewShap && (
        <ShapPanel
          shap={overview?.shap}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
      )}

      <VendorOverview
        rows={overview?.vendors}
        loading={loading}
        error={error}
        onRetry={() => loadOverview(queryParams)}
        canView={capabilities.canViewVendors}
      />

      <HighRiskUsers
        rows={overview?.highRiskUsers}
        loading={loading}
        error={error}
        onRetry={() => loadOverview(queryParams)}
        canView={capabilities.canViewUsers}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <QuickActions staff={staff} />
        <RecentActivity
          events={overview?.recentActivity}
          loading={loading}
          error={error}
          onRetry={() => loadOverview(queryParams)}
        />
      </div>
    </div>
  );
}
