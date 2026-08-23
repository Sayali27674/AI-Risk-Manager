module.exports = {
  weights: {
    highAmount: 20,
    unusualTime: 10,
    newDevice: 15,
    unusualLocation: 10,
    vendorRisk: {
      LOW: 0,
      MEDIUM: 10,
      HIGH: 20,
      CRITICAL: 30,
    },
    shortBurst: 15,
    highFrequency: 15,
    amountDeviation: 20,
  },

  thresholds: {
    highAmount: 10000,
    shortBurstMinutes: 5,
    shortBurstCount: 3,
    frequencyHours: 1,
    frequencyCount: 10,
    deviationMultiplier: 3,
    minimumDeviation: 5000,
  },
};