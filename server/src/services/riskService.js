const prisma = require('../models/prisma');
const aiService = require('./aiService');
const behaviorService = require('./behaviorService');
const socketService = require('./socketService');

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

function combineAvailableScores({
  ruleScore,
  anomalyScore,
  fraudProbability,
  behavioralScore,
}) {
  // Defaults preserve the existing rule/anomaly/fraud weighting ratio.
  // Behavioral risk is optional and normalized in only when available.
  const weights = {
    rule: Number(process.env.RULE_SCORE_WEIGHT ?? 0.4),
    anomaly: Number(process.env.ANOMALY_SCORE_WEIGHT ?? 0.25),
    fraud: Number(process.env.FRAUD_SCORE_WEIGHT ?? 0.35),
    behavior: Number(process.env.BEHAVIOR_SCORE_WEIGHT ?? 0.2),
  };

  const components = [
    [ruleScore, weights.rule],
    [anomalyScore, weights.anomaly],
    [
      fraudProbability == null ? null : fraudProbability * 100,
      weights.fraud,
    ],
    [behavioralScore, weights.behavior],
  ].filter(([score, weight]) =>
    Number.isFinite(score) && Number.isFinite(weight) && weight > 0,
  );

  if (!components.length) return 0;

  const weightTotal = components.reduce((sum, [, weight]) => sum + weight, 0);
  const combined = components.reduce(
    (sum, [score, weight]) => sum + score * weight,
    0,
  ) / weightTotal;

  return clamp(combined);
}

function historyStats(transaction, history) {
  const amount = Number(transaction.amount);
  const transactionTime = new Date(transaction.timestamp).getTime();
  const averageUserAmount = history.length
    ? history.reduce((total, item) => total + Number(item.amount), 0) /
        history.length
    : 0;
  const recentTransactionCount = history.filter((item) => {
    const difference = Math.abs(
      transactionTime - new Date(item.timestamp).getTime(),
    );

    return difference <= 5 * 60 * 1000;
  }).length;

  return {
    averageUserAmount,
    amountDeviation:
      averageUserAmount > 0
        ? Math.abs(amount - averageUserAmount) / averageUserAmount
        : 0,
    recentTransactionCount,
    transactionFrequency: history.length,
    isNewDevice:
      history.length > 0 &&
      !history.some((item) => item.deviceId === transaction.deviceId),
    isNewLocation:
      history.length > 0 &&
      !history.some((item) => item.location === transaction.location),
  };
}

function buildAnomalyFeatures(transaction, stats) {
  const hour = new Date(transaction.timestamp).getHours();

  return {
    amount: Number(transaction.amount),
    average_user_amount: Number(stats.averageUserAmount || 0),
    amount_deviation: Number(stats.amountDeviation || 0),
    transaction_frequency: Number(stats.transactionFrequency || 0),
    hour,
    is_new_device: Boolean(stats.isNewDevice),
    is_new_location: Boolean(stats.isNewLocation),
    vendor_risk_score:
      CONFIG.vendorScores[transaction.vendor?.riskLevel] || 0,
    recent_transaction_count: Number(stats.recentTransactionCount || 0),
  };
}

function buildFraudFeatures(transaction, stats) {
  return {
    amount: Number(transaction.amount),
    average_user_amount: Number(stats.averageUserAmount || 0),
    amount_deviation: Number(stats.amountDeviation || 0),
    transaction_frequency: Number(stats.transactionFrequency || 0),
    transaction_hour: new Date(transaction.timestamp).getHours(),
    recent_transaction_count: Number(stats.recentTransactionCount || 0),
    transaction_type: transaction.transactionType,
  };
}

function calculateRuleRisk(transaction, stats) {
  const reasons = [];
  let score = 0;
  const amount = Number(transaction.amount);

  if (amount >= CONFIG.highAmount) {
    score += 20;
    reasons.push('Transaction amount exceeds the high-value threshold');
  }

  const vendorScore = CONFIG.vendorScores[transaction.vendor.riskLevel] || 0;
  if (vendorScore > 0) {
    score += vendorScore;
    reasons.push(
      `Vendor has ${transaction.vendor.riskLevel.toLowerCase()} risk classification`,
    );
  }

  if (stats.isNewDevice) {
    score += CONFIG.newDevice;
    reasons.push('New device detected for this user');
  }

  if (stats.isNewLocation) {
    score += CONFIG.unusualLocation;
    reasons.push('Unusual transaction location detected');
  }

  const hour = new Date(transaction.timestamp).getHours();
  if (hour < 5 || hour >= 23) {
    score += CONFIG.unusualTime;
    reasons.push('Transaction occurred at an unusual time');
  }

  if (stats.recentTransactionCount >= 2) {
    score += CONFIG.rapidTransactions;
    reasons.push('Multiple transactions detected within a short period');
  }

  if (
    stats.transactionFrequency >= 3 &&
    stats.averageUserAmount > 0 &&
    amount >= stats.averageUserAmount * 3 &&
    amount - stats.averageUserAmount >= 5000
  ) {
    score += CONFIG.amountDeviation;
    reasons.push(
      "Transaction amount is significantly higher than the user's normal amount",
    );
  }

  return {
    score: clamp(score),
    reasons,
  };
}

