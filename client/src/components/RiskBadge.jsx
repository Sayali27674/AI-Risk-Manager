import React from 'react';

const LEVEL_STYLES = {
    LOW: 'bg-emerald-500',
    MEDIUM: 'bg-amber-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
};

const RiskBadge = ({ riskScore, level }) => {
    let riskLevel;
    let badgeClass;

    // Prefer an explicit level (e.g. from the risk analysis API) and fall
    // back to deriving it from a numeric score.
    if (level) {
        riskLevel = level;
        badgeClass = LEVEL_STYLES[level] || 'bg-gray-500';
    } else if (riskScore >= 0 && riskScore <= 30) {
        riskLevel = 'LOW';
        badgeClass = LEVEL_STYLES.LOW;
    } else if (riskScore >= 31 && riskScore <= 60) {
        riskLevel = 'MEDIUM';
        badgeClass = LEVEL_STYLES.MEDIUM;
    } else if (riskScore >= 61 && riskScore <= 80) {
        riskLevel = 'HIGH';
        badgeClass = LEVEL_STYLES.HIGH;
    } else if (riskScore >= 81 && riskScore <= 100) {
        riskLevel = 'CRITICAL';
        badgeClass = LEVEL_STYLES.CRITICAL;
    } else {
        riskLevel = 'UNKNOWN';
        badgeClass = 'bg-gray-500';
    }

    return (
        <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm ${badgeClass}`}
        >
            {riskLevel}
        </span>
    );
};

export default RiskBadge;