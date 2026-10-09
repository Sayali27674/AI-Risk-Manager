const path = require('path');
const prisma = require('../models/prisma');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = Math.min(Number(process.env.AI_TIMEOUT_MS || 3000), 1500);

async function pingFastAPI() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(`${AI_BASE}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function localModuleOk(relativeFromServices) {
  const target = path.join(__dirname, relativeFromServices);
  try {
    require.resolve(target);
    return true;
  } catch {
    return false;
  }
}

function checkRuleEngine() {
  return localModuleOk('./riskEngine/index.js') ? 'AVAILABLE' : 'UNAVAILABLE';
}

function checkBehavioralService() {
  return localModuleOk('./behaviorService.js') ? 'AVAILABLE' : 'UNAVAILABLE';
}

async function checkIsolationForest() {
  return (await pingFastAPI()) ? 'AVAILABLE' : 'UNAVAILABLE';
}

async function checkXGBoost() {
  return (await pingFastAPI()) ? 'AVAILABLE' : 'UNAVAILABLE';
}

async function checkSHAP() {
  const aiUp = await pingFastAPI();
  if (!aiUp) return 'UNAVAILABLE';

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const samples = await prisma.riskScore.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { reasons: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const hasShapFactors = samples.some((row) => {
      const factors = row?.reasons?.shap_factors;
      return Array.isArray(factors) && factors.length > 0;
    });

    return hasShapFactors ? 'AVAILABLE' : 'DEGRADED';
  } catch {
    return 'DEGRADED';
  }
}

function checkInvestigationAgent() {
  const agent = localModuleOk('../agents/riskInvestigationAgent.js');
  const svc = localModuleOk('./investigationService.js');
  return agent && svc ? 'AVAILABLE' : 'UNAVAILABLE';
}

async function checkAll() {
  const results = await Promise.allSettled([
    Promise.resolve(checkRuleEngine()),
    Promise.resolve(checkBehavioralService()),
    checkIsolationForest(),
    checkXGBoost(),
    checkSHAP(),
    Promise.resolve(checkInvestigationAgent()),
  ]);

  const read = (index) => {
    const item = results[index];
    if (item.status === 'rejected') return 'UNAVAILABLE';
    return item.value || 'UNAVAILABLE';
  };

  return {
    ruleEngine: read(0),
    behavioral: read(1),
    isolationForest: read(2),
    xgboost: read(3),
    shap: read(4),
    aiInvestigationAgent: read(5),
  };
}

module.exports = {
  checkAll,
  checkRuleEngine,
  checkBehavioralService,
  checkIsolationForest,
  checkXGBoost,
  checkSHAP,
  checkInvestigationAgent,
};
