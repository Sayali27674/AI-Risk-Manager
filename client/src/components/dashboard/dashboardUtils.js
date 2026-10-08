export const RISK_COLORS = {
  LOW: '#0f766e',
  MEDIUM: '#ca8a04',
  HIGH: '#c2410c',
  CRITICAL: '#b91c1c',
};

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return new Intl.NumberFormat('en-US').format(Number(value));
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(digits)}%`;
}

export function formatAmount(value, currency = 'USD') {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${formatNumber(value)}`;
  }
}

export function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

export function formatTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatFraudProbability(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return `${Math.round(Number(value) * 100)}%`;
}

export function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function rangeFromPreset(preset, customFrom, customTo) {
  const now = new Date();

  if (preset === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }

  if (preset === '7d') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }

  if (preset === '30d') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to: endOfDay(now) };
  }

  if (preset === '90d') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 89);
    return { from, to: endOfDay(now) };
  }

  if (preset === 'custom') {
    return {
      from: customFrom ? startOfDay(customFrom) : null,
      to: customTo ? endOfDay(customTo) : null,
    };
  }

  return { from: null, to: null };
}

export function toQueryParams(filters) {
  const params = {};
  if (filters.from) params.from = filters.from.toISOString();
  if (filters.to) params.to = filters.to.toISOString();
  if (filters.riskLevel) params.riskLevel = filters.riskLevel;
  if (filters.status) params.status = filters.status;
  if (filters.vendorId) params.vendorId = filters.vendorId;
  if (filters.riskType) params.riskType = filters.riskType;
  return params;
}

export function displayValue(value, fallback = 'N/A') {
  if (value == null || value === '' || Number.isNaN(value)) return fallback;
  return value;
}