async function calculateAndPersistRisk(transactionId) {
  const parsedTransactionId = Number(transactionId);
  const transaction = await prisma.transaction.findUnique({
    where: { id: parsedTransactionId },
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

  const stats = historyStats(transaction, history);
  const anomalyFeatures = buildAnomalyFeatures(transaction, stats);
  const fraudFeatures = buildFraudFeatures(transaction, stats);
  const ruleResult = calculateRuleRisk(transaction, stats);

  let anomalyScore = null;
  let fraudProbability = null;
  let modelVersion = 'rules-v1';
  let anomalyReason = null;
  let fraudReason = null;
  let fraudExplanation = null;
  let behaviorResult = null;

  try {
    behaviorResult = await behaviorService.analyzeTransactionBehavior(
      transaction.id,
    );
  } catch (error) {
    console.error('Behavioral analysis unavailable:', error.message);
  }

  try {
    const prediction = await aiService.predictAnomaly(anomalyFeatures);

    anomalyScore = prediction.anomaly_score;
    modelVersion = prediction.model_version || modelVersion;

    if (prediction.is_anomaly) {
      anomalyReason =
        "Transaction behavior is significantly different from the user's historical pattern.";
    }
  } catch (error) {
    console.error('Anomaly AI service unavailable:', error.message);
  }

  try {
    const prediction = await aiService.predictFraud(fraudFeatures);

    fraudProbability = prediction.fraud_probability;
    modelVersion = prediction.model_version || modelVersion;
    fraudExplanation = prediction.explanation || null;

    if (prediction.is_fraud) {
      fraudReason =
        'XGBoost fraud model classified this transaction as likely fraud.';
    }
  } catch (error) {
    console.error('Fraud AI service unavailable:', error.message);
  }

  const finalScore = combineAvailableScores({
    ruleScore: ruleResult.score,
    anomalyScore,
    fraudProbability,
    behavioralScore: behaviorResult?.available
      ? behaviorResult.behavioralScore
      : null,
  });
  const riskLevel = getRiskLevel(finalScore);
  const reasons = {
    rule_reasons: ruleResult.reasons,
    anomaly_reasons: anomalyReason ? [anomalyReason] : [],
    fraud_reasons: fraudReason ? [fraudReason] : [],
    behavior: behaviorResult || {
      available: false,
      reason: 'Behavioral analysis unavailable',
    },
    shap_factors: fraudExplanation?.top_factors || [],
  };

  // Capture previous risk level before the upsert so we can emit risk:updated accurately
  const existingScore = await prisma.riskScore.findUnique({
    where: { transactionId: transaction.id },
    select: { score: true, riskLevel: true },
  });
  const previousRiskLevel = existingScore?.riskLevel ?? null;
  const isRecalculation = existingScore !== null;

  await prisma.riskScore.upsert({
    where: { transactionId: transaction.id },
    update: {
      score: finalScore,
      riskLevel,
      ruleScore: ruleResult.score,
      anomalyScore,
      fraudProbability,
      modelVersion,
      reasons,
    },
    create: {
      transactionId: transaction.id,
      score: finalScore,
      riskLevel,
      ruleScore: ruleResult.score,
      anomalyScore,
      fraudProbability,
      modelVersion,
      reasons,
    },
  });

  // Emit risk:updated when recalculating an existing score
  if (isRecalculation) {
    socketService.emitRiskUpdated({
      transactionId: transaction.id,
      previousRiskLevel,
      newRiskLevel: riskLevel,
      newRiskScore: finalScore,
      userId: transaction.userId,
    });
  }

  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    const existingAlert = await prisma.alert.findFirst({
      where: {
        transactionId: transaction.id,
        severity: riskLevel,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
    });

    if (!existingAlert) {
      const newAlert = await prisma.alert.create({
        data: {
          transactionId: transaction.id,
          type: `${riskLevel}_RISK`,
          severity: riskLevel,
          message: `Transaction classified as ${riskLevel.toLowerCase()} risk.`,
          status: 'OPEN',
        },
      });

      // Emit real-time alert only after the DB record is confirmed
      socketService.emitRiskAlert({
        alertId: newAlert.id,
        transactionId: transaction.id,
        severity: riskLevel,
        riskLevel,
        riskScore: finalScore,
        message: newAlert.message,
        userId: transaction.userId,
      });
    }
  }

  return {
    score: finalScore,
    riskLevel,
    ruleScore: ruleResult.score,
    anomalyScore,
    fraudProbability,
    behavioralScore: behaviorResult?.available
      ? behaviorResult.behavioralScore
      : null,
    modelVersion,
    reasons,
  };
}

module.exports = {
  calculateAndPersistRisk,
  getRiskLevel,
  clamp,
  combineAvailableScores,
};

