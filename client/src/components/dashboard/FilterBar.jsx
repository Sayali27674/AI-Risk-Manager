import { useState } from 'react';
import { PrimaryButton, SecondaryButton } from './ui';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'custom', label: 'Custom Range' },
];

export default function FilterBar({ value, vendors = [], onApply, onReset, applying }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Filters</h2>
        <button
          type="button"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 md:hidden"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className={`${open ? 'block' : 'hidden'} px-4 py-3 md:block`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block text-xs font-semibold text-slate-600">
            Date Range
            <select
              className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
              value={value.preset}
              onChange={(event) => value.setPreset(event.target.value)}
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Risk Level
            <select
              className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
              value={value.riskLevel}
              onChange={(event) => value.setRiskLevel(event.target.value)}
            >
              <option value="">All levels</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Transaction Status
            <select
              className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
              value={value.status}
              onChange={(event) => value.setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="FLAGGED">FLAGGED</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Vendor
            <select
              className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
              value={value.vendorId}
              onChange={(event) => value.setVendorId(event.target.value)}
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Risk Type
            <select
              className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
              value={value.riskType}
              onChange={(event) => value.setRiskType(event.target.value)}
            >
              <option value="">All types</option>
              <option value="RULE">Rule-based</option>
              <option value="BEHAVIORAL">Behavioral</option>
              <option value="ANOMALY">Anomaly</option>
              <option value="FRAUD">Fraud suspected</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <PrimaryButton onClick={onApply} disabled={applying} className="flex-1">
              {applying ? 'Applying…' : 'Apply Filters'}
            </PrimaryButton>
            <SecondaryButton onClick={onReset} className="flex-1">
              Reset
            </SecondaryButton>
          </div>
        </div>

        {value.preset === 'custom' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              From
              <input
                type="date"
                className="mt-1 w-full border border-slate-300 px-2 py-2 text-sm"
                value={value.customFrom}
                onChange={(event) => value.setCustomFrom(event.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              To
              <input
                type="date"
                className="mt-1 w-full border border-slate-300 px-2 py-2 text-sm"
                value={value.customTo}
                onChange={(event) => value.setCustomTo(event.target.value)}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
