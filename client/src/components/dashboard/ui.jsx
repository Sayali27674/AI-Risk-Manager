import { RISK_COLORS } from './dashboardUtils';

export function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Skeleton({ className = 'h-24' }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function ErrorState({ message = 'Unable to load risk analytics.', onRetry }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 border border-red-200 bg-red-50 px-4 text-center">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function RiskLevelBadge({ level }) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1 border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        N/A
      </span>
    );
  }

  const labels = {
    LOW: { icon: '●', text: 'LOW' },
    MEDIUM: { icon: '▲', text: 'MEDIUM' },
    HIGH: { icon: '!', text: 'HIGH' },
    CRITICAL: { icon: '!!', text: 'CRITICAL' },
  };
  const item = labels[level] || { icon: '○', text: level };
  const color = RISK_COLORS[level] || '#475569';

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      <span aria-hidden="true">{item.icon}</span>
      {item.text}
    </span>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    OPEN: 'bg-red-100 text-red-800 border-red-200',
    INVESTIGATING: 'bg-amber-100 text-amber-800 border-amber-200',
    RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    DISMISSED: 'bg-slate-100 text-slate-600 border-slate-200',
    PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    FLAGGED: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {status || 'N/A'}
    </span>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
