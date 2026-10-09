/**
 * verify-dashboards.js
 *
 * End-to-end verification for the RiskShield AI role dashboards.
 * Covers: authentication, RBAC matrix, admin/analyst overview payloads
 * (real PostgreSQL data), users directory consistency, system health,
 * USER dashboard regression and the Socket.IO real-time risk -> alert flow.
 *
 * Requires the backend server running (default http://localhost:5000).
 * Usage: node scripts/verify-dashboards.js
 * Exit code 0 = every check passed.
 */

require('dotenv').config();

const path = require('path');

function loadSocketClient() {
  try {
    return require('socket.io-client');
  } catch {
    return require(
      path.join(__dirname, '..', '..', 'client', 'node_modules', 'socket.io-client'),
    );
  }
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { io: ioClient } = loadSocketClient();

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const HEALTH_KEYS = [
  'ruleEngine',
  'behavioral',
  'isolationForest',
  'xgboost',
  'shap',
  'aiInvestigationAgent',
];
const STATUS_VALUES = ['AVAILABLE', 'DEGRADED', 'UNAVAILABLE'];
const BAND_RANK = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(detail ? `${name} (${detail})` : name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(route, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

function payload(result) {
  return result.data?.data ?? result.data ?? null;
}

function waitForEvent(socket, event, timeoutMs = 20000, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);
    function handler(eventPayload) {
      if (!predicate(eventPayload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(eventPayload);
    }
    socket.on(event, handler);
  });
}

async function verifyAuth() {
  console.log('\n[1] Authentication');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'demo.admin@riskshield.test',
      password: 'RiskShield-Demo-2026!',
    },
  });
  const analystLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'demo.analyst1@riskshield.test',
      password: 'RiskShield-Demo-2026!',
    },
  });
  const userOneLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'demo.user1@riskshield.test',
      password: 'RiskShield-Demo-2026!',
    },
  });
  const userTwoLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'demo.user2@riskshield.test',
      password: 'RiskShield-Demo-2026!',
    },
  });

  check(
    'ADMIN can log in',
    adminLogin.status === 200 && adminLogin.data?.user?.role === 'ADMIN',
  );
  check(
    'ANALYST can log in',
    analystLogin.status === 200 && analystLogin.data?.user?.role === 'ANALYST',
  );
  check(
    'two independent USER accounts can log in',
    userOneLogin.status === 200
      && userOneLogin.data?.user?.role === 'USER'
      && userTwoLogin.status === 200
      && userTwoLogin.data?.user?.role === 'USER',
  );

  const adminMe = await request('/api/auth/me', { token: adminLogin.data?.token });
  const analystMe = await request('/api/auth/me', { token: analystLogin.data?.token });
  const userMe = await request('/api/auth/me', { token: userOneLogin.data?.token });
  check(
    '/api/auth/me restores each authenticated role',
    adminMe.data?.user?.role === 'ADMIN'
      && analystMe.data?.user?.role === 'ANALYST'
      && userMe.data?.user?.role === 'USER',
  );

  const selectedRoleEmail = `verify-analyst-${Date.now()}@example.com`;
  const analystRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Verify Analyst',
      email: selectedRoleEmail,
      password: 'StrongTestPassword123!',
      role: 'ANALYST',
    },
  });
  check(
    'development registration stores the selected ANALYST role',
    analystRegister.status === 201
      && analystRegister.data?.user?.role === 'ANALYST',
    `status ${analystRegister.status}`,
  );

  const email = `verify-user-${Date.now()}@example.com`;
  const userRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Verify User',
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    },
  });
  check(
    'USER registration assigns role USER server-side',
    userRegister.status === 201 && userRegister.data?.user?.role === 'USER',
    `status ${userRegister.status}`,
  );

  return {
    adminToken: adminLogin.data?.token,
    analystToken: analystLogin.data?.token,
    userToken: userRegister.data?.token,
    userOneToken: userOneLogin.data?.token,
    userOneId: userOneLogin.data?.user?.id,
    userTwoToken: userTwoLogin.data?.token,
    userTwoId: userTwoLogin.data?.user?.id,
    testUserId: userRegister.data?.user?.id ?? null,
    selectedRoleUserId: analystRegister.data?.user?.id ?? null,
  };
}

