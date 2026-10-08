import { useNavigate } from 'react-router-dom';
import { formatNumber, formatPercent, RISK_COLORS } from './dashboardUtils';
import { EmptyState, ErrorState, SectionCard, Skeleton } from './ui';

const TREND_METRICS = [
  { id: 'totalTransactions', label: 'Total Transactions' },
  { id: 'averageScore', label: 'Risk Score' },
  { id: 'highRisk', label: 'High Risk' },
  { id: 'criticalRisk', label: 'Critical Risk' },
];

function maxValue(values) {
  return Math.max(...values.filter((value) => Number.isFinite(value)), 1);
}

export function RiskTrendChart({ data, metric, onMetricChange, loading, error, onRetry }) {
  const points = data || [];
  const values = points.map((item) => Number(item[metric]) || 0);
  const peak = maxValue(values);
  const width = 640;
  const height = 240;
  const path = points
    .map((item, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((Number(item[metric]) || 0) / peak) * (height - 16) - 8;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <SectionCard
      title="Risk Trend"
      subtitle="Risk activity over the selected period"
      action={
        <select
          className="border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
          value={metric}
          onChange={(event) => onMetricChange(event.target.value)}
        >
          {TREND_METRICS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      }
    >
      {loading && <Skeleton className="h-72" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && points.length === 0 && (
        <EmptyState message="No risk activity for the selected period" />
      )}
      {!loading && !error && points.length > 0 && (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full bg-slate-50" role="img">
            <title>Risk trend</title>
            {[0.25, 0.5, 0.75].map((line) => (
              <line
                key={line}
                x1="0"
                x2={width}
                y1={height * line}
                y2={height * line}
                stroke="#e2e8f0"
              />
            ))}
            <path d={path} fill="none" stroke="#0f172a" strokeWidth="2.5" />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{points[0]?.date}</span>
            <span>
              {TREND_METRICS.find((item) => item.id === metric)?.label} · axis: count/score
            </span>
            <span>{points[points.length - 1]?.date}</span>
          </div>
          <ul className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
            {points.slice(-8).map((item) => (
              <li key={item.date} className="flex justify-between border border-slate-100 px-2 py-1">
                <span>{item.date}</span>
                <span className="font-semibold">{item[metric] ?? 'N/A'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function RiskDistributionChart({ data, loading, error, onRetry }) {
  const navigate = useNavigate();
  const total = (data || []).reduce((sum, item) => sum + (item.count || 0), 0);
  let angle = 0;
  const slices = (data || []).map((item) => {
    const sweep = total ? (item.count / total) * 360 : 0;
    const start = angle;
    angle += sweep;
    return { ...item, start, sweep };
  });

  function describeArc(start, sweep) {
    if (sweep <= 0) return '';
    const toXY = (deg, radius) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)];
    };
    const [x1, y1] = toXY(start, 72);
    const [x2, y2] = toXY(start + sweep, 72);
    const [ix1, iy1] = toXY(start, 42);
    const [ix2, iy2] = toXY(start + sweep, 42);
    const large = sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A 72 72 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A 42 42 0 ${large} 0 ${ix1} ${iy1} Z`;
  }

  return (
    <SectionCard
      title="Risk Distribution"
      subtitle="Share of scored transactions by risk level"
    >
      {loading && <Skeleton className="h-72" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && total === 0 && (
        <EmptyState message="No scored transactions in this period" />
      )}
      {!loading && !error && total > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56">
            {slices.map((slice) => (
              <path
                key={slice.level}
                d={describeArc(slice.start, slice.sweep)}
                fill={RISK_COLORS[slice.level]}
                className="cursor-pointer"
                onClick={() => navigate(`/transactions?riskLevel=${slice.level}`)}
              >
                <title>
                  {slice.level}: {formatNumber(slice.count)} ({formatPercent(slice.percent)})
                </title>
              </path>
            ))}
          </svg>
          <ul className="space-y-2 text-sm">
            {(data || []).map((item) => (
              <li key={item.level}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50"
                  onClick={() => navigate(`/transactions?riskLevel=${item.level}`)}
                >
                  <span className="font-semibold" style={{ color: RISK_COLORS[item.level] }}>
                    {item.level}
                  </span>
                  <span className="text-xs text-slate-600">
                    {formatNumber(item.count)} · {formatPercent(item.percent)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function ScoreDistributionChart({ data, loading, error, onRetry }) {
  const rows = data || [];
  const hasData = rows.some((item) => item.count > 0);
  const peak = maxValue(rows.map((item) => item.count));

  return (
    <SectionCard
      title="Risk Score Distribution"
      subtitle="Actual RiskScore records from 0 to 100"
    >
      {loading && <Skeleton className="h-72" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && !hasData && (
        <EmptyState message="No risk scores recorded for the selected period" />
      )}
      {!loading && !error && hasData && (
        <div>
          <div className="flex h-56 items-end gap-1 border-b border-slate-200 pb-1">
            {rows.map((item) => (
              <div key={item.key} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className="w-full"
                  style={{
                    height: `${Math.max(((item.count || 0) / peak) * 100, item.count ? 4 : 0)}%`,
                    backgroundColor: RISK_COLORS[item.band] || '#334155',
                  }}
                  title={`${item.key}: ${item.count} (${item.band})`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-slate-500">
            {rows.map((item) => (
              <span key={item.key} className="flex-1 truncate text-center">
                {item.key}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold">
            <span style={{ color: RISK_COLORS.LOW }}>LOW 0–29</span>
            <span style={{ color: RISK_COLORS.MEDIUM }}>MEDIUM 30–59</span>
            <span style={{ color: RISK_COLORS.HIGH }}>HIGH 60–79</span>
            <span style={{ color: RISK_COLORS.CRITICAL }}>CRITICAL 80–100</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function SimpleBarChart({ data = [], labelKey = 'label', valueKey = 'count' }) {
  const peak = maxValue(data.map((item) => Number(item[valueKey]) || 0));
  if (!data.length || peak <= 0) {
    return <EmptyState message="Fraud probability distribution unavailable" />;
  }

  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((item) => (
        <div key={item[labelKey]} className="flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full bg-slate-900"
            style={{ height: `${Math.max(((Number(item[valueKey]) || 0) / peak) * 100, item[valueKey] ? 6 : 0)}%` }}
            title={`${item[labelKey]}: ${item[valueKey]}`}
          />
          <p className="mt-1 text-center text-[11px] text-slate-500">{item[labelKey]}</p>
        </div>
      ))}
    </div>
  );
}
