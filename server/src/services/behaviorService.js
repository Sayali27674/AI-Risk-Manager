const prisma = require('../models/prisma');

const DEFAULT_INCLUDED_STATUSES = ['PENDING', 'APPROVED', 'FLAGGED'];
const MIN_HISTORY_COUNT = Number(process.env.BEHAVIOR_MIN_HISTORY_COUNT ?? 5);
const HISTORY_LIMIT = Number(process.env.BEHAVIOR_HISTORY_LIMIT ?? 500);

const WEIGHTS = {
  amount: Number(process.env.BEHAVIOR_AMOUNT_WEIGHT ?? 0.3),
  frequency: Number(process.env.BEHAVIOR_FREQUENCY_WEIGHT ?? 0.2),
  time: Number(process.env.BEHAVIOR_TIME_WEIGHT ?? 0.15),
  location: Number(process.env.BEHAVIOR_LOCATION_WEIGHT ?? 0.15),
  device: Number(process.env.BEHAVIOR_DEVICE_WEIGHT ?? 0.1),
  vendor: Number(process.env.BEHAVIOR_VENDOR_WEIGHT ?? 0.1),
};

function includedStatuses() {
  return (process.env.BEHAVIOR_INCLUDED_STATUSES || DEFAULT_INCLUDED_STATUSES.join(','))
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean);
}

