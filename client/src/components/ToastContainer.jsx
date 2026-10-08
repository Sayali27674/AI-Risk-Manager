import React from 'react';
import { Link } from 'react-router-dom';
import { useAlerts } from '../context/AlertContext';

function severityStyles(severity) {
  if (severity === 'CRITICAL') return 'border-l-red-500 bg-red-50';
  if (severity === 'HIGH') return 'border-l-orange-400 bg-orange-50';
  return 'border-l-brand-400 bg-brand-50';
}

function severityIcon(severity) {
  if (severity === 'CRITICAL') return '🔴';
  if (severity === 'HIGH') return '🟠';
  return '🔵';
}

function severityLabel(severity) {
  if (severity === 'CRITICAL') return 'Critical Risk Detected';
  if (severity === 'HIGH') return 'High Risk Detected';
  return 'Risk Update';
}

function Toast({ toast, onDismiss }) {
  const isAlert = toast.type === 'risk:alert';
  const isUpdate = toast.type === 'risk:updated';

  return (
    <div
      className={`pointer-events-auto w-80 animate-rise overflow-hidden rounded-xl border border-slate-200 border-l-4 p-4 shadow-xl shadow-slate-900/10 transition-all ${severityStyles(toast.severity)}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 text-base leading-none shrink-0">
            {severityIcon(toast.severity)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              {severityLabel(toast.severity)}
            </p>

            {toast.transactionId && (
              <p className="mt-0.5 text-xs text-gray-600">
                Transaction #{toast.transactionId}
              </p>
            )}

            {toast.riskScore != null && (
              <p className="text-xs text-gray-600">
                Risk Score: <span className="font-semibold">{toast.riskScore}</span>
              </p>
            )}

            {isUpdate && toast.message && (
              <p className="mt-1 text-xs text-gray-700">{toast.message}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {(isAlert || isUpdate) && toast.transactionId && (
        <div className="mt-3">
          <Link
            to={`/transactions/${toast.transactionId}`}
            onClick={() => onDismiss(toast.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            View Transaction →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useAlerts();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3"
      aria-live="polite"
      aria-label="Risk notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
