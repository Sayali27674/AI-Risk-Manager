import { useEffect, useState } from 'react';
import { fetchDashboardData } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            'Unable to load dashboard',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded bg-white p-5 shadow">
          Total Transactions: {data?.totalTransactions ?? 0}
        </div>
        <div className="rounded bg-white p-5 shadow">
          High Risk: {data?.highRiskTransactions ?? 0}
        </div>
        <div className="rounded bg-white p-5 shadow">
          Critical Risk: {data?.criticalRiskTransactions ?? 0}
        </div>
        <div className="rounded bg-white p-5 shadow">
          Open Alerts: {data?.openAlerts ?? 0}
        </div>
      </div>
    </section>
  );
}