async function verifyRbac(tokens) {
  console.log('\n[2] RBAC matrix (backend is final authority)');
  const byRole = {
    ADMIN: tokens.adminToken,
    ANALYST: tokens.analystToken,
    USER: tokens.userToken,
  };
  const matrix = [
    ['/api/dashboard/admin', { ADMIN: 200, ANALYST: 403, USER: 403, anon: 401 }],
    ['/api/dashboard/analyst', { ADMIN: 200, ANALYST: 200, USER: 403, anon: 401 }],
    ['/api/users', { ADMIN: 200, ANALYST: 403, USER: 403, anon: 401 }],
    ['/api/users/stats', { ADMIN: 200, ANALYST: 403, USER: 403, anon: 401 }],
    ['/api/system/health', { ADMIN: 200, ANALYST: 200, USER: 403, anon: 401 }],
    ['/api/vendors', { ADMIN: 200, ANALYST: 200, USER: 403, anon: 401 }],
    ['/api/alerts', { ADMIN: 200, ANALYST: 200, USER: 403, anon: 401 }],
    ['/api/dashboard', { ADMIN: 200, ANALYST: 200, USER: 200, anon: 401 }],
    ['/api/transactions', { ADMIN: 200, ANALYST: 200, USER: 200, anon: 401 }],
  ];

  for (const [route, expected] of matrix) {
    for (const role of ['ADMIN', 'ANALYST', 'USER']) {
      const result = await request(route, { token: byRole[role] });
      check(
        `${route} as ${role} → ${expected[role]}`,
        result.status === expected[role],
        `got ${result.status}`,
      );
    }
    const anon = await request(route);
    check(
      `${route} without token → ${expected.anon}`,
      anon.status === expected.anon,
      `got ${anon.status}`,
    );
  }
}

async function verifyAdminOverview(adminToken) {
  console.log('\n[3] Admin dashboard overview (real data)');
  const result = await request('/api/dashboard/admin', { token: adminToken });
  check('GET /api/dashboard/admin → 200', result.status === 200, `got ${result.status}`);
  const overview = payload(result);
  if (!overview) {
    check('admin overview payload present', false);
    return null;
  }

  check(
    'kpis.totalTransactions.value is a number',
    typeof overview.kpis?.totalTransactions?.value === 'number',
  );
  check(
    'kpis.highRiskTransactions.value is a number',
    typeof overview.kpis?.highRiskTransactions?.value === 'number',
  );
  check(
    'kpis.criticalRisk.value is a number',
    typeof overview.kpis?.criticalRisk?.value === 'number',
  );
  check(
    'kpis.openAlerts.value is a number',
    typeof overview.kpis?.openAlerts?.value === 'number',
  );

  const stats = overview.userStats || {};
  const byRole = stats.byRole || {};
  const roleSum = (byRole.ADMIN || 0) + (byRole.ANALYST || 0) + (byRole.USER || 0);
  check(
    'userStats.total matches sum(byRole)',
    typeof stats.total === 'number' && stats.total === roleSum,
    `total=${stats.total} sum=${roleSum}`,
  );
  check('userStats.recent is an array', Array.isArray(stats.recent));

  const distribution = overview.riskDistribution;
  check(
    'riskDistribution covers LOW/MEDIUM/HIGH/CRITICAL',
    Array.isArray(distribution)
      && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].every((level) =>
        distribution.some((entry) => entry.level === level),
      ),
  );
  check('risk trend is an array', Array.isArray(overview.trend));

  const severityCounts = overview.alertCenter?.counts || {};
  const statusCounts = overview.alertCenter?.statusCounts || {};
  check(
    'alertCenter.counts has severity keys',
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].every(
      (key) => typeof severityCounts[key] === 'number',
    ),
  );
  check(
    'alertCenter.statusCounts has status keys',
    ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].every(
      (key) => typeof statusCounts[key] === 'number',
    ),
  );

  const health = overview.systemHealth || {};
  const readStatus = (entry) => (typeof entry === 'string' ? entry : entry?.status);
  check(
    'systemHealth covers 6 components with valid statuses',
    HEALTH_KEYS.every((key) => STATUS_VALUES.includes(readStatus(health[key]))),
    JSON.stringify(health),
  );
  check(
    'rule engine reports AVAILABLE (module loaded)',
    readStatus(health.ruleEngine) === 'AVAILABLE',
  );
  check('vendors overview is an array', Array.isArray(overview.vendors));
  check(
    'highRiskVendorCount is a number',
    typeof overview.highRiskVendorCount === 'number',
  );

  return overview;
}

