import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAlerts } from '../services/api';

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const [severity, setSeverity] = useState(searchParams.get('severity') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [severity, status]);

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold">Alerts</h1>

      <div className="mb-4 flex gap-3">
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          <option value="">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {loading && <p>Loading alerts...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p>No alerts found.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="rounded bg-white p-4 shadow">
                <strong>{alert.severity}</strong>
                <p>{alert.message}</p>
                <small>{alert.status}</small>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}