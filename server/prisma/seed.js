require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.alert.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const analyst = await prisma.user.create({
    data: {
      name: 'Risk Analyst',
      email: 'analyst@example.com',
      passwordHash,
      role: 'ANALYST',
    },
  });

  const vendorA = await prisma.vendor.create({
    data: {
      name: 'Vendor A',
      category: 'Technology',
      country: 'United States',
      riskLevel: 'LOW',
    },
  });

  const vendorB = await prisma.vendor.create({
    data: {
      name: 'Vendor B',
      category: 'Financial Services',
      country: 'Unknown',
      riskLevel: 'CRITICAL',
    },
  });

  const transaction1 = await prisma.transaction.create({
    data: {
      amount: '1000.00',
      currency: 'USD',
      transactionType: 'PURCHASE',
      location: 'New York, US',
      deviceId: 'device-001',
      status: 'APPROVED',
      userId: admin.id,
      vendorId: vendorA.id,
      riskScore: {
        create: {
          score: 20,
          riskLevel: 'LOW',
          ruleScore: 20,
          anomalyScore: null,
          fraudProbability: null,
          modelVersion: 'rules-v1',
          reasons: ['Normal transaction pattern'],
        },
      },
    },
  });

  const transaction2 = await prisma.transaction.create({
    data: {
      amount: '25000.00',
      currency: 'USD',
      transactionType: 'TRANSFER',
      location: 'Unknown',
      deviceId: 'device-new',
      status: 'FLAGGED',
      userId: analyst.id,
      vendorId: vendorB.id,
      riskScore: {
        create: {
          score: 90,
          riskLevel: 'CRITICAL',
          ruleScore: 90,
          anomalyScore: null,
          fraudProbability: null,
          modelVersion: 'rules-v1',
          reasons: [
            'High-risk vendor',
            'Transaction amount exceeds threshold',
            'New device detected',
          ],
        },
      },
    },
  });

  await prisma.alert.create({
    data: {
      transactionId: transaction2.id,
      type: 'CRITICAL_RISK',
      severity: 'CRITICAL',
      message: 'Critical-risk transaction detected',
      status: 'OPEN',
    },
  });

  console.log('Seeding completed successfully.');
  console.log({
    users: 2,
    vendors: 2,
    transactions: 2,
    alerts: 1,
  });

  // Prevent unused-variable warnings.
  void transaction1;
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());