async function verifyAnalystOverview(analystToken) {
  console.log('\n[4] Analyst dashboard overview (real data)');
  const result = await request('/api/dashboard/analyst', { token: analystToken });
  check('GET /api/dashboard/analyst → 200', result.status === 200, `got ${result.status}`);
  const overview = payload(result);
  if (!overview) {
    check('analyst overview payload present', false);
    return null;
  }

  const queue = overview.investigationQueue;
  check('investigationQueue is an array', Array.isArray(queue));
  if (Array.isArray(queue)) {
    check(
      'queue contains only CRITICAL/HIGH/MEDIUM rows',
      queue.every((row) => ['CRITICAL', 'HIGH', 'MEDIUM'].includes(row.riskLevel)),
    );
    let sorted = true;
    for (let i = 1; i < queue.length; i += 1) {
      const previous = BAND_RANK[queue[i - 1].riskLevel] || 0;
      const current = BAND_RANK[queue[i].riskLevel] || 0;
      if (previous < current) sorted = false;
    }
    check('queue is priority-sorted (CRITICAL → HIGH → MEDIUM)', sorted);
    check(
      'queue rows expose id/amount/fraud/anomaly/alert fields',
      queue.every(
        (row) =>
          typeof row.id === 'number'
          && 'amount' in row
          && 'fraudProbability' in row
          && 'anomalyScore' in row
          && 'alertStatus' in row
          && 'alertId' in row
          && 'transactionId' in row,
      ),
    );
  }

  const attention = overview.attentionAlerts;
  check('attentionAlerts is an array', Array.isArray(attention));
  if (Array.isArray(attention) && attention.length > 0) {
    check(
      'attentionAlerts limited to CRITICAL/HIGH + OPEN/INVESTIGATING',
      attention.every(
        (row) =>
          ['CRITICAL', 'HIGH'].includes(row.severity)
          && ['OPEN', 'INVESTIGATING'].includes(row.status),
      ),
    );
  }

  const fraud = overview.fraudPredictionSummary || {};
  check(
    'fraudPredictionSummary.highProbabilityCount is a number',
    typeof fraud.highProbabilityCount === 'number',
  );
  check(
    'fraudPredictionSummary.averageProbability is number|null',
    fraud.averageProbability == null || typeof fraud.averageProbability === 'number',
  );
  check('fraudPredictionSummary.recent is an array', Array.isArray(fraud.recent));

  const anomaly = overview.anomalySummary || {};
  check('anomalySummary.count is a number', typeof anomaly.count === 'number');
  check(
    'anomalySummary.averageAnomalyScore is number|null',
    anomaly.averageAnomalyScore == null || typeof anomaly.averageAnomalyScore === 'number',
  );
  check('anomalySummary.recent is an array', Array.isArray(anomaly.recent));

  const behavior = overview.behavioralInsights || {};
  check(
    'behavioralInsights.categories has 6 keys',
    ['unusualAmount', 'newDevice', 'newLocation', 'unusualTime', 'highFrequency', 'unusualVendor'].every(
      (key) => typeof behavior.categories?.[key] === 'number',
    ),
  );
  check('behavioralInsights.rows is an array', Array.isArray(behavior.rows));
  check(
    'behavioralInsights.insufficient is boolean',
    typeof behavior.insufficient === 'boolean',
  );

  const ai = overview.aiInsights || {};
  check(
    'aiInsights exposes 5 named insights',
    [
      'highestRiskTransaction',
      'highestFraudProbability',
      'mostSuspiciousVendor',
      'largestRiskIncrease',
      'mostUnusualUserBehavior',
    ].every((key) => key in ai),
  );

  return overview;
}


