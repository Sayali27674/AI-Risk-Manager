const prisma = require('../models/prisma');
const behaviorService = require('../services/behaviorService');

function parsePositiveInt(value) {
  const match = String(value ?? '').match(/\d+/);
  const id = match ? Number(match[0]) : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateFilter({ dateFrom, dateTo } = {}) {
  const gte = parseDate(dateFrom);
  const lte = parseDate(dateTo);

  if (!gte && !lte) return {};

  return {
    timestamp: {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    },
  };
}

function riskDateFilter({ dateFrom, dateTo } = {}) {
  const gte = parseDate(dateFrom);
  const lte = parseDate(dateTo);

  if (!gte && !lte) return {};

  return {
    createdAt: {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    },
  };
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function transactionSource(transaction) {
  return transaction ? { type: 'transaction', id: String(transaction.id) } : null;
}

function riskScoreSource(riskScore) {
  return riskScore ? { type: 'risk_score', id: String(riskScore.id) } : null;
}

async function getTransaction({ transactionId }) {
  const id = parsePositiveInt(transactionId);
  if (!id) throw new Error('Invalid transaction ID');

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, category: true, riskLevel: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!transaction) {
    return { found: false, transactionId: id };
  }

  return {
    found: true,
    transaction: {
      id: transaction.id,
      amount: toNumber(transaction.amount),
      currency: transaction.currency,
      vendor: transaction.vendor,
      location: transaction.location,
      deviceId: transaction.deviceId,
      timestamp: transaction.timestamp,
      status: transaction.status,
      user: transaction.user,
      transactionType: transaction.transactionType,
    },
    sources: [transactionSource(transaction)].filter(Boolean),
  };
}

async function getTransactionRisk({ transactionId }) {
  const id = parsePositiveInt(transactionId);
  if (!id) throw new Error('Invalid transaction ID');

  const riskScore = await prisma.riskScore.findUnique({
    where: { transactionId: id },
    include: {
      transaction: { select: { id: true, userId: true } },
    },
  });

  if (!riskScore) {
    return { found: false, transactionId: id };
  }

  const reasons = riskScore.reasons || {};
  return {
    found: true,
    risk: {
      id: riskScore.id,
      transactionId: riskScore.transactionId,
      finalRiskScore: riskScore.score,
      riskLevel: riskScore.riskLevel,
      ruleScore: riskScore.ruleScore,
      anomalyScore: riskScore.anomalyScore,
      fraudProbability: toNumber(riskScore.fraudProbability),
      behavioralScore: reasons.behavior?.available
        ? reasons.behavior.behavioralScore
        : null,
      behavioralAnalysis: reasons.behavior || null,
      shapFactors: Array.isArray(reasons.shap_factors)
        ? reasons.shap_factors.slice(0, 5)
        : [],
      reasons,
      modelVersion: riskScore.modelVersion,
    },
    sources: [
      transactionSource(riskScore.transaction),
      riskScoreSource(riskScore),
      reasons.behavior?.available
        ? { type: 'behavior_analysis', id: String(id) }
        : null,
      Array.isArray(reasons.shap_factors) && reasons.shap_factors.length
        ? { type: 'shap_explanation', id: String(id) }
        : null,
    ].filter(Boolean),
  };
}

async function getUserBehavior({ userId }) {
  const id = parsePositiveInt(userId);
  if (!id) throw new Error('Invalid user ID');

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true },
  });

  if (!user) {
    return { found: false, userId: id };
  }

  const behavior = await behaviorService.getBehaviorProfile(id);
  return {
    found: true,
    user,
    behavior,
    sources: [{ type: 'user', id: String(id) }],
  };
}

