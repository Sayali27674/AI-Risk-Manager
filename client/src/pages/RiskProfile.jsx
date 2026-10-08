import { useEffect, useState } from 'react';
import { fetchUserBehaviorProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export default function RiskProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [authorized, user?.id]);

  if (!authorized) {
    return <div className="text-red-600">Insufficient permissions.</div>;
  }

  if (loading) return <div>Loading risk profile...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  if (!profile?.available) {
    return (
      <section>
        <h1 className="mb-6 text-3xl font-bold">Risk Profile</h1>
        <div className="rounded bg-white p-5 shadow">
          {profile?.reason || 'Behavioral profile is not available yet.'}
        </div>
      </section>
    );
  }

  const data = profile.profile;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Risk Profile</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Average Transaction Amount</p>
          <p className="text-2xl font-semibold">
            {formatMoney(data.averageAmount)}
          </p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Median Transaction Amount</p>
          <p className="text-2xl font-semibold">
            {formatMoney(data.medianAmount)}
          </p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Transaction Frequency</p>
          <p className="text-2xl font-semibold">
            {data.averageDailyTransactions}/day
          </p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Known Devices</p>
          <p className="text-2xl font-semibold">{data.knownDevices}</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Common Locations</p>
          <p className="text-2xl font-semibold">{data.knownLocations}</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Frequent Vendors</p>
          <p className="text-2xl font-semibold">{data.frequentVendorCount}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold">Common Hours</h2>
          <p>{data.usualTransactionHours.join(', ') || 'N/A'}</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold">Vendor Categories</h2>
          <p>{joinValues(data.frequentVendorCategories)}</p>
        </div>
      </div>
    </section>
  );
}
