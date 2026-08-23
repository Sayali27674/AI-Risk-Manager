// This file defines the rules used for risk scoring.

const riskRules = {
    low: {
        range: [0, 30],
        description: "LOW",
        score: 0
    },
    medium: {
        range: [31, 60],
        description: "MEDIUM",
        score: 1
    },
    high: {
        range: [61, 80],
        description: "HIGH",
        score: 2
    },
    critical: {
        range: [81, 100],
        description: "CRITICAL",
        score: 3
    }
};

const evaluateRiskScore = (score) => {
    if (score >= riskRules.low.range[0] && score <= riskRules.low.range[1]) {
        return riskRules.low;
    } else if (score >= riskRules.medium.range[0] && score <= riskRules.medium.range[1]) {
        return riskRules.medium;
    } else if (score >= riskRules.high.range[0] && score <= riskRules.high.range[1]) {
        return riskRules.high;
    } else if (score >= riskRules.critical.range[0] && score <= riskRules.critical.range[1]) {
        return riskRules.critical;
    } else {
        throw new Error("Invalid score");
    }
};

module.exports = {
    riskRules,
    evaluateRiskScore
};