async function verifyUsersAndHealth(adminToken) {
  console.log('\n[5] Users directory + system health endpoint');
  const statsResult = await request('/api/users/stats', { token: adminToken });
  const listResult = await request('/api/users?page=1&limit=100', { token: adminToken });
  const stats = payload(statsResult);
  const list = payload(listResult);
  const pagination = listResult.data?.pagination;

  check(
    'user stats exposes total + byRole',
    typeof stats?.total === 'number' && stats?.byRole != null,
  );
  check('users list returns rows', Array.isArray(list) && list.length > 0);
  check(
    'users list pagination.total matches stats.total',
    pagination?.total === stats?.total,
    `list=${pagination?.total} stats=${stats?.total}`,
  );
  check(
    'user rows expose name/email/role',
    Array.isArray(list)
      && list.every((row) => row.name && row.email && row.role),
  );

  const analystFilter = await request('/api/users?role=ANALYST', { token: adminToken });
  const analystRows = payload(analystFilter) || [];
  check(
    'role filter returns only ANALYST rows',
    analystRows.length > 0 && analystRows.every((row) => row.role === 'ANALYST'),
    `rows=${analystRows.length}`,
  );

  const healthResult = await request('/api/system/health', { token: adminToken });
  const health = payload(healthResult);
  const readStatus = (entry) => (typeof entry === 'string' ? entry : entry?.status);
  check(
    'GET /api/system/health returns 6 valid component statuses',
    health != null
      && HEALTH_KEYS.every((key) => STATUS_VALUES.includes(readStatus(health[key]))),
    JSON.stringify(health),
  );
}

async function verifyUserRegression(userToken) {
  console.log('\n[6] USER dashboard regression');
  const overviewResult = await request('/api/dashboard', { token: userToken });
  check(
    'GET /api/dashboard as USER → 200 (auth-only route unchanged)',
    overviewResult.status === 200,
    `got ${overviewResult.status}`,
  );
  const overview = payload(overviewResult);
  check(
    'user overview keeps kpis/trend/riskDistribution shape',
    overview?.kpis != null
      && Array.isArray(overview?.trend)
      && Array.isArray(overview?.riskDistribution),
  );

  const transactionsResult = await request('/api/transactions?limit=5', {
    token: userToken,
  });
  check(
    'GET /api/transactions as USER → 200',
    transactionsResult.status === 200,
    `got ${transactionsResult.status}`,
  );
}

