import { useAuth } from '../context/AuthContext';
import { ProfileIcon } from '../components/icons';

const ROLE_STYLES = {
  ADMIN: 'bg-brand-100 text-brand-700 ring-brand-200',
  ANALYST: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  AUDITOR: 'bg-amber-100 text-amber-700 ring-amber-200',
};

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-4">
      <header className="card p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Authenticated account details
        </p>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
            {(user?.name || '?')
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900">
              {user?.name || 'N/A'}
            </p>
            <p className="truncate text-sm text-slate-500">{user?.email || 'N/A'}</p>
            <span
              className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                ROLE_STYLES[user?.role] || 'bg-slate-100 text-slate-600 ring-slate-200'
              }`}
            >
              {user?.role || 'N/A'}
            </span>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-slate-500">
              <ProfileIcon className="h-4 w-4" />
              Name
            </dt>
            <dd className="font-medium text-slate-900">{user?.name || 'N/A'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-slate-500">Email</dt>
            <dd className="break-all text-right font-medium text-slate-900">
              {user?.email || 'N/A'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{user?.role || 'N/A'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
