import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAlerts } from '../services/api';
import { EmptyState, ErrorState, Skeleton } from '../components/dashboard/ui';
import { AlertIcon } from '../components/icons';

const SEVERITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
  MEDIUM: 'bg-amber-100 text-amber-800 ring-amber-200',
  HIGH: 'bg-orange-100 text-orange-800 ring-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 ring-red-200',
};

const STATUS_STYLES = {
  OPEN: 'bg-red-50 text-red-700 ring-red-200',
  INVESTIGATING: 'bg-amber-50 text-amber-700 ring-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  DISMISSED: 'bg-slate-50 text-slate-600 ring-slate-200',
};

function Pill({ label, className }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const [severity, setSeverity] = useState(searchParams.get('severity') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setSeverity(searchParams.get('severity') || '');
    setStatus(searchParams.get('status') || '');
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        setLoading(true);
        const result = await fetchAlerts({ severity, status });

        if (active) {
          setAlerts(Array.isArray(result.items) ? result.items : []);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setAlerts([]);
          setError(
            requestError.response?.data?.message ||
              'Unable to load alerts',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAlerts();

    return () => {
      active = false;
    };
  }, [severity, status, reloadKey]);

  return (
    <div className="space-y-4">
      <header className="card p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Triage risk alerts by severity and workflow status.
        </p>
      </header>

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="input mt-1.5 appearance-none bg-white"
          >
            <option value="">All severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="input mt-1.5 appearance-none bg-white"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {error && (
        <div className="card p-6">
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((current) => current + 1)}
          />
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="card p-4">
              <EmptyState message="No alerts match the current filters." />
            </div>
          ) : (
            alerts.map((alert) => (
              <article
                key={alert.id}
                className="card flex flex-wrap items-start justify-between gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <AlertIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill
                        label={alert.severity}
                        className={
                          SEVERITY_STYLES[alert.severity] ||
                          'bg-slate-100 text-slate-700 ring-slate-200'
                        }
                      />
                      <Pill
                        label={alert.status}
                        className={
                          STATUS_STYLES[alert.status] ||
                          'bg-slate-100 text-slate-700 ring-slate-200'
                        }
                      />
                      <span className="text-xs text-slate-400">#{alert.id}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {alert.message}
                    </p>
                    {alert.timestamp && (
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}