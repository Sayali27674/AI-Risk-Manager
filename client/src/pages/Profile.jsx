import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <section className="max-w-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Authenticated account details</p>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium">{user?.name || 'N/A'}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium">{user?.email || 'N/A'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Role</dt>
          <dd className="font-medium">{user?.role || 'N/A'}</dd>
        </div>
      </dl>
    </section>
  );
}