async function getHighRiskTransactions(filters = {}) {
  const minScore = Number(filters.minimumRiskScore ?? filters.minScore ?? 70);
  const take = Math.min(Number(filters.limit || 10), 25);
  const vendorId = parsePositiveInt(filters.vendorId);
  const userId = parsePositiveInt(filters.userId);

  const rows = await prisma.riskScore.findMany({
    where: {
      ...(Number.isFinite(minScore) ? { score: { gte: minScore } } : {}),
      ...(filters.riskLevel ? { riskLevel: filters.riskLevel } : {}),
      ...riskDateFilter(filters),
      transaction: {
        ...(vendorId ? { vendorId } : {}),
        ...(userId ? { userId } : {}),
      },
    },
    include: {
      transaction: {
        include: {
          vendor: { select: { id: true, name: true, category: true, riskLevel: true } },
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { score: 'desc' },
    take,
  });

  return {
    transactions: rows.map((row) => ({
      riskScoreId: row.id,
      transactionId: row.transactionId,
      score: row.score,
      riskLevel: row.riskLevel,
      fraudProbability: toNumber(row.fraudProbability),
      anomalyScore: row.anomalyScore,
      behavioralScore: row.reasons?.behavior?.available
        ? row.reasons.behavior.behavioralScore
        : null,
      transaction: {
        id: row.transaction.id,
        amount: toNumber(row.transaction.amount),
        currency: row.transaction.currency,
        timestamp: row.transaction.timestamp,
        status: row.transaction.status,
        vendor: row.transaction.vendor,
        user: row.transaction.user,
      },
    })),
    sources: rows.map((row) => transactionSource(row.transaction)).filter(Boolean),
  };
}

async function getAlerts(filters = {}) {
  const transactionId = parsePositiveInt(filters.transactionId);
  const rows = await prisma.alert.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(transactionId ? { transactionId } : {}),
      createdAt: riskDateFilter(filters).createdAt,
    },
    include: {
      transaction: {
        select: { id: true, amount: true, currency: true, timestamp: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(filters.limit || 10), 25),
  });

  return {
    alerts: rows.map((alert) => ({
      id: alert.id,
      transactionId: alert.transactionId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      createdAt: alert.createdAt,
      transaction: alert.transaction,
    })),
    sources: rows.map((alert) => ({ type: 'alert', id: String(alert.id) })),
  };
}

async function getVendorRisk({ vendorId }) {
  const id = parsePositiveInt(vendorId);
  if (!id) throw new Error('Invalid vendor ID');

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: { id: true, name: true, category: true, country: true, riskLevel: true },
  });

  if (!vendor) {
    return { found: false, vendorId: id };
  }

  const scores = await prisma.riskScore.findMany({
    where: { transaction: { vendorId: id } },
    select: {
      score: true,
      riskLevel: true,
      fraudProbability: true,
      anomalyScore: true,
    },
  });
  const transactionCount = scores.length;
  const averageRisk = transactionCount
    ? Math.round(scores.reduce((sum, row) => sum + row.score, 0) / transactionCount)
    : null;
  const fraudValues = scores
    .map((row) => toNumber(row.fraudProbability))
    .filter((value) => value !== null);

  return {
    found: true,
    vendor,
    stats: {
      transactionCount,
      averageRisk,
      highRiskTransactionCount: scores.filter((row) => row.riskLevel === 'HIGH').length,
      criticalTransactionCount: scores.filter((row) => row.riskLevel === 'CRITICAL').length,
      averageFraudProbability: fraudValues.length
        ? Number((fraudValues.reduce((sum, value) => sum + value, 0) / fraudValues.length).toFixed(4))
        : null,
      averageAnomalyScore: scores.some((row) => row.anomalyScore != null)
        ? Math.round(
            scores
              .filter((row) => row.anomalyScore != null)
              .reduce((sum, row) => sum + row.anomalyScore, 0) /
              scores.filter((row) => row.anomalyScore != null).length,
          )
        : null,
    },
    sources: [{ type: 'vendor', id: String(id) }],
  };
}

async function getRiskTrends(filters = {}) {
  const rows = await prisma.riskScore.findMany({
    where: riskDateFilter(filters),
    select: {
      score: true,
      riskLevel: true,
      fraudProbability: true,
      anomalyScore: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 1000,
  });
  const grouped = new Map();

  for (const row of rows) {
    const date = row.createdAt.toISOString().slice(0, 10);
    if (!grouped.has(date)) {
      grouped.set(date, {
        date,
        transactionCount: 0,
        totalRisk: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
        fraudTotal: 0,
        fraudCount: 0,
        anomalyTotal: 0,
        anomalyCount: 0,
      });
    }

    const entry = grouped.get(date);
    entry.transactionCount += 1;
    entry.totalRisk += row.score;
    if (row.riskLevel === 'HIGH') entry.highRiskCount += 1;
    if (row.riskLevel === 'CRITICAL') entry.criticalRiskCount += 1;
    const fraud = toNumber(row.fraudProbability);
    if (fraud !== null) {
      entry.fraudTotal += fraud;
      entry.fraudCount += 1;
    }
    if (row.anomalyScore !== null && row.anomalyScore !== undefined) {
      entry.anomalyTotal += row.anomalyScore;
      entry.anomalyCount += 1;
    }
  }

  return {
    trends: [...grouped.values()].map((entry) => ({
      date: entry.date,
      transactionCount: entry.transactionCount,
      averageRisk: Math.round(entry.totalRisk / entry.transactionCount),
      highRiskCount: entry.highRiskCount,
      criticalRiskCount: entry.criticalRiskCount,
      averageFraudProbability: entry.fraudCount
        ? Number((entry.fraudTotal / entry.fraudCount).toFixed(4))
        : null,
      averageAnomalyScore: entry.anomalyCount
        ? Math.round(entry.anomalyTotal / entry.anomalyCount)
        : null,
    })),
    sources: [{ type: 'risk_trend', id: 'risk-score-aggregate' }],
  };
}

module.exports = {
  getTransaction,
  getTransactionRisk,
  getUserBehavior,
  getHighRiskTransactions,
  getAlerts,
  getVendorRisk,
  getRiskTrends,
  parsePositiveInt,
};
