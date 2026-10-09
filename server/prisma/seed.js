require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const behaviorService = require('../src/services/behaviorService');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before seeding.');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo seed is disabled in production.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_PASSWORD = 'RiskShield-Demo-2026!';
const usersToSeed = [
  { name: 'RiskShield Demo Admin', email: 'demo.admin@riskshield.test', role: 'ADMIN' },
  { name: 'Demo Analyst One', email: 'demo.analyst1@riskshield.test', role: 'ANALYST' },
  { name: 'Demo Analyst Two', email: 'demo.analyst2@riskshield.test', role: 'ANALYST' },
  ...Array.from({ length: 5 }, (_, index) => ({
    name: `Demo User ${index + 1}`,
    email: `demo.user${index + 1}@riskshield.test`,
    role: 'USER',
  })),
];

const vendorsToSeed = [
  { name: 'Northstar Grocers', category: 'Groceries', country: 'United States', riskLevel: 'LOW' },
  { name: 'Harbor Health', category: 'Healthcare', country: 'Canada', riskLevel: 'LOW' },
  { name: 'Metro Travel', category: 'Travel', country: 'United Kingdom', riskLevel: 'MEDIUM' },
  { name: 'Cedar Electronics', category: 'Electronics', country: 'Japan', riskLevel: 'MEDIUM' },
  { name: 'Summit Digital Assets', category: 'Financial Services', country: 'Singapore', riskLevel: 'HIGH' },
  { name: 'Redwood Luxury', category: 'Retail', country: 'France', riskLevel: 'HIGH' },
  { name: 'BluePeak Logistics', category: 'Logistics', country: 'Germany', riskLevel: 'HIGH' },
  { name: 'Rapid Remittance', category: 'Money Services', country: 'United Arab Emirates', riskLevel: 'CRITICAL' },
  { name: 'Orion Offshore Markets', category: 'Online Services', country: 'Cayman Islands', riskLevel: 'CRITICAL' },
  { name: 'Unknown Gateway', category: 'Payment Processing', country: 'Unknown', riskLevel: 'CRITICAL' },
];

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
const locations = [
  'New York, US',
  'Toronto, CA',
  'London, GB',
  'Mumbai, IN',
  'Sydney, AU',
];
const transactionTypes = ['PURCHASE', 'TRANSFER', 'PAYMENT', 'WITHDRAWAL'];
const statuses = ['APPROVED', 'PENDING', 'FLAGGED', 'REJECTED'];
const alertStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
const riskBands = [
  { level: 'LOW', score: 15, vendors: [0, 1], amounts: [45, 1800] },
  { level: 'MEDIUM', score: 45, vendors: [2, 3], amounts: [10000, 18000] },
  { level: 'HIGH', score: 70, vendors: [4, 5, 6], amounts: [18000, 45000] },
  { level: 'CRITICAL', score: 95, vendors: [7, 8, 9], amounts: [45000, 125000] },
];

function demoRuleReasons(band) {
  if (band.level === 'LOW') {
    return ['New device detected for this user'];
  }
  if (band.level === 'MEDIUM') {
    return [
      'Transaction amount exceeds the high-value threshold',
      'Vendor has medium risk classification',
      'New device detected for this user',
    ];
  }
  if (band.level === 'HIGH') {
    return [
      'Transaction amount exceeds the high-value threshold',
      'Vendor has high risk classification',
      'New device detected for this user',
      'Unusual transaction location detected',
    ];
  }
  return [
    'Transaction amount exceeds the high-value threshold',
    'Vendor has critical risk classification',
    'New device detected for this user',
    'Unusual transaction location detected',
    'Transaction occurred at an unusual time',
    'Multiple transactions detected within a short period',
    "Transaction amount is significantly higher than the user's normal amount",
  ];
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = [];

  for (const userData of usersToSeed) {
    users.push(await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        passwordHash,
      },
      create: { ...userData, passwordHash },
    }));
  }

  return users;
}

async function seedVendors() {
  const vendors = [];

  for (const vendorData of vendorsToSeed) {
    vendors.push(await prisma.vendor.upsert({
      where: { name: vendorData.name },
      update: vendorData,
      create: vendorData,
    }));
  }

  return vendors;
}