function amountOf(transaction) {
  return Number(transaction.amount || 0);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function standardDeviation(values, average) {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function countBy(values) {
  return values.reduce((counts, value) => {
    if (value === null || value === undefined || value === '') return counts;
    counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map());
}

function topEntries(map, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function hoursBetween(start, end) {
  return Math.max(1, (end.getTime() - start.getTime()) / 36e5);
}

function daysBetween(start, end) {
  return Math.max(1, hoursBetween(start, end) / 24);
}

function getUsualHours(hourCounts, historyCount) {
  const minimumCount = Math.max(
    2,
    Math.ceil(historyCount * Number(process.env.BEHAVIOR_USUAL_HOUR_SHARE ?? 0.1)),
  );

  return [...hourCounts.entries()]
    .filter(([, count]) => count >= minimumCount)
    .map(([hour]) => Number(hour))
    .sort((a, b) => a - b);
}

function levelFromScore(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

async function loadHistory(userId, currentTransactionId = null) {
  return prisma.transaction.findMany({
    where: {
      userId: Number(userId),
      status: { in: includedStatuses() },
      ...(currentTransactionId ? { id: { not: Number(currentTransactionId) } } : {}),
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          category: true,
          riskLevel: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: HISTORY_LIMIT,
  });
}

function buildProfile(history) {
  const amounts = history.map(amountOf);
  const timestamps = history.map((item) => new Date(item.timestamp));
  const earliest = new Date(Math.min(...timestamps.map((date) => date.getTime())));
  const latest = new Date(Math.max(...timestamps.map((date) => date.getTime())));
  const averageAmount =
    amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const hourCounts = countBy(
    history.map((item) => new Date(item.timestamp).getHours()),
  );
  const locationCounts = countBy(history.map((item) => item.location));
  const deviceCounts = countBy(history.map((item) => item.deviceId));
  const vendorCounts = countBy(history.map((item) => item.vendor?.name));
  const vendorCategoryCounts = countBy(history.map((item) => item.vendor?.category));
  const typeCounts = countBy(history.map((item) => item.transactionType));
  const spanDays = daysBetween(earliest, latest);
  const spanHours = hoursBetween(earliest, latest);

  return {
    transactionCount: history.length,
    averageAmount: round(averageAmount),
    medianAmount: round(median(amounts)),
    standardDeviationAmount: round(standardDeviation(amounts, averageAmount)),
    maximumAmount: round(Math.max(...amounts)),
    minimumAmount: round(Math.min(...amounts)),
    averageDailyTransactions: round(history.length / spanDays),
    averageHourlyTransactions: round(history.length / spanHours, 4),
    usualTransactionHours: getUsualHours(hourCounts, history.length),
    commonHours: topEntries(hourCounts),
    commonLocations: topEntries(locationCounts),
    knownLocations: locationCounts.size,
    commonDevices: topEntries(deviceCounts),
    knownDevices: deviceCounts.size,
    frequentVendors: topEntries(vendorCounts),
    frequentVendorCount: vendorCounts.size,
    frequentVendorCategories: topEntries(vendorCategoryCounts),
    frequentTransactionTypes: topEntries(typeCounts),
    includedStatuses: includedStatuses(),
  };
}

function insufficient(history) {
  return {
    available: false,
    reason: 'Insufficient historical transaction data',
    minimumHistoryCount: MIN_HISTORY_COUNT,
    historyCount: history.length,
  };
}

async function getBehaviorProfile(userId) {
  const history = await loadHistory(userId);

  if (history.length < MIN_HISTORY_COUNT) {
    return insufficient(history);
  }

  return {
    available: true,
    profile: buildProfile(history),
  };
}

function scoreWeighted(components) {
  const availableComponents = Object.entries(components).filter(
    ([, component]) => component && Number.isFinite(component.score),
  );
  const totalWeight = availableComponents.reduce(
    (sum, [key]) => sum + (WEIGHTS[key] || 0),
    0,
  );

  if (!totalWeight) return 0;

  return Math.round(
    availableComponents.reduce(
      (sum, [key, component]) => sum + component.score * (WEIGHTS[key] || 0),
      0,
    ) / totalWeight,
  );
}

function analyzeAmount(transaction, profile) {
  const currentAmount = amountOf(transaction);
  const ratio = profile.averageAmount > 0 ? currentAmount / profile.averageAmount : 0;
  const zScore =
    profile.standardDeviationAmount > 0
      ? (currentAmount - profile.averageAmount) / profile.standardDeviationAmount
      : 0;
  let score = 0;
  const reasons = [];

  if (ratio >= Number(process.env.BEHAVIOR_AMOUNT_RATIO_HIGH ?? 3)) {
    score = 90;
    reasons.push(
      `Transaction amount is ${round(ratio, 1)}x higher than the user's average transaction amount.`,
    );
  } else if (ratio >= Number(process.env.BEHAVIOR_AMOUNT_RATIO_MEDIUM ?? 2)) {
    score = 65;
    reasons.push(
      `Transaction amount is ${round(ratio, 1)}x higher than the user's average transaction amount.`,
    );
  } else if (zScore >= 2) {
    score = 70;
    reasons.push(
      "Transaction amount is significantly higher than the user's typical transaction amount.",
    );
  }

  return {
    currentAmount: round(currentAmount),
    averageAmount: profile.averageAmount,
    medianAmount: profile.medianAmount,
    standardDeviationAmount: profile.standardDeviationAmount,
    ratioToAverage: round(ratio, 2),
    zScore: round(zScore, 2),
    score,
    unusual: score > 0,
    reasons,
  };
}

function analyzeFrequency(transaction, history, profile) {
  const currentTime = new Date(transaction.timestamp);
  const lastHour = history.filter((item) => {
    const timestamp = new Date(item.timestamp);
    return timestamp < currentTime && currentTime - timestamp <= 36e5;
  }).length;
  const last24Hours = history.filter((item) => {
    const timestamp = new Date(item.timestamp);
    return timestamp < currentTime && currentTime - timestamp <= 24 * 36e5;
  }).length;
  const multiplier = Number(process.env.BEHAVIOR_FREQUENCY_MULTIPLIER ?? 2.5);
  const hourlyMultiplier = Number(
    process.env.BEHAVIOR_HOURLY_FREQUENCY_MULTIPLIER ?? 4,
  );
  let score = 0;
  const reasons = [];

  if (
    profile.averageDailyTransactions > 0 &&
    last24Hours >= Math.max(3, profile.averageDailyTransactions * multiplier)
  ) {
    score = Math.max(score, 80);
    reasons.push(
      `Transaction frequency is unusually high: ${last24Hours} transactions in the last 24 hours versus ${profile.averageDailyTransactions} per day on average.`,
    );
  }

  if (
    profile.averageHourlyTransactions > 0 &&
    lastHour >= Math.max(2, profile.averageHourlyTransactions * hourlyMultiplier)
  ) {
    score = Math.max(score, 70);
    reasons.push(
      `Recent activity is elevated: ${lastHour} transactions in the last hour.`,
    );
  }

  return {
    transactionsLastHour: lastHour,
    transactionsLast24Hours: last24Hours,
    averageDailyTransactions: profile.averageDailyTransactions,
    averageHourlyTransactions: profile.averageHourlyTransactions,
    score,
    unusual: score > 0,
    reasons,
  };
}

function analyzeTime(transaction, profile) {
  const currentHour = new Date(transaction.timestamp).getHours();
  const hasHourProfile = profile.usualTransactionHours.length > 0;
  const unusual = hasHourProfile && !profile.usualTransactionHours.includes(currentHour);

  return {
    currentHour,
    usualTransactionHours: profile.usualTransactionHours,
    score: unusual ? 70 : 0,
    unusual,
    reasons: unusual
      ? ["Transaction occurred outside the user's usual transaction hours."]
      : [],
  };
}

function analyzeLocation(transaction, profile) {
  const known = profile.commonLocations.some(
    (location) => location.value === transaction.location,
  );

  return {
    currentLocation: transaction.location,
    commonLocations: profile.commonLocations.map((location) => location.value),
    score: known ? 0 : 75,
    unusual: !known,
    reasons: known
      ? []
      : ["Transaction location differs from the user's common transaction locations."],
  };
}

function analyzeDevice(transaction, profile) {
  const known = profile.commonDevices.some(
    (device) => device.value === transaction.deviceId,
  );

  return {
    currentDevice: transaction.deviceId,
    knownDevice: known,
    knownDevices: profile.knownDevices,
    score: known ? 0 : 70,
    unusual: !known,
    reasons: known ? [] : ['Transaction was made using a previously unseen device.'],
  };
}

function analyzeVendor(transaction, profile) {
  const vendorName = transaction.vendor?.name;
  const vendorCategory = transaction.vendor?.category;
  const knownVendor = profile.frequentVendors.some(
    (vendor) => vendor.value === vendorName,
  );
  const knownCategory = profile.frequentVendorCategories.some(
    (category) => category.value === vendorCategory,
  );
  const knownType = profile.frequentTransactionTypes.some(
    (type) => type.value === transaction.transactionType,
  );
  const reasons = [];
  let score = 0;

  if (!knownVendor) {
    score += 30;
    reasons.push('Transaction uses a vendor not seen in the user history.');
  }

  if (!knownCategory) {
    score += 40;
    reasons.push('Vendor category differs from the user historical pattern.');
  }

  if (!knownType) {
    score += 30;
    reasons.push('Transaction type differs from the user historical pattern.');
  }

  return {
    currentVendor: vendorName,
    currentVendorCategory: vendorCategory,
    currentTransactionType: transaction.transactionType,
    knownVendor,
    knownVendorCategory: knownCategory,
    knownTransactionType: knownType,
    score: Math.min(100, score),
    unusual: score > 0,
    reasons,
  };
}

async function analyzeTransactionBehavior(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(transactionId) },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          category: true,
          riskLevel: true,
        },
      },
    },
  });

  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const history = await loadHistory(transaction.userId, transaction.id);

  if (history.length < MIN_HISTORY_COUNT) {
    return {
      ...insufficient(history),
      userId: transaction.userId,
      transactionId: transaction.id,
    };
  }

  const profile = buildProfile(history);
  const deviations = {
    amount: analyzeAmount(transaction, profile),
    frequency: analyzeFrequency(transaction, history, profile),
    time: analyzeTime(transaction, profile),
    location: analyzeLocation(transaction, profile),
    device: analyzeDevice(transaction, profile),
    vendor: analyzeVendor(transaction, profile),
  };
  const reasons = Object.values(deviations).flatMap(
    (deviation) => deviation.reasons || [],
  );
  const behavioralScore = scoreWeighted(deviations);

  return {
    available: true,
    userId: transaction.userId,
    transactionId: transaction.id,
    behavioralScore,
    behavioralRiskLevel: levelFromScore(behavioralScore),
    weights: WEIGHTS,
    deviations,
    reasons,
  };
}

module.exports = {
  getBehaviorProfile,
  analyzeTransactionBehavior,
  buildProfile,
  MIN_HISTORY_COUNT,
  WEIGHTS,
  __test: {
    analyzeAmount,
    analyzeFrequency,
    analyzeTime,
    analyzeLocation,
    analyzeDevice,
    analyzeVendor,
    median,
    standardDeviation,
    scoreWeighted,
  },
};
