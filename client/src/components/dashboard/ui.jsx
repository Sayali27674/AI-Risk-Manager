import { RISK_COLORS } from './dashboardUtils';
import {
  DatabaseIcon,
  RefreshIcon,
  ShieldAlertIcon,
} from '../icons';

export function SectionCard({
  title,
  subtitle,
  action,
  headerExtra,
  children,
  className = '',
  loading,
}) {
  const headerRight = action || headerExtra;
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow ${className}`}>
      {(title || headerRight) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {headerRight}
        </header>
      )}
      <div className="p-4">{loading ? <div className="space-y-2"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div> : children}</div>
    </section>
  );
}

export function Skeleton({ className = 'h-24' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 ${className}`}
    />
  );
}

export function EmptyState({
  title,
  message = 'No data available',
  icon,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center ${
        compact ? 'py-4 min-h-[72px]' : 'min-h-[140px] py-6'
      }`}
    >
      {icon || <DatabaseIcon className="h-6 w-6 text-slate-300" />}
      {title && (
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      )}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load risk analytics.', onRetry }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 text-center">
      <ShieldAlertIcon className="h-6 w-6 text-red-400" />
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary !border-red-300 !text-red-700 hover:!bg-red-100"
        >
          <RefreshIcon className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}

export function RiskLevelBadge({ level }) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
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
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide text-white shadow-sm"
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
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {status || 'N/A'}
    </span>
  );
}

const BUTTON_VARIANTS = {
  primary:
    'btn-primary !border-brand-600 !bg-brand-600 !text-white hover:!bg-brand-700 shadow-sm',
  success:
    '!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700 shadow-sm !rounded-md !px-3 !py-2 !text-xs !font-semibold',
  ghost:
    '!border-slate-200 !bg-white !text-slate-700 hover:!bg-slate-50 shadow-none !rounded-md !px-3 !py-2 !text-xs !font-semibold',
  danger:
    '!border-rose-300 !bg-rose-100 !text-rose-700 hover:!bg-rose-200 shadow-none !rounded-md !px-3 !py-2 !text-xs !font-semibold',
};

export function PrimaryButton({
  children,
  className = '',
  variant = 'primary',
  ...props
}) {
  const variantClass = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  return (
    <button
      type="button"
      className={`${variantClass} ${className}`}
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
      className={`btn-secondary !px-3 !py-2 !text-xs ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
