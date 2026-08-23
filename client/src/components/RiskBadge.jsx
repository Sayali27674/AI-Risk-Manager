import React from 'react';

const RiskBadge = ({ riskScore }) => {
    let riskLevel;
    let badgeClass;

    if (riskScore >= 0 && riskScore <= 30) {
        riskLevel = 'LOW';
        badgeClass = 'bg-green-500 text-white';
    } else if (riskScore >= 31 && riskScore <= 60) {
        riskLevel = 'MEDIUM';
        badgeClass = 'bg-yellow-500 text-white';
    } else if (riskScore >= 61 && riskScore <= 80) {
        riskLevel = 'HIGH';
        badgeClass = 'bg-orange-500 text-white';
    } else if (riskScore >= 81 && riskScore <= 100) {
        riskLevel = 'CRITICAL';
        badgeClass = 'bg-red-500 text-white';
    } else {
        riskLevel = 'UNKNOWN';
        badgeClass = 'bg-gray-500 text-white';
    }

    return (
        <span className={`px-3 py-1 rounded-full ${badgeClass}`}>
            {riskLevel}
        </span>
    );
};

export default RiskBadge;