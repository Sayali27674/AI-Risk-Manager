const prisma = require('../models/prisma');

const CONFIG = {
  highAmount: 10000,
  vendorScores: {
    LOW: 0,
    MEDIUM: 10,
    HIGH: 20,
    CRITICAL: 30,
  },
  newDevice: 15,
  unusualLocation: 10,
  unusualTime: 10,
  rapidTransactions: 15,
  amountDeviation: 20,
};

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRiskLevel(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

async function calculateAndPersistRisk(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(transactionId) },
    include: { vendor: true },
  });

  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

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
    take: 100,
  });

  const reasons = [];
  let score = 0;
  const amount = Number(transaction.amount);

  if (amount >= CONFIG.highAmount) {
    score += CONFIG.highAmount > 0 ? 20 : 0;
    reasons.push('Transaction amount exceeds the high-value threshold');
  }

  const vendorScore = CONFIG.vendorScores[transaction.vendor.riskLevel] || 0;
  if (vendorScore > 0) {
    score += vendorScore;
    reasons.push(
      `Vendor has ${transaction.vendor.riskLevel.toLowerCase()} risk classification`,
    );
  }

  if (
    history.length > 0 &&
    !history.some((item) => item.deviceId === transaction.deviceId)
  ) {
    score += CONFIG.newDevice;
    reasons.push('New device detected for this user');
  }

  if (
    history.length > 0 &&
    !history.some((item) => item.location === transaction.location)
  ) {
    score += CONFIG.unusualLocation;
    reasons.push('Unusual transaction location detected');
  }

  const hour = new Date(transaction.timestamp).getHours();
  if (hour < 5 || hour >= 23) {
    score += CONFIG.unusualTime;
    reasons.push('Transaction occurred at an unusual time');
  }

  const transactionTime = new Date(transaction.timestamp).getTime();
  const recentCount = history.filter((item) => {
    const difference = Math.abs(
      transactionTime - new Date(item.timestamp).getTime(),
    );

    return difference <= 5 * 60 * 1000;
  }).length;

  if (recentCount >= 2) {
    score += CONFIG.rapidTransactions;
    reasons.push('Multiple transactions detected within a short period');
  }

  if (history.length >= 3) {
    const averageAmount =
      history.reduce((total, item) => total + Number(item.amount), 0) /
      history.length;

    if (
      averageAmount > 0 &&
      amount >= averageAmount * 3 &&
      amount - averageAmount >= 5000
    ) {
      score += CONFIG.amountDeviation;
      reasons.push(
        "Transaction amount is significantly higher than the user's normal amount",
      );
    }
  }

  const finalScore = clamp(score);
  const riskLevel = getRiskLevel(finalScore);

  await prisma.riskScore.upsert({
    where: { transactionId: transaction.id },
    update: {
      score: finalScore,
      riskLevel,
      ruleScore: finalScore,
      anomalyScore: null,
      fraudProbability: null,
      modelVersion: 'rules-v1',
      reasons,
    },
    create: {
      transactionId: transaction.id,
      score: finalScore,
      riskLevel,
      ruleScore: finalScore,
      anomalyScore: null,
      fraudProbability: null,
      modelVersion: 'rules-v1',
      reasons,
    },
  });

  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    const existingAlert = await prisma.alert.findFirst({
      where: {
        transactionId: transaction.id,
        severity: riskLevel,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
    });

    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          transactionId: transaction.id,
          type: `${riskLevel}_RISK`,
          severity: riskLevel,
          message: `Transaction classified as ${riskLevel.toLowerCase()} risk.`,
          status: 'OPEN',
        },
      });
    }
  }

  return {
    score: finalScore,
    riskLevel,
    ruleScore: finalScore,
    anomalyScore: null,
    fraudProbability: null,
    modelVersion: 'rules-v1',
    reasons,
  };
}

module.exports = {
  calculateAndPersistRisk,
  getRiskLevel,
  clamp,
};