async function seedTransactions(users, vendors) {
  const seededTransactions = [];
  const now = Date.now();

  for (let index = 0; index < 100; index += 1) {
    const band = riskBands[Math.floor(index / 25)];
    const userIndex = index % 5;
    const bandVendorIndexes = band.vendors;
    const vendor = vendors[bandVendorIndexes[index % bandVendorIndexes.length]];
    const range = band.amounts[1] - band.amounts[0];
    const amount = band.amounts[0] + ((index * 7919) % range);
    const deviceSuffix = String((index % 4) + 1).padStart(2, '0');
    const timestamp = new Date(now - (100 - index) * 24 * 60 * 60 * 1000);
    const deviceId = `riskshield-demo-tx-${String(index + 1).padStart(3, '0')}-device-${deviceSuffix}`;
    const data = {
      userId: users[userIndex + 3].id,
      vendorId: vendor.id,
      amount: amount.toFixed(2),
      currency: currencies[index % currencies.length],
      transactionType: transactionTypes[index % transactionTypes.length],
      location: locations[Math.floor(index / 5) % locations.length],
      deviceId,
      status: statuses[index % statuses.length],
      timestamp,
    };

    const existing = await prisma.transaction.findFirst({
      where: { deviceId },
      select: { id: true },
    });
    const transaction = existing
      ? await prisma.transaction.update({ where: { id: existing.id }, data })
      : await prisma.transaction.create({ data });

    const reasons = {
      rule_reasons: demoRuleReasons(band),
      anomaly_reasons: [],
      fraud_reasons: [],
      shap_factors: [],
      seedNote: 'Rule-only demonstration scenario; no AI prediction was generated.',
    };

    await prisma.riskScore.upsert({
      where: { transactionId: transaction.id },
      update: {
        score: band.score,
        riskLevel: band.level,
        ruleScore: band.score,
        anomalyScore: null,
        fraudProbability: null,
        modelVersion: 'demo-rule-scenarios-v1',
        reasons,
      },
      create: {
        transactionId: transaction.id,
        score: band.score,
        riskLevel: band.level,
        ruleScore: band.score,
        anomalyScore: null,
        fraudProbability: null,
        modelVersion: 'demo-rule-scenarios-v1',
        reasons,
      },
    });

    if (band.level !== 'LOW') {
      const alertType = `DEMO_${band.level}_RISK`;
      const alertData = {
        type: alertType,
        severity: band.level,
        message: `Seeded demonstration alert for a ${band.level.toLowerCase()} rule-risk scenario.`,
        status: alertStatuses[index % alertStatuses.length],
      };
      const existingAlert = await prisma.alert.findFirst({
        where: { transactionId: transaction.id, type: alertType },
        select: { id: true },
      });

      if (existingAlert) {
        await prisma.alert.update({
          where: { id: existingAlert.id },
          data: alertData,
        });
      } else {
        await prisma.alert.create({
          data: { transactionId: transaction.id, ...alertData },
        });
      }
    }

    seededTransactions.push(transaction);
  }

  for (const transaction of seededTransactions) {
    const behavior = await behaviorService.analyzeTransactionBehavior(transaction.id);
    const existingScore = await prisma.riskScore.findUnique({
      where: { transactionId: transaction.id },
      select: { reasons: true },
    });

    await prisma.riskScore.update({
      where: { transactionId: transaction.id },
      data: {
        reasons: {
          ...(existingScore?.reasons || {}),
          behavior,
        },
      },
    });
  }

  return seededTransactions.length;
}

async function main() {
  const users = await seedUsers();
  const vendors = await seedVendors();
  const transactionCount = await seedTransactions(users, vendors);
  const [persistedUsers, persistedVendors, persistedTransactions, persistedAlerts] =
    await Promise.all([
      prisma.user.count({
        where: { email: { in: usersToSeed.map((user) => user.email) } },
      }),
      prisma.vendor.count({
        where: { name: { in: vendorsToSeed.map((vendor) => vendor.name) } },
      }),
      prisma.transaction.count({
        where: { deviceId: { startsWith: 'riskshield-demo-tx-' } },
      }),
      prisma.alert.count({
        where: { type: { startsWith: 'DEMO_' } },
      }),
    ]);

  console.log('RiskShield AI demo data seeded idempotently.');
  console.log({
    users: persistedUsers,
    vendors: persistedVendors,
    transactions: persistedTransactions,
    riskScores: transactionCount,
    alerts: persistedAlerts,
    aiPredictions: 'not generated by the seed',
    demoPassword: DEMO_PASSWORD,
  });
}

main()
  .catch((error) => {
    console.error('Demo data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
