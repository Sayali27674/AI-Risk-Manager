import { useEffect, useState } from 'react';
import { fetchUserBehaviorProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorState, Skeleton } from '../components/dashboard/ui';
import { ShieldAlertIcon } from '../components/icons';

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function joinValues(items) {
  if (!Array.isArray(items) || !items.length) return 'N/A';
  return items.map((item) => item.value).join(', ');
}

function StatCard({ label, value }) {
  return (
    <div className="card p-5 transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function RiskProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const authorized = ['ADMIN', 'ANALYST'].includes(user?.role);

  useEffect(() => {
    if (!user?.id || !authorized) {
      setLoading(false);
      return;
    }

    fetchUserBehaviorProfile(user.id)
      .then(setProfile)
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            'Unable to load risk profile',
        );
      })
      .finally(() => setLoading(false));
  }, [authorized, user?.id, reloadKey]);

  if (!authorized) {
    return (
      <div className="card flex max-w-lg items-start gap-3 border-red-200 bg-red-50 p-6">
        <ShieldAlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div>
          <p className="font-semibold text-red-800">Insufficient permissions</p>
          <p className="mt-1 text-sm text-red-700">
            Behavioral risk profiles are available to ADMIN and ANALYST roles.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <header className="card p-5">
          <div className="h-7 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <ErrorState
          message={error}
          onRetry={() => {
            setError('');
            setLoading(true);
            setReloadKey((current) => current + 1);
          }}
        />
      </div>
    );
  }

  if (!profile?.available) {
    return (
      <div className="space-y-4">
        <header className="card p-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Risk Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Behavioural baselines derived from historical activity.
          </p>
        </header>
        <div className="card p-6 text-sm text-slate-600">
          {profile?.reason || 'Behavioral profile is not available yet.'}
        </div>
      </div>
    );
  }

  const data = profile.profile;

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Risk Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Behavioural baselines derived from historical activity.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Average Transaction Amount" value={formatMoney(data.averageAmount)} />
        <StatCard label="Median Transaction Amount" value={formatMoney(data.medianAmount)} />
        <StatCard label="Transaction Frequency" value={`${data.averageDailyTransactions}/day`} />
        <StatCard label="Known Devices" value={data.knownDevices} />
        <StatCard label="Common Locations" value={data.knownLocations} />
        <StatCard label="Frequent Vendors" value={data.frequentVendorCount} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900">
            Common Hours
          </h2>
          <p className="text-sm text-slate-700">
            {data.usualTransactionHours.join(', ') || 'N/A'}
          </p>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900">
            Vendor Categories
          </h2>
          <p className="text-sm text-slate-700">{joinValues(data.frequentVendorCategories)}</p>
        </section>
      </div>
    </div>
  );
}
