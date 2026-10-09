const prisma = require('../models/prisma');

const OPEN_ALERT_STATUSES = ['OPEN', 'INVESTIGATING'];
const HIGH_RISK_LEVELS = ['HIGH', 'CRITICAL'];
const FRAUD_SUSPECTED_THRESHOLD = 0.5;
const SCORE_BUCKETS = [
  { key: '0-9', min: 0, max: 9, band: 'LOW' },
  { key: '10-19', min: 10, max: 19, band: 'LOW' },
  { key: '20-29', min: 20, max: 29, band: 'LOW' },
  { key: '30-39', min: 30, max: 39, band: 'MEDIUM' },
  { key: '40-49', min: 40, max: 49, band: 'MEDIUM' },
  { key: '50-59', min: 50, max: 59, band: 'MEDIUM' },
  { key: '60-69', min: 60, max: 69, band: 'HIGH' },
  { key: '70-79', min: 70, max: 79, band: 'HIGH' },
  { key: '80-89', min: 80, max: 89, band: 'CRITICAL' },
  { key: '90-100', min: 90, max: 100, band: 'CRITICAL' },
];

function isStaff(user) {
  return ['ADMIN', 'ANALYST'].includes(user?.role);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toNumber(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percent(part, total) {
  if (!total) return null;
  return Number(((part / total) * 100).toFixed(1));
}

function changePercent(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  if (!Number.isFinite(current)) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function previousRange(from, to) {
  if (!from || !to) return null;
  const duration = to.getTime() - from.getTime();
  if (duration <= 0) return null;
  return {
    from: new Date(from.getTime() - duration),
    to: new Date(from.getTime() - 1),
  };
}

function parseFilters(query = {}, user) {
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  const vendorId = parseId(query.vendorId);
  const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(query.riskLevel)
    ? query.riskLevel
    : null;
  const status = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].includes(query.status)
    ? query.status
    : null;
  const riskType = ['FRAUD', 'ANOMALY', 'BEHAVIORAL', 'RULE'].includes(query.riskType)
    ? query.riskType
    : null;

  return {
    from,
    to,
    vendorId,
    riskLevel,
    status,
    riskType,
    userScopeId: isStaff(user) ? null : user.id,
  };
}

function transactionWhere(filters) {
  const where = {};

  if (filters.userScopeId) where.userId = filters.userScopeId;
  if (filters.vendorId) where.vendorId = filters.vendorId;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.timestamp = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const riskScore = {};
  if (filters.riskLevel) riskScore.riskLevel = filters.riskLevel;

  if (filters.riskType === 'FRAUD') {
    riskScore.fraudProbability = { gte: FRAUD_SUSPECTED_THRESHOLD };
  }

  if (Object.keys(riskScore).length) {
    where.riskScore = riskScore;
  }

  return where;
}

function matchesRiskType(score, riskType) {
  if (!riskType) return true;
  const reasons = score?.reasons || {};

  if (riskType === 'FRAUD') {
    return toNumber(score?.fraudProbability) >= FRAUD_SUSPECTED_THRESHOLD
      || (Array.isArray(reasons.fraud_reasons) && reasons.fraud_reasons.length > 0);
  }

  if (riskType === 'ANOMALY') {
    return Array.isArray(reasons.anomaly_reasons) && reasons.anomaly_reasons.length > 0;
  }

  if (riskType === 'BEHAVIORAL') {
    return Boolean(reasons.behavior?.available);
  }

  if (riskType === 'RULE') {
    return Array.isArray(reasons.rule_reasons) && reasons.rule_reasons.length > 0;
  }

  return true;
}

function isAnomaly(score) {
  const reasons = score?.reasons || {};
  return Array.isArray(reasons.anomaly_reasons) && reasons.anomaly_reasons.length > 0;
}

function isFraudSuspected(score) {
  const reasons = score?.reasons || {};
  return toNumber(score?.fraudProbability) >= FRAUD_SUSPECTED_THRESHOLD
    || (Array.isArray(reasons.fraud_reasons) && reasons.fraud_reasons.length > 0);
}

function flattenReasons(reasons) {
  if (!reasons || typeof reasons !== 'object') return [];
  return [
    ...(Array.isArray(reasons.rule_reasons) ? reasons.rule_reasons : []),
    ...(Array.isArray(reasons.anomaly_reasons) ? reasons.anomaly_reasons : []),
    ...(Array.isArray(reasons.fraud_reasons) ? reasons.fraud_reasons : []),
    ...(Array.isArray(reasons.behavior?.reasons) ? reasons.behavior.reasons : []),
  ].filter(Boolean);
}

function humanizeFeature(feature) {
  return String(feature || 'Unknown factor')
    .replace(/^transaction_type=/, 'Transaction type: ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function checkAiHealth() {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 3000);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 1500));
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function loadFilteredTransactions(filters, extra = {}) {
  const transactions = await prisma.transaction.findMany({
    where: transactionWhere(filters),
    include: {
      vendor: { select: { id: true, name: true, riskLevel: true } },
      user: { select: { id: true, name: true } },
      riskScore: true,
      alerts: {
        select: {
          id: true,
          severity: true,
          status: true,
          message: true,
          type: true,
          createdAt: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: extra.take || 5000,
  });

  return transactions.filter((item) => matchesRiskType(item.riskScore, filters.riskType));
}

function kpiFromTransactions(transactions) {
  const totalTransactions = transactions.length;
  const highRiskTransactions = transactions.filter(
    (item) => item.riskScore?.riskLevel === 'HIGH',
  ).length;
  const criticalRiskTransactions = transactions.filter(
    (item) => item.riskScore?.riskLevel === 'CRITICAL',
  ).length;
  const openAlerts = transactions.reduce(
    (count, item) =>
      count
      + (item.alerts || []).filter((alert) => OPEN_ALERT_STATUSES.includes(alert.status)).length,
    0,
  );
  const criticalOpenAlerts = transactions.reduce(
    (count, item) =>
      count
      + (item.alerts || []).filter(
        (alert) =>
          OPEN_ALERT_STATUSES.includes(alert.status) && alert.severity === 'CRITICAL',
      ).length,
    0,
  );
  const fraudSuspected = transactions.filter((item) => isFraudSuspected(item.riskScore)).length;
  const anomaliesDetected = transactions.filter((item) => isAnomaly(item.riskScore)).length;
  const scored = transactions.filter((item) => item.riskScore);
  const aiScored = scored.filter(
    (item) => item.riskScore.anomalyScore != null || item.riskScore.fraudProbability != null,
  );

  return {
    totalTransactions,
    highRiskTransactions,
    criticalRiskTransactions,
    openAlerts,
    criticalOpenAlerts,
    fraudSuspected,
    anomaliesDetected,
    scoredCount: scored.length,
    aiScoredCount: aiScored.length,
  };
}

function buildKpiPayload(current, previous) {
  const highShare = percent(
    current.highRiskTransactions,
    current.totalTransactions,
  );

  return {
    totalTransactions: {
      value: current.totalTransactions,
      changePercent: changePercent(current.totalTransactions, previous?.totalTransactions),
    },
    highRiskTransactions: {
      value: current.highRiskTransactions,
      sharePercent: highShare,
    },
    criticalRisk: {
      value: current.criticalRiskTransactions,
    },
    openAlerts: {
      value: current.openAlerts,
      critical: current.criticalOpenAlerts,
    },
    fraudSuspected: {
      value: current.fraudSuspected,
    },
    anomaliesDetected: {
      value: current.anomaliesDetected,
    },
  };
}

function buildTrend(transactions) {
  const grouped = new Map();

  for (const item of transactions) {
    const date = new Date(item.timestamp).toISOString().slice(0, 10);
    if (!grouped.has(date)) {
      grouped.set(date, {
        date,
        totalTransactions: 0,
        averageScore: 0,
        scoreTotal: 0,
        scoredCount: 0,
        highRisk: 0,
        criticalRisk: 0,
      });
    }

    const entry = grouped.get(date);
    entry.totalTransactions += 1;
    if (item.riskScore) {
      entry.scoreTotal += Number(item.riskScore.score);
      entry.scoredCount += 1;
      if (item.riskScore.riskLevel === 'HIGH') entry.highRisk += 1;
      if (item.riskScore.riskLevel === 'CRITICAL') entry.criticalRisk += 1;
    }
  }

  return [...grouped.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      totalTransactions: entry.totalTransactions,
      averageScore: entry.scoredCount
        ? Math.round(entry.scoreTotal / entry.scoredCount)
        : null,
      highRisk: entry.highRisk,
      criticalRisk: entry.criticalRisk,
    }));
}

function buildDistribution(transactions) {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let scored = 0;

  for (const item of transactions) {
    const level = item.riskScore?.riskLevel;
    if (counts[level] != null) {
      counts[level] += 1;
      scored += 1;
    }
  }

  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => ({
    level,
    count: counts[level],
    percent: percent(counts[level], scored),
  }));
}

function buildScoreDistribution(transactions) {
  const buckets = SCORE_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));

  for (const item of transactions) {
    const score = toNumber(item.riskScore?.score);
    if (score == null) continue;
    const bucket = buckets.find((entry) => score >= entry.min && score <= entry.max);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function buildShapSummary(transactions, canView) {
  if (!canView) {
    return { available: false, reason: 'Insufficient permissions', drivers: [], samples: [] };
  }

  const totals = new Map();
  const samples = [];

  for (const item of transactions) {
    const factors = item.riskScore?.reasons?.shap_factors;
    if (!Array.isArray(factors) || !factors.length) continue;

    if (samples.length < 8 && HIGH_RISK_LEVELS.includes(item.riskScore.riskLevel)) {
      samples.push({
        transactionId: item.id,
        riskLevel: item.riskScore.riskLevel,
        score: item.riskScore.score,
        topFactor: humanizeFeature(factors[0]?.feature),
      });
    }

    for (const factor of factors) {
      const key = factor.feature || 'unknown';
      if (!totals.has(key)) {
        totals.set(key, { feature: key, absTotal: 0, signedTotal: 0, count: 0 });
      }
      const shapValue = toNumber(factor.shap_value) || 0;
      const entry = totals.get(key);
      entry.absTotal += Math.abs(shapValue);
      entry.signedTotal += shapValue;
      entry.count += 1;
    }
  }

  const drivers = [...totals.values()]
    .sort((a, b) => b.absTotal - a.absTotal)
    .slice(0, 5)
    .map((entry) => ({
      feature: humanizeFeature(entry.feature),
      averageContribution: Number((entry.absTotal / entry.count).toFixed(4)),
      direction: entry.signedTotal >= 0 ? 'UP' : 'DOWN',
      sampleCount: entry.count,
    }));

  return {
    available: drivers.length > 0,
    reason: drivers.length ? null : 'No SHAP explanation is available for the selected period.',
    drivers,
    samples,
  };
}

function buildBehavioralRows(transactions, canViewUsers) {
  const rows = [];

  for (const item of transactions) {
    const behavior = item.riskScore?.reasons?.behavior;
    if (!behavior) continue;
    if (rows.length >= 12) break;

    rows.push({
      user: canViewUsers
        ? { id: item.user?.id, name: item.user?.name }
        : { id: item.userId, name: 'You' },
      transactionId: item.id,
      available: Boolean(behavior.available),
      reason: behavior.available
        ? null
        : (behavior.reason || 'Insufficient behavioral history'),
      behavioralScore: behavior.available ? behavior.behavioralScore : null,
      amountDeviation: behavior.available
        ? behavior.deviations?.amount?.ratioToAverage ?? null
        : null,
      transactionFrequency: behavior.available
        ? behavior.deviations?.frequency?.transactionsLast24Hours ?? null
        : null,
      newDevice: behavior.available ? Boolean(behavior.deviations?.device?.unusual) : null,
      newLocation: behavior.available ? Boolean(behavior.deviations?.location?.unusual) : null,
      unusualTime: behavior.available ? Boolean(behavior.deviations?.time?.unusual) : null,
      unusualVendor: behavior.available ? Boolean(behavior.deviations?.vendor?.unusual) : null,
      riskLevel: behavior.available
        ? behavior.behavioralRiskLevel
        : item.riskScore?.riskLevel || null,
    });
  }

  return rows;
}

function buildVendorOverview(transactions, canView) {
  if (!canView) return [];

  const vendors = new Map();

  for (const item of transactions) {
    if (!item.vendor) continue;
    if (!vendors.has(item.vendor.id)) {
      vendors.set(item.vendor.id, {
        vendorId: item.vendor.id,
        vendor: item.vendor.name,
        vendorRiskLevel: item.vendor.riskLevel,
        transactions: 0,
        scoreTotal: 0,
        scored: 0,
        highCritical: 0,
        alerts: 0,
      });
    }

    const entry = vendors.get(item.vendor.id);
    entry.transactions += 1;
    if (item.riskScore) {
      entry.scoreTotal += Number(item.riskScore.score);
      entry.scored += 1;
      if (HIGH_RISK_LEVELS.includes(item.riskScore.riskLevel)) entry.highCritical += 1;
    }
    entry.alerts += (item.alerts || []).length;
  }

  return [...vendors.values()]
    .map((entry) => {
      const averageRisk = entry.scored ? Math.round(entry.scoreTotal / entry.scored) : null;
      const highCriticalPercent = percent(entry.highCritical, entry.transactions);
      let riskLevel = 'LOW';
      if (averageRisk != null) {
        if (averageRisk <= 30) riskLevel = 'LOW';
        else if (averageRisk <= 60) riskLevel = 'MEDIUM';
        else if (averageRisk <= 80) riskLevel = 'HIGH';
        else riskLevel = 'CRITICAL';
      }

      return {
        vendorId: entry.vendorId,
        vendor: entry.vendor,
        transactions: entry.transactions,
        averageRisk,
        highCriticalPercent,
        alerts: entry.alerts,
        riskLevel,
      };
    })
    .sort((a, b) => (b.averageRisk || 0) - (a.averageRisk || 0))
    .slice(0, 10);
}

function buildHighRiskUsers(transactions, canView) {
  if (!canView) return [];

  const users = new Map();

  for (const item of transactions) {
    if (!item.user) continue;
    if (!users.has(item.user.id)) {
      users.set(item.user.id, {
        userId: item.user.id,
        user: item.user.name,
        transactions: 0,
        scoreTotal: 0,
        scored: 0,
        highestRisk: 0,
        behaviorTotal: 0,
        behaviorCount: 0,
        alerts: 0,
        lastActivity: item.timestamp,
      });
    }

    const entry = users.get(item.user.id);
    entry.transactions += 1;
    entry.alerts += (item.alerts || []).length;
    if (new Date(item.timestamp) > new Date(entry.lastActivity)) {
      entry.lastActivity = item.timestamp;
    }
    if (item.riskScore) {
      const score = Number(item.riskScore.score);
      entry.scoreTotal += score;
      entry.scored += 1;
      entry.highestRisk = Math.max(entry.highestRisk, score);
      const behavior = item.riskScore.reasons?.behavior;
      if (behavior?.available && Number.isFinite(Number(behavior.behavioralScore))) {
        entry.behaviorTotal += Number(behavior.behavioralScore);
        entry.behaviorCount += 1;
      }
    }
  }

  return [...users.values()]
    .map((entry) => ({
      userId: entry.userId,
      user: entry.user,
      transactions: entry.transactions,
      averageRisk: entry.scored ? Math.round(entry.scoreTotal / entry.scored) : null,
      highestRisk: entry.scored ? entry.highestRisk : null,
      behaviorScore: entry.behaviorCount
        ? Math.round(entry.behaviorTotal / entry.behaviorCount)
        : null,
      behaviorAvailable: entry.behaviorCount > 0,
      alerts: entry.alerts,
      lastActivity: entry.lastActivity,
    }))
    .sort((a, b) => (b.highestRisk || 0) - (a.highestRisk || 0))
    .slice(0, 10);
}

function buildInsights({ kpis, comparison, shap, behavioralRows, aiAvailable }) {
  if (!kpis.totalTransactions) {
    return {
      available: true,
      summary: 'No transactions were found for the selected filters.',
      highlights: [],
    };
  }

  const highlights = [];
  const highAndCritical = kpis.highRiskTransactions + kpis.criticalRiskTransactions;
  const comparisonTotal = comparison?.totalTransactions;
  const comparisonHigh = comparison
    ? comparison.highRiskTransactions + comparison.criticalRiskTransactions
    : null;

  if (Number.isFinite(comparisonHigh) && comparisonHigh > 0) {
    if (highAndCritical > comparisonHigh) {
      highlights.push('Risk activity increased during the selected period.');
    } else if (highAndCritical < comparisonHigh) {
      highlights.push('Risk activity decreased during the selected period.');
    } else {
      highlights.push('Risk activity was stable compared with the previous period.');
    }
  }

  if (shap.drivers.length) {
    highlights.push(
      `The major risk contributors were: ${shap.drivers
        .slice(0, 3)
        .map((driver) => driver.feature.toLowerCase())
        .join(', ')}.`,
    );
  }

  const unusualBehavior = behavioralRows.filter(
    (row) => row.available && (row.newDevice || row.newLocation || (row.behavioralScore || 0) >= 70),
  ).length;
  if (unusualBehavior) {
    highlights.push('Several users show significant behavioral deviation.');
  }

  if (kpis.criticalOpenAlerts > 0) {
    highlights.push('Critical alerts require immediate investigation.');
  } else if (kpis.openAlerts > 0) {
    highlights.push('Open alerts are present and should be reviewed.');
  }

  if (kpis.fraudSuspected > 0) {
    highlights.push(`${kpis.fraudSuspected} transaction(s) have elevated fraud probability.`);
  }

  if (!aiAvailable) {
    return {
      available: false,
      summary: 'AI insights currently unavailable.',
      highlights: [],
      notice:
        'AI analysis temporarily unavailable. Rule-based risk monitoring remains active.',
    };
  }

  if (!highlights.length) {
    highlights.push('No elevated risk patterns were identified in the selected period.');
  }

  return {
    available: true,
    summary: highlights[0],
    highlights,
  };
}

function buildRecentActivity(transactions, audits, canViewUsers) {
  const events = [];

  for (const item of transactions.slice(0, 40)) {
    if (HIGH_RISK_LEVELS.includes(item.riskScore?.riskLevel)) {
      events.push({
        id: `tx-${item.id}`,
        type: item.riskScore.riskLevel === 'CRITICAL'
          ? 'CRITICAL_TRANSACTION'
          : 'HIGH_RISK_TRANSACTION',
        message: `${item.riskScore.riskLevel === 'CRITICAL' ? 'Critical' : 'High-risk'} transaction detected`,
        transactionId: item.id,
        timestamp: item.timestamp,
      });
    }

    if (isFraudSuspected(item.riskScore)) {
      events.push({
        id: `fraud-${item.id}`,
        type: 'FRAUD_PREDICTION',
        message: 'Fraud prediction generated',
        transactionId: item.id,
        timestamp: item.riskScore?.createdAt || item.timestamp,
      });
    }

    for (const alert of item.alerts || []) {
      events.push({
        id: `alert-${alert.id}`,
        type: alert.status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_GENERATED',
        message: alert.status === 'RESOLVED' ? 'Alert resolved' : 'High-risk alert generated',
        transactionId: item.id,
        timestamp: alert.createdAt,
      });
    }
  }

  for (const audit of audits) {
    const labels = {
      AI_INVESTIGATION: 'Risk investigation completed',
      RECALCULATE_RISK: 'Risk investigation completed',
      CREATE: audit.entity === 'Transaction' ? 'Transaction created' : `${audit.action}`,
    };

    events.push({
      id: `audit-${audit.id}`,
      type: audit.action,
      message: labels[audit.action] || `${audit.action} on ${audit.entity}`,
      transactionId: audit.entity === 'Transaction' ? Number(audit.entityId) : null,
      actor: canViewUsers ? audit.user?.name : null,
      timestamp: audit.createdAt,
    });
  }

  const seen = new Set();
  return events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter((event) => {
      const key = `${event.type}-${event.transactionId}-${event.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}

function serializeTransactionRow(item, canViewUsers) {
  const reasons = flattenReasons(item.riskScore?.reasons);
  return {
    id: item.id,
    timestamp: item.timestamp,
    amount: item.amount,
    currency: item.currency,
    status: item.status,
    vendor: item.vendor ? { id: item.vendor.id, name: item.vendor.name } : null,
    user: canViewUsers
      ? { id: item.user?.id, name: item.user?.name }
      : { id: item.userId, name: 'You' },
    riskScore: item.riskScore?.score ?? null,
    riskLevel: item.riskScore?.riskLevel ?? null,
    fraudProbability: toNumber(item.riskScore?.fraudProbability),
    anomalyScore: toNumber(item.riskScore?.anomalyScore),
    isAnomaly: isAnomaly(item.riskScore),
    reasons,
  };
}

function fraudDistribution(transactions) {
  const buckets = [
    { key: '0-24', min: 0, max: 0.25, count: 0 },
    { key: '25-49', min: 0.25, max: 0.5, count: 0 },
    { key: '50-74', min: 0.5, max: 0.75, count: 0 },
    { key: '75-100', min: 0.75, max: 1.01, count: 0 },
  ];
  let scored = 0;

  for (const item of transactions) {
    const probability = toNumber(item.riskScore?.fraudProbability);
    if (probability == null) continue;
    scored += 1;
    const bucket = buckets.find((entry) => probability >= entry.min && probability < entry.max);
    if (bucket) bucket.count += 1;
  }

  return {
    available: scored > 0,
    scored,
    buckets: buckets.map((bucket) => ({
      label: bucket.key,
      count: bucket.count,
      percent: percent(bucket.count, scored),
    })),
  };
}

async function getOverview(user, query = {}) {
  const filters = parseFilters(query, user);
  const staff = isStaff(user);
  const comparisonWindow = previousRange(filters.from, filters.to);
  const take = staff ? 5000 : 2000;

  const [transactions, previousTransactions, audits, vendors, aiAvailable] = await Promise.all([
    loadFilteredTransactions(filters, { take, role: user.role }),
    comparisonWindow
      ? loadFilteredTransactions({ ...filters, from: comparisonWindow.from, to: comparisonWindow.to }, { take, role: user.role })
      : Promise.resolve(null),
    prisma.auditLog.findMany({
      where: staff ? {} : { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    staff
      ? prisma.vendor.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 200,
        })
      : prisma.vendor.findMany({
          where: { transactions: { some: { userId: user.id } } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 200,
        }),
    checkAiHealth(),
  ]);

  const kpis = kpiFromTransactions(transactions);
  const previousKpis = previousTransactions ? kpiFromTransactions(previousTransactions) : null;
  const shap = buildShapSummary(transactions, staff);
  const behavioralRows = buildBehavioralRows(transactions, staff);
  const anomalyRows = transactions.filter((item) => isAnomaly(item.riskScore)).slice(0, 8);
  const fraudRows = transactions
    .filter((item) => isFraudSuspected(item.riskScore))
    .sort(
      (a, b) =>
        (toNumber(b.riskScore?.fraudProbability) || 0)
        - (toNumber(a.riskScore?.fraudProbability) || 0),
    )
    .slice(0, 8);
  const threatEvents = transactions
    .filter((item) => HIGH_RISK_LEVELS.includes(item.riskScore?.riskLevel))
    .slice(0, 12)
    .map((item) => serializeTransactionRow(item, staff));

  const alertItems = transactions
    .flatMap((item) =>
      (item.alerts || []).map((alert) => ({
        ...alert,
        transactionId: item.id,
        vendor: item.vendor?.name || null,
      })),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const alertCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const alertStatusCounts = {
    OPEN: 0,
    INVESTIGATING: 0,
    RESOLVED: 0,
    DISMISSED: 0,
  };
  for (const alert of alertItems) {
    if (alertCounts[alert.severity] != null) alertCounts[alert.severity] += 1;
    if (alertStatusCounts[alert.status] != null) {
      alertStatusCounts[alert.status] += 1;
    }
  }

  const anomalyScores = transactions
    .map((item) => toNumber(item.riskScore?.anomalyScore))
    .filter((value) => value != null);

  return {
    generatedAt: new Date().toISOString(),
    role: user.role,
    filters: {
      from: filters.from,
      to: filters.to,
      riskLevel: filters.riskLevel,
      status: filters.status,
      vendorId: filters.vendorId,
      riskType: filters.riskType,
    },
    filterOptions: { vendors },
    comparisonAvailable: Boolean(previousKpis && previousKpis.totalTransactions > 0),
    kpis: buildKpiPayload(kpis, previousKpis),
    trend: buildTrend(transactions),
    riskDistribution: buildDistribution(transactions),
    scoreDistribution: buildScoreDistribution(transactions),
    threatMonitor: threatEvents,
    alertCenter: {
      counts: alertCounts,
      statusCounts: alertStatusCounts,
      recent: alertItems.slice(0, 8),
    },
    behavioral: {
      rows: behavioralRows,
      insufficient: behavioralRows.length === 0,
    },
    anomaly: {
      aiAvailable,
      total: kpis.anomaliesDetected,
      rate: percent(kpis.anomaliesDetected, kpis.totalTransactions),
      averageScore: anomalyScores.length
        ? Math.round(anomalyScores.reduce((sum, value) => sum + value, 0) / anomalyScores.length)
        : null,
      recent: anomalyRows.map((item) => serializeTransactionRow(item, staff)),
      notice: aiAvailable
        ? null
        : 'AI analysis temporarily unavailable. Rule-based risk monitoring remains active.',
    },
    fraud: {
      aiAvailable,
      suspected: kpis.fraudSuspected,
      distribution: fraudDistribution(transactions),
      recent: fraudRows.map((item) => serializeTransactionRow(item, staff)),
      notice: aiAvailable
        ? null
        : 'AI analysis temporarily unavailable. Rule-based risk monitoring remains active.',
    },
    shap,
    vendors: buildVendorOverview(transactions, staff),
    highRiskUsers: buildHighRiskUsers(transactions, staff),
    insights: buildInsights({
      kpis,
      comparison: previousKpis,
      shap,
      behavioralRows,
      aiAvailable,
    }),
    recentActivity: buildRecentActivity(transactions, audits, staff),
    capabilities: {
      canInvestigate: staff,
      canManageAlerts: staff,
      canViewUsers: staff,
      canViewVendors: staff,
      canViewShap: staff,
    },
  };
}

async function getHighRiskTransactions(user, query = {}) {
  const filters = parseFilters(query, user);
  const staff = isStaff(user);
  const search = String(query.search || '').trim().toLowerCase();
  const tableRiskLevel = ['HIGH', 'CRITICAL'].includes(query.tableRiskLevel)
    ? query.tableRiskLevel
    : null;
  const tableStatus = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].includes(query.tableStatus)
    ? query.tableStatus
    : null;
  const sortKey = ['timestamp', 'amount', 'riskScore', 'fraudProbability', 'id'].includes(query.sort)
    ? query.sort
    : 'riskScore';
  const sortDir = query.dir === 'asc' ? 1 : -1;
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 50);

  const transactions = (await loadFilteredTransactions(filters, { take: 5000, role: user.role }))
    .filter((item) => HIGH_RISK_LEVELS.includes(item.riskScore?.riskLevel))
    .filter((item) => (tableRiskLevel ? item.riskScore?.riskLevel === tableRiskLevel : true))
    .filter((item) => (tableStatus ? item.status === tableStatus : true))
    .filter((item) => {
      if (!search) return true;
      return [
        String(item.id),
        item.vendor?.name,
        item.user?.name,
        item.status,
        item.riskScore?.riskLevel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .sort((a, b) => {
      const read = (item) => {
        if (sortKey === 'amount') return Number(item.amount);
        if (sortKey === 'riskScore') return Number(item.riskScore?.score || 0);
        if (sortKey === 'fraudProbability') return toNumber(item.riskScore?.fraudProbability) || 0;
        if (sortKey === 'id') return item.id;
        return new Date(item.timestamp).getTime();
      };
      return (read(a) - read(b)) * sortDir;
    });

  const total = transactions.length;
  const start = (page - 1) * limit;
  const items = transactions.slice(start, start + limit).map((item) => serializeTransactionRow(item, staff));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getSummary(user, query = {}) {
  const overview = await getOverview(user, query);
  return {
    totalTransactions: overview.kpis.totalTransactions.value,
    highRiskTransactions: overview.kpis.highRiskTransactions.value,
    criticalRiskTransactions: overview.kpis.criticalRisk.value,
    openAlerts: overview.kpis.openAlerts.value,
    fraudSuspected: overview.kpis.fraudSuspected.value,
    anomaliesDetected: overview.kpis.anomaliesDetected.value,
  };
}

async function getRiskTrends(user, query = {}) {
  const overview = await getOverview(user, query);
  return overview.trend;
}

async function getRecentTransactions(user, query = {}) {
  const filters = parseFilters(query, user);
  const staff = isStaff(user);
  const transactions = await loadFilteredTransactions(filters, { take: 10, role: user.role });
  return transactions.slice(0, 10).map((item) => serializeTransactionRow(item, staff));
}

async function getRecentAlerts(user, query = {}) {
  const overview = await getOverview(user, query);
  return overview.alertCenter.recent;
}

const HIGH_RISK_BAND_RANK = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
const ALERT_STATUS_RANK = { OPEN: 4, INVESTIGATING: 3, RESOLVED: 2, DISMISSED: 1 };
const FRAUD_THRESHOLD = FRAUD_SUSPECTED_THRESHOLD;

function worstAlertStatus(alerts) {
  if (!Array.isArray(alerts) || !alerts.length) return 'NONE';
  let worst = 0;
  let status = 'NONE';
  for (const alert of alerts) {
    const rank = ALERT_STATUS_RANK[alert.status] || 0;
    if (rank > worst) {
      worst = rank;
      status = alert.status;
    }
  }
  return status;
}

// Returns the most actionable alert (OPEN > INVESTIGATING > RESOLVED > DISMISSED)
// so investigation rows can link directly to alert triage actions.
function worstAlert(alerts) {
  if (!Array.isArray(alerts) || !alerts.length) return null;
  let worst = null;
  let worstRank = 0;
  for (const alert of alerts) {
    const rank = ALERT_STATUS_RANK[alert.status] || 0;
    if (rank > worstRank) {
      worstRank = rank;
      worst = alert;
    }
  }
  return worst;
}

function buildInvestigationQueue(transactions, staff) {
  const queue = transactions
    .filter((item) =>
      ['CRITICAL', 'HIGH', 'MEDIUM'].includes(item.riskScore?.riskLevel),
    )
    .map((item) => {
      const alert = worstAlert(item.alerts);
      return {
        ...serializeTransactionRow(item, staff),
        transactionId: item.id,
        alertId: alert ? alert.id : null,
        alertStatus: worstAlertStatus(item.alerts),
      };
    })
    .sort((a, b) => {
      const bandA = HIGH_RISK_BAND_RANK[a.riskLevel] || 0;
      const bandB = HIGH_RISK_BAND_RANK[b.riskLevel] || 0;
      if (bandA !== bandB) return bandB - bandA;
      const scoreA = Number(a.riskScore) || 0;
      const scoreB = Number(b.riskScore) || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 25);
  return queue;
}

function buildAttentionAlerts(transactions) {
  const items = [];
  for (const item of transactions) {
    if (!item.alerts || !item.alerts.length) continue;
    for (const alert of item.alerts) {
      if (!['CRITICAL', 'HIGH'].includes(alert.severity)) continue;
      if (!['OPEN', 'INVESTIGATING'].includes(alert.status)) continue;
      items.push({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        type: alert.type,
        status: alert.status,
        createdAt: alert.createdAt,
        transactionId: item.id,
        amount: item.amount,
        currency: item.currency,
        vendor: item.vendor?.name || null,
        user: item.user?.name || null,
        riskScore: item.riskScore?.score ?? null,
        riskLevel: item.riskScore?.riskLevel ?? null,
      });
    }
  }
  return items
    .sort((a, b) => {
      const bandA = HIGH_RISK_BAND_RANK[a.severity] || 0;
      const bandB = HIGH_RISK_BAND_RANK[b.severity] || 0;
      if (bandA !== bandB) return bandB - bandA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 20);
}

function buildFraudPredictionSummary(transactions, staff) {
  const suspected = transactions.filter((item) =>
    isFraudSuspected(item.riskScore),
  );
  const fraudScores = suspected
    .map((item) => toNumber(item.riskScore?.fraudProbability))
    .filter((v) => v != null);
  const averageProbability = fraudScores.length
    ? Number((fraudScores.reduce((a, b) => a + b, 0) / fraudScores.length).toFixed(4))
    : null;

  const recent = suspected
    .sort(
      (a, b) =>
        (toNumber(b.riskScore?.fraudProbability) || 0)
        - (toNumber(a.riskScore?.fraudProbability) || 0),
    )
    .slice(0, 8)
    .map((item) => serializeTransactionRow(item, staff));

  return {
    highProbabilityCount: suspected.length,
    averageProbability,
    recent,
  };
}

function buildAnomalySummary(transactions, staff) {
  const anomalous = transactions.filter((item) => isAnomaly(item.riskScore));
  const scores = anomalous
    .map((item) => toNumber(item.riskScore?.anomalyScore))
    .filter((v) => v != null);
  const averageScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  const recent = anomalous
    .sort(
      (a, b) =>
        (toNumber(b.riskScore?.anomalyScore) || 0)
        - (toNumber(a.riskScore?.anomalyScore) || 0),
    )
    .slice(0, 8)
    .map((item) => serializeTransactionRow(item, staff));
  return {
    count: anomalous.length,
    averageAnomalyScore: averageScore,
    recent,
  };
}

function buildBehavioralInsights(transactions, canViewUsers) {
  const rows = buildBehavioralRows(transactions, canViewUsers);
  const categories = {
    unusualAmount: 0,
    newDevice: 0,
    newLocation: 0,
    unusualTime: 0,
    highFrequency: 0,
    unusualVendor: 0,
  };
  for (const row of rows) {
    if (!row.available) continue;
    if ((row.amountDeviation ?? 1) >= 2) categories.unusualAmount += 1;
    if (row.newDevice) categories.newDevice += 1;
    if (row.newLocation) categories.newLocation += 1;
    if (row.unusualTime) categories.unusualTime += 1;
    if ((row.transactionFrequency ?? 0) >= 8) categories.highFrequency += 1;
    if (row.unusualVendor) categories.unusualVendor += 1;
  }
  return {
    rows,
    insufficient: rows.length === 0,
    categories,
  };
}

function buildAiInsights(transactions, previousKpis, staff) {
  const scored = transactions.filter((item) => item.riskScore);

  const highestRisk = scored.length
    ? scored.reduce((a, b) =>
        Number(a.riskScore.score) >= Number(b.riskScore.score) ? a : b,
      )
    : null;

  const fraudRows = scored.filter((item) =>
    Number.isFinite(toNumber(item.riskScore?.fraudProbability)),
  );
  const highestFraud = fraudRows.length
    ? fraudRows.reduce((a, b) =>
        (toNumber(a.riskScore.fraudProbability) || 0)
        >= (toNumber(b.riskScore.fraudProbability) || 0)
          ? a
          : b,
      )
    : null;

  const vendorMap = new Map();
  for (const item of transactions) {
    if (!item.vendor) continue;
    const entry = vendorMap.get(item.vendor.id) || {
      vendorId: item.vendor.id,
      vendor: item.vendor.name,
      total: 0,
      scoreSum: 0,
      scored: 0,
      highCount: 0,
    };
    entry.total += 1;
    if (item.riskScore) {
      entry.scoreSum += Number(item.riskScore.score || 0);
      entry.scored += 1;
      if (HIGH_RISK_LEVELS.includes(item.riskScore.riskLevel)) entry.highCount += 1;
    }
    vendorMap.set(item.vendor.id, entry);
  }
  const vendorSorted = [...vendorMap.values()]
    .map((v) => ({
      ...v,
      averageRisk: v.scored ? Math.round(v.scoreSum / v.scored) : 0,
      highShare: percent(v.highCount, v.total),
    }))
    .sort((a, b) => b.averageRisk - a.averageRisk);
  const mostSuspiciousVendor = vendorSorted[0] || null;

  let largestRiskIncrease = null;
  if (previousKpis) {
    const currentHigh = HIGH_RISK_LEVELS.includes('HIGH')
      ? previousKpis.highRiskTransactions
      : 0;
    const currentCritical = previousKpis.criticalRiskTransactions;
    const previousTotal = previousKpis.totalTransactions;
    if (previousTotal > 0 && transactions.length > 0) {
      const currentHighCriticalRatio = percent(
        currentHigh + currentCritical,
        previousTotal,
      ) || 0;
      const actualHigh = transactions.filter(
        (t) => t.riskScore?.riskLevel === 'HIGH',
      ).length;
      const actualCritical = transactions.filter(
        (t) => t.riskScore?.riskLevel === 'CRITICAL',
      ).length;
      const actualRatio = percent(
        actualHigh + actualCritical,
        transactions.length,
      ) || 0;
      const delta = Number((actualRatio - currentHighCriticalRatio).toFixed(1));
      if (Number.isFinite(delta) && Math.abs(delta) > 0.1) {
        largestRiskIncrease = {
          deltaPercent: delta,
          direction: delta > 0 ? 'UP' : 'DOWN',
        };
      }
    }
  }

  const behavioralRows = buildBehavioralRows(transactions, staff);
  const mostUnusual = behavioralRows
    .filter((r) => r.available)
    .sort(
      (a, b) => Number(b.behavioralScore || 0) - Number(a.behavioralScore || 0),
    )[0] || null;

  const serializeTransaction = (item) =>
    item ? serializeTransactionRow(item, staff) : null;

  return {
    highestRiskTransaction: highestRisk
      ? {
          entityType: 'TRANSACTION',
          entityId: highestRisk.id,
          label: `Transaction #${highestRisk.id}`,
          score: highestRisk.riskScore?.score ?? null,
          level: highestRisk.riskScore?.riskLevel ?? null,
          transaction: serializeTransaction(highestRisk),
        }
      : null,
    highestFraudProbability: highestFraud
      ? {
          entityType: 'TRANSACTION',
          entityId: highestFraud.id,
          label: `Transaction #${highestFraud.id}`,
          probability: toNumber(highestFraud.riskScore?.fraudProbability),
          transaction: serializeTransaction(highestFraud),
        }
      : null,
    mostSuspiciousVendor: mostSuspiciousVendor
      ? {
          entityType: 'VENDOR',
          entityId: mostSuspiciousVendor.vendorId,
          label: mostSuspiciousVendor.vendor,
          averageRisk: mostSuspiciousVendor.averageRisk,
          highSharePercent: mostSuspiciousVendor.highShare,
        }
      : null,
    largestRiskIncrease,
    mostUnusualUserBehavior: mostUnusual
      ? {
          entityType: 'USER',
          entityId: mostUnusual.user?.id ?? null,
          label: mostUnusual.user?.name ?? 'User',
          behavioralScore: mostUnusual.behavioralScore,
          riskLevel: mostUnusual.riskLevel,
          transactionId: mostUnusual.transactionId,
        }
      : null,
  };
}

async function getAdminOverview(user, query = {}) {
  const baseOverview = await getOverview(user, query);
  const staff = isStaff(user);

  const vendorOverview = buildVendorOverview(
    await loadFilteredTransactions(parseFilters(query, user), {
      take: staff ? 5000 : 2000,
    }),
    staff,
  );
  const highRiskVendorCount = vendorOverview.filter((v) =>
    HIGH_RISK_LEVELS.includes(v.riskLevel),
  ).length;

  const extraResults = await Promise.allSettled([
    (async () => {
      const userService = require('./userService');
      return userService.getUserStats();
    })(),
    (async () => {
      const systemHealth = require('./systemHealthService');
      return systemHealth.checkAll();
    })(),
  ]);

  const userStats = extraResults[0].status === 'fulfilled'
    ? extraResults[0].value
    : {
        total: 0,
        byRole: { ADMIN: 0, ANALYST: 0, USER: 0 },
        recent: [],
      };

  const systemHealth = extraResults[1].status === 'fulfilled'
    ? extraResults[1].value
    : {
        ruleEngine: 'UNAVAILABLE',
        behavioral: 'UNAVAILABLE',
        isolationForest: 'UNAVAILABLE',
        xgboost: 'UNAVAILABLE',
        shap: 'UNAVAILABLE',
        aiInvestigationAgent: 'UNAVAILABLE',
      };

  return {
    ...baseOverview,
    userStats,
    systemHealth,
    highRiskVendorCount,
  };
}

async function getAnalystOverview(user, query = {}) {
  const staff = isStaff(user);
  const filters = parseFilters(query, user);
  const comparisonWindow = previousRange(filters.from, filters.to);
  const take = staff ? 5000 : 2000;

  const [transactions, previousTransactions, aiAvailable] = await Promise.all([
    loadFilteredTransactions(filters, { take }),
    comparisonWindow
      ? loadFilteredTransactions(
          { ...filters, from: comparisonWindow.from, to: comparisonWindow.to },
          { take },
        )
      : Promise.resolve(null),
    checkAiHealth(),
  ]);

  const baseOverview = await getOverview(user, query);
  const previousKpis = previousTransactions
    ? kpiFromTransactions(previousTransactions)
    : null;

  return {
    ...baseOverview,
    investigationQueue: buildInvestigationQueue(transactions, staff),
    attentionAlerts: buildAttentionAlerts(transactions),
    fraudPredictionSummary: buildFraudPredictionSummary(transactions, staff),
    anomalySummary: buildAnomalySummary(transactions, staff),
    behavioralInsights: buildBehavioralInsights(transactions, staff),
    aiInsights: buildAiInsights(transactions, previousKpis, staff),
    aiAvailable,
  };
}

module.exports = {
  getOverview,
  getHighRiskTransactions,
  getSummary,
  getRiskTrends,
  getRecentTransactions,
  getRecentAlerts,
  parseFilters,
  getAdminOverview,
  getAnalystOverview,
};