async function verifyUserIsolation(tokens) {
  console.log('\n[7] USER-to-USER data isolation');
  const userOneTransactions = await request('/api/transactions?limit=100', {
    token: tokens.userOneToken,
  });
  const userTwoTransactions = await request('/api/transactions?limit=100', {
    token: tokens.userTwoToken,
  });
  const firstRows = payload(userOneTransactions);
  const secondRows = payload(userTwoTransactions);

  check(
    'each USER dashboard transaction list is non-empty and user-scoped',
    Array.isArray(firstRows)
      && firstRows.length > 0
      && firstRows.every((item) => item.userId === tokens.userOneId)
      && Array.isArray(secondRows)
      && secondRows.length > 0
      && secondRows.every((item) => item.userId === tokens.userTwoId),
  );

  if (Array.isArray(secondRows) && secondRows.length > 0) {
    const forbiddenTransaction = await request(
      `/api/transactions/${secondRows[0].id}`,
      { token: tokens.userOneToken },
    );
    check(
      'USER cannot fetch another USER transaction by ID → 403',
      forbiddenTransaction.status === 403,
      `got ${forbiddenTransaction.status}`,
    );
  } else {
    check('second USER has a transaction for access test', false);
  }

  const userDashboard = await request('/api/dashboard', {
    token: tokens.userOneToken,
  });
  check(
    'USER dashboard includes only their seeded transaction count',
    userDashboard.status === 200
      && userDashboard.data?.data?.kpis?.totalTransactions?.value
        === firstRows.length,
    `got ${userDashboard.data?.data?.kpis?.totalTransactions?.value}`,
  );
}


