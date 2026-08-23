const prisma = require('../models/prisma');
const rules = require('./riskRules/rules');

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevel(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

async function buildContext(transaction) {
  const history = await prisma.transaction.findMany({
    where: {
      userId: transaction.userId,
      id: { not: transaction.id },
    },
    select: {
      amount: true,
      timestamp: true,
      deviceId: true,
      location: true,
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  const amounts = history.map((item) => Number(item.amount));

  return {
    history,
    averageAmount: amounts.length
      ? amounts.reduce((sum, value) => sum + value, 0) / amounts.length
      : 0,
    knownDevices: new Set(history.map((item) => item.deviceId)),
    knownLocations: new Set(history.map((item) => item.location)),
  };
}

async function calculateRisk(transaction) {
  const context = await buildContext(transaction);

  const results = [
    rules.amount(transaction, context),
    rules.unusualTime(transaction, context),
    rules.newDevice(transaction, context),
    rules.unusualLocation(transaction, context),
    rules.vendorRisk(transaction, context),
    rules.shortBurst(transaction, context),
    rules.highFrequency(transaction, context),
    rules.amountDeviation(transaction, context),
  ].filter(Boolean);

  const ruleScore = clampScore(
    results.reduce((total, result) => total + result.score, 0),
  );

  return {
    score: ruleScore,
    riskLevel: getRiskLevel(ruleScore),
    ruleScore,
    anomalyScore: null,
    fraudProbability: null,
    modelVersion: 'rules-v1',
    reasons: results.map((result) => result.reason),
  };
}

async function persistRiskScore(transactionId, result) {
  return prisma.riskScore.upsert({
    where: { transactionId },
    update: {
      score: result.score,
      riskLevel: result.riskLevel,
      ruleScore: result.ruleScore,
      anomalyScore: result.anomalyScore,
      fraudProbability: result.fraudProbability,
      modelVersion: result.modelVersion,
      reasons: result.reasons,
    },
    create: {
      transactionId,
      score: result.score,
      riskLevel: result.riskLevel,
      ruleScore: result.ruleScore,
      anomalyScore: result.anomalyScore,
      fraudProbability: result.fraudProbability,
      modelVersion: result.modelVersion,
      reasons: result.reasons,
    },
  });
}

async function syncAlert(transactionId, result) {
  const previous = await prisma.riskScore.findUnique({
    where: { transactionId },
    select: { riskLevel: true },
  });

  const isRisky = ['HIGH', 'CRITICAL'].includes(result.riskLevel);
  const levelChanged = !previous || previous.riskLevel !== result.riskLevel;

  if (isRisky && levelChanged) {
    await prisma.alert.create({
      data: {
        transactionId,
        type: `${result.riskLevel}_RISK`,
        severity: result.riskLevel,
        message: `Transaction classified as ${result.riskLevel.toLowerCase()} risk.`,
        status: 'OPEN',
      },
    });
  }

  if (!isRisky) {
    await prisma.alert.updateMany({
      where: {
        transactionId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
      data: { status: 'RESOLVED' },
    });
  }
}

async function calculateAndPersistRisk(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { vendor: true },
  });

  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await calculateRisk(transaction);

  // Read the previous score before replacing it.
  const previousScore = await prisma.riskScore.findUnique({
    where: { transactionId },
    select: { riskLevel: true },
  });

  await prisma.riskScore.upsert({
    where: { transactionId },
    update: {
      score: result.score,
      riskLevel: result.riskLevel,
      ruleScore: result.ruleScore,
      anomalyScore: null,
      fraudProbability: null,
      modelVersion: result.modelVersion,
      reasons: result.reasons,
    },
    create: {
      transactionId,
      score: result.score,
      riskLevel: result.riskLevel,
      ruleScore: result.ruleScore,
      anomalyScore: null,
      fraudProbability: null,
      modelVersion: result.modelVersion,
      reasons: result.reasons,
    },
  });

  const levelChanged =
    !previousScore || previousScore.riskLevel !== result.riskLevel;

  if (['HIGH', 'CRITICAL'].includes(result.riskLevel) && levelChanged) {
    await prisma.alert.create({
      data: {
        transactionId,
        type: `${result.riskLevel}_RISK`,
        severity: result.riskLevel,
        message: `Transaction classified as ${result.riskLevel.toLowerCase()} risk.`,
        status: 'OPEN',
      },
    });
  }

  if (!['HIGH', 'CRITICAL'].includes(result.riskLevel)) {
    await prisma.alert.updateMany({
      where: {
        transactionId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
      data: { status: 'RESOLVED' },
    });
  }

  return result;
}

module.exports = {
  calculateRisk,
  calculateAndPersistRisk,
  getRiskLevel,
  clampScore,
};