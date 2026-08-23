const prisma = require('../models/prisma');

const getDashboardSummary = async () => {
    try {
        const totalTransactions = await prisma.transaction.count();
        const highRiskTransactions = await prisma.transaction.count({
            where: {
                riskScore: {
                    gte: 61
                }
            }
        });
        const criticalRiskTransactions = await prisma.transaction.count({
            where: {
                riskScore: {
                    gte: 81
                }
            }
        });
        const openAlerts = await prisma.alert.count({
            where: {
                status: 'OPEN'
            }
        });
        const recentTransactions = await prisma.transaction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });
        const recentAlerts = await prisma.alert.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        return {
            totalTransactions,
            highRiskTransactions,
            criticalRiskTransactions,
            openAlerts,
            recentTransactions,
            recentAlerts
        };
    } catch (error) {
        throw new Error('Error fetching dashboard summary: ' + error.message);
    }
};

module.exports = {
    getDashboardSummary
};