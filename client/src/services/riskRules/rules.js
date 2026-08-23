const config = require('./config');

const amount = (transaction) => {
  const value = Number(transaction.amount);

  if (value >= config.thresholds.highAmount) {
    return {
      score: config.weights.highAmount,
      reason: 'Transaction amount exceeds the high-value threshold',
    };
  }

  return null;
};

const unusualTime = (transaction, context) => {
  const hour = new Date(transaction.timestamp).getHours();
  const historicalHours = context.history.map((item) =>
    new Date(item.timestamp).getHours(),
  );

  const isNightTime = hour < 5 || hour >= 23;
  const isNewTime = historicalHours.length > 5 &&
    !historicalHours.some((historicalHour) =>
      Math.abs(historicalHour - hour) <= 2,
    );

  if (isNightTime || isNewTime) {
    return {
      score: config.weights.unusualTime,
      reason: 'Transaction occurred at an unusual time for this user',
    };
  }

  return null;
};

const newDevice = (transaction, context) => {
  if (
    context.history.length > 0 &&
    !context.knownDevices.has(transaction.deviceId)
  ) {
    return {
      score: config.weights.newDevice,
      reason: 'New device detected for this user',
    };
  }

  return null;
};

const unusualLocation = (transaction, context) => {
  if (
    context.history.length > 0 &&
    !context.knownLocations.has(transaction.location)
  ) {
    return {
      score: config.weights.unusualLocation,
      reason: 'Unusual transaction location detected',
    };
  }

  return null;
};

const vendorRisk = (transaction) => {
  const riskLevel = transaction.vendor?.riskLevel || 'LOW';
  const score = config.weights.vendorRisk[riskLevel] || 0;

  if (score > 0) {
    return {
      score,
      reason: `Vendor has ${riskLevel.toLowerCase()} risk classification`,
    };
  }

  return null;
};

const shortBurst = (transaction, context) => {
  const start = new Date(transaction.timestamp).getTime();
  const windowMs = config.thresholds.shortBurstMinutes * 60 * 1000;

  const count = context.history.filter((item) => {
    const time = new Date(item.timestamp).getTime();
    return Math.abs(start - time) <= windowMs;
  }).length;

  if (count + 1 >= config.thresholds.shortBurstCount) {
    return {
      score: config.weights.shortBurst,
      reason: 'Multiple transactions detected within a short period',
    };
  }

  return null;
};

const highFrequency = (transaction, context) => {
  const start = new Date(transaction.timestamp).getTime();
  const windowMs = config.thresholds.frequencyHours * 60 * 60 * 1000;

  const count = context.history.filter((item) => {
    const time = new Date(item.timestamp).getTime();
    return Math.abs(start - time) <= windowMs;
  }).length;

  if (count + 1 >= config.thresholds.frequencyCount) {
    return {
      score: config.weights.highFrequency,
      reason: 'Unusually high transaction frequency detected',
    };
  }

  return null;
};

const amountDeviation = (transaction, context) => {
  if (!context.averageAmount || context.history.length < 3) {
    return null;
  }

  const value = Number(transaction.amount);
  const isLargeDeviation =
    value >= context.averageAmount * config.thresholds.deviationMultiplier &&
    value - context.averageAmount >= config.thresholds.minimumDeviation;

  if (isLargeDeviation) {
    return {
      score: config.weights.amountDeviation,
      reason: "Transaction amount is significantly higher than the user's normal amount",
    };
  }

  return null;
};

module.exports = {
  amount,
  unusualTime,
  newDevice,
  unusualLocation,
  vendorRisk,
  shortBurst,
  highFrequency,
  amountDeviation,
};