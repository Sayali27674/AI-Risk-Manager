module.exports = {
  calculateRiskScore: (transaction) => {
    let riskScore = 0;

    // Example rules for risk scoring
    if (transaction.amount > 10000) {
      riskScore += 30; // High amount
    }
    if (transaction.isInternational) {
      riskScore += 20; // International transaction
    }
    if (transaction.vendorRiskLevel === 'HIGH') {
      riskScore += 50; // High-risk vendor
    }

    // Ensure risk score is within the range of 0-100
    riskScore = Math.min(Math.max(riskScore, 0), 100);

    return riskScore;
  },

  getRiskLevel: (score) => {
    if (score <= 30) {
      return 'LOW';
    } else if (score <= 60) {
      return 'MEDIUM';
    } else if (score <= 80) {
      return 'HIGH';
    } else {
      return 'CRITICAL';
    }
  }
};