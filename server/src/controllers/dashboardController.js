const prisma = require('../models/prisma');

async function summary(req, res, next) {
  try {
    const [
      totalTransactions,
      highRiskTransactions,
      criticalRiskTransactions,
      openAlerts,
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.riskScore.count({
        where: { riskLevel: 'HIGH' },
      }),
      prisma.riskScore.count({
        where: { riskLevel: 'CRITICAL' },
      }),
      prisma.alert.count({
        where: {
          status: {
            in: ['OPEN', 'INVESTIGATING'],
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalTransactions,
        highRiskTransactions,
        criticalRiskTransactions,
        openAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function riskTrends(req, res, next) {
  try {
    const scores = await prisma.riskScore.findMany({
      select: {
        score: true,
        riskLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });

    const grouped = new Map();

    for (const item of scores) {
      const date = item.createdAt.toISOString().slice(0, 10);

      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          count: 0,
          averageScore: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        });
      }

      const entry = grouped.get(date);
      entry.count += 1;
      entry.averageScore += Number(item.score);
      entry[item.riskLevel.toLowerCase()] += 1;
    }

    const data = [...grouped.values()].map((entry) => ({
      ...entry,
      averageScore: Math.round(entry.averageScore / entry.count),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recentTransactions(req, res, next) {
  try {
    const data = await prisma.transaction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        currency: true,
        transactionType: true,
        status: true,
        timestamp: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        riskScore: {
          select: {
            score: true,
            riskLevel: true,
          },
        },
      },
    });

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recentAlerts(req, res, next) {
  try {
    const data = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        severity: true,
        message: true,
        status: true,
        createdAt: true,
        transaction: {
          select: { id: true },
        },
      },
    });

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  summary,
  riskTrends,
  recentTransactions,
  recentAlerts,
};