async function verifyRealtime(adminToken, analystToken, userToken, transactionUserId) {
  console.log('\n[8] Socket.IO real-time risk -> alert flow');
  const socket = ioClient(BASE, {
    auth: { token: adminToken },
    transports: ['websocket', 'polling'],
  });

  const connected = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 8000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(true);
    });
    socket.on('connect_error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  check('ADMIN socket connects with JWT handshake', connected);
  if (!connected) {
    socket.close();
    return null;
  }

  const vendor = await prisma.vendor.findFirst({
    where: { riskLevel: { in: ['CRITICAL', 'HIGH'] } },
    orderBy: { riskLevel: 'asc' },
  });
  check('HIGH/CRITICAL vendor exists for the alert flow', vendor != null);
  if (!vendor) {
    socket.close();
    return null;
  }

  // Register listeners BEFORE creating the transaction.
  const eventPromise = new Promise((resolve) => {
    let done = false;
    const finish = (name, eventPayload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.off('risk:alert', onAlert);
      socket.off('risk:updated', onUpdated);
      resolve({ name, eventPayload });
    };
    const timer = setTimeout(() => finish('timeout', null), 25000);
    const onAlert = (eventPayload) => finish('risk:alert', eventPayload);
    const onUpdated = (eventPayload) => finish('risk:updated', eventPayload);
    socket.on('risk:alert', onAlert);
    socket.on('risk:updated', onUpdated);
  });

  const created = await request('/api/transactions', {
    method: 'POST',
    token: analystToken,
    body: {
      userId: transactionUserId,
      vendorId: vendor.id,
      amount: 987654.45,
      currency: 'USD',
      transactionType: 'TRANSFER',
      location: 'Unknown, ZZ',
      deviceId: `verify-device-${Date.now()}`,
      status: 'PENDING',
    },
  });
  check(
    'suspicious transaction created by ANALYST (risk engine executed)',
    created.status === 201 || created.status === 200,
    `got ${created.status}`,
  );

  // RBAC: transaction creation is staff-only — USER must be rejected.
  const userPost = await request('/api/transactions', {
    method: 'POST',
    token: userToken,
    body: {
      vendorId: vendor.id,
      amount: 10,
      currency: 'USD',
      transactionType: 'PAYMENT',
      location: 'Home, US',
      deviceId: 'user-blocked-device',
      status: 'PENDING',
    },
  });
  check(
    'USER cannot create transactions → 403',
    userPost.status === 403,
    `got ${userPost.status}`,
  );

  const transactionId = created.data?.data?.id ?? created.data?.id ?? null;
  if (transactionId) {
    const dashboardHighRisk = await request(
      `/api/dashboard/high-risk?search=${transactionId}&limit=5`,
      { token: analystToken },
    );
    check(
      'new risk-scored transaction appears in dashboard high-risk data',
      dashboardHighRisk.status === 200
        && (payload(dashboardHighRisk) || []).some((row) => row.id === transactionId),
      `got ${dashboardHighRisk.status}`,
    );
  } else {
    check('created transaction id available for dashboard check', false);
  }

  const firstEvent = await eventPromise;
  check(
    'real-time risk event broadcast to ADMIN room',
    firstEvent.name === 'risk:alert' || firstEvent.name === 'risk:updated',
    firstEvent.name,
  );

  if (transactionId) {
    const alertRow = await prisma.alert.findFirst({
      where: { transactionId },
      orderBy: { id: 'desc' },
    });
    check('alert row created for the high-risk transaction', alertRow != null);
    if (alertRow) {
      const resolvedPromise = waitForEvent(
        socket,
        'alert:resolved',
        15000,
        (eventPayload) =>
          eventPayload?.alertId === alertRow.id
          || eventPayload?.transactionId === transactionId,
      ).catch(() => null);

      const resolveResult = await request(`/api/alerts/${alertRow.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'RESOLVED' },
      });
      check(
        'ADMIN resolves the alert via PUT /api/alerts/:id/status',
        resolveResult.status === 200,
        `got ${resolveResult.status}`,
      );
      check(
        'resolved alert status is persisted',
        resolveResult.data?.data?.status === 'RESOLVED',
        `got ${resolveResult.data?.data?.status}`,
      );
      const resolvedEvent = await resolvedPromise;
      check('alert:resolved broadcast received', resolvedEvent != null);
    }
  } else {
    check('created transaction id available', false, 'no id in response');
  }

  socket.close();
  return transactionId;
}

async function cleanup({ testUserId, selectedRoleUserId, transactionId }) {
  const transactionIds = [];
  if (transactionId) transactionIds.push(transactionId);
  if (testUserId) {
    const rows = await prisma.transaction.findMany({
      where: { userId: testUserId },
      select: { id: true },
    });
    for (const row of rows) transactionIds.push(row.id);
  }

  if (transactionIds.length) {
    await prisma.alert.deleteMany({ where: { transactionId: { in: transactionIds } } });
    await prisma.riskScore.deleteMany({ where: { transactionId: { in: transactionIds } } });
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: transactionIds.map(String) } },
    });
    await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  }
  const testUserIds = [testUserId, selectedRoleUserId].filter(Boolean);
  if (testUserIds.length) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  }
}


async function main() {
  console.log('RiskShield AI — dashboard end-to-end verification');
  console.log(`Target: ${BASE}`);

  const health = await request('/api/health');
  if (health.status !== 200) {
    console.error(`Server is not reachable at ${BASE} (got ${health.status}).`);
    process.exit(1);
  }

  let tokens = null;
  let realtimeTransactionId = null;
  try {
    tokens = await verifyAuth();
    if (!tokens.adminToken || !tokens.analystToken || !tokens.userToken) {
      throw new Error('Authentication failed — cannot continue.');
    }

    await verifyRbac(tokens);
    await verifyAdminOverview(tokens.adminToken);
    await verifyAnalystOverview(tokens.analystToken);
    await verifyUsersAndHealth(tokens.adminToken);
    await verifyUserRegression(tokens.userToken);
    await verifyUserIsolation(tokens);
    realtimeTransactionId = await verifyRealtime(
      tokens.adminToken,
      tokens.analystToken,
      tokens.userToken,
      tokens.userOneId,
    );
  } catch (error) {
    failed += 1;
    failures.push(`Unexpected error: ${error.message}`);
    console.error(`  FAIL  Unexpected error — ${error.message}`);
  } finally {
    try {
      await cleanup({
        testUserId: tokens?.testUserId ?? null,
        selectedRoleUserId: tokens?.selectedRoleUserId ?? null,
        transactionId: realtimeTransactionId,
      });
      console.log('\n[cleanup] test transaction/alert/user rows removed');
    } catch (cleanupError) {
      console.warn(`\n[cleanup] warning — ${cleanupError.message}`);
    }
    await prisma.$disconnect();
  }

  console.log('\n========================================');
  console.log(` RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log(' Failures:');
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

main();
