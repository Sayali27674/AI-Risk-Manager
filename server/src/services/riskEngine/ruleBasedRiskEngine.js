module.exports = {
    calculateRiskScore: (transaction) => {
        let riskScore = 0;

        // Example rules for risk scoring
        if (transaction.amount > 10000) {
            riskScore += 40; // High amount
        }
        if (transaction.isInternational) {
            riskScore += 30; // International transaction
        }
        if (transaction.vendorRiskLevel === 'HIGH') {
            riskScore += 50; // High-risk vendor
        }
        if (transaction.isSuspicious) {
            riskScore += 60; // Marked as suspicious
        }

        // Normalize risk score to a scale of 0-100
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