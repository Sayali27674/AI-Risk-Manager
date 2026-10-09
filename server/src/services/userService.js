const prisma = require('../models/prisma');

function parsePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit };
}

function parseUserFilters(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const role = ['ADMIN', 'ANALYST', 'USER'].includes(query.role) ? query.role : null;
  return { search, role };
}

async function listUsers({ page, limit, search, role }) {
  const where = {};

  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            auditLogs: true,
          },
        },
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { timestamp: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  const items = rows.map((row) => {
    const txTs = row.transactions[0]?.timestamp ?? null;
    const auditTs = row.auditLogs[0]?.createdAt ?? null;
    const a = txTs ? new Date(txTs).getTime() : 0;
    const b = auditTs ? new Date(auditTs).getTime() : 0;
    const lastActivity = a || b ? new Date(Math.max(a, b)).toISOString() : null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      transactionCount: row._count.transactions,
      auditCount: row._count.auditLogs,
      lastActivity,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getUserStats() {
  const roleCountsRaw = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });

  const byRole = { ADMIN: 0, ANALYST: 0, USER: 0 };
  let total = 0;
  for (const row of roleCountsRaw) {
    byRole[row.role] = row._count._all;
    total += row._count._all;
  }

  const recent = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    total,
    byRole,
    recent: recent.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      registeredAt: row.createdAt,
      status: 'ACTIVE',
    })),
  };
}

module.exports = {
  listUsers,
  getUserStats,
  parsePagination,
  parseUserFilters,
};
