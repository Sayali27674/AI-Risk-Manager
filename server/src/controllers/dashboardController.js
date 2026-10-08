const dashboardService = require('../services/dashboardService');

async function overview(req, res, next) {
  try {
    const data = await dashboardService.getOverview(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function highRisk(req, res, next) {
  try {
    const data = await dashboardService.getHighRiskTransactions(req.user, req.query);
    return res.json({
      success: true,
      data: data.items,
      pagination: data.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function summary(req, res, next) {
  try {
    const data = await dashboardService.getSummary(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function riskTrends(req, res, next) {
  try {
    const data = await dashboardService.getRiskTrends(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function recentTransactions(req, res, next) {
  try {
    const data = await dashboardService.getRecentTransactions(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function recentAlerts(req, res, next) {
  try {
    const data = await dashboardService.getRecentAlerts(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  overview,
  highRisk,
  summary,
  riskTrends,
  recentTransactions,
  recentAlerts,
};
