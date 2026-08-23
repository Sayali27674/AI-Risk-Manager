const prisma = require('../models/prisma');
const riskService = require('../services/riskService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function writeAudit(userId, action, entity, entityId, metadata = {}) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: String(entityId),
      metadata,
    },
  });
}

async function recalculateRisk(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const result = await riskService.calculateAndPersistRisk(id);

    await writeAudit(
      req.user.id,
      'RECALCULATE_RISK',
      'Transaction',
      id,
      { score: result.score, riskLevel: result.riskLevel },
    );

    return res.json({
      success: true,
      data: {
        score: result.score,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getTransactions(req, res, next) {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        vendor: true,
        riskScore: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        alerts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTransaction(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        vendor: true,
        riskScore: true,
        alerts: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (req.user.role === 'USER' && transaction.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    return res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTransaction(req, res, next) {
  try {
    const {
      userId,
      vendorId,
      amount,
      currency = 'USD',
      transactionType,
      location,
      deviceId,
      status = 'PENDING',
      timestamp,
    } = req.body;

    const parsedUserId = Number(userId || req.user.id);
    const parsedVendorId = Number(vendorId);
    const parsedAmount = Number(amount);

    if (
      !Number.isInteger(parsedUserId) ||
      parsedUserId <= 0 ||
      !Number.isInteger(parsedVendorId) ||
      parsedVendorId <= 0 ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !transactionType ||
      !location ||
      !deviceId
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction data',
      });
    }

    if (!['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction status',
      });
    }

    const [user, vendor] = await Promise.all([
      prisma.user.findUnique({ where: { id: parsedUserId } }),
      prisma.vendor.findUnique({ where: { id: parsedVendorId } }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: parsedUserId,
        vendorId: parsedVendorId,
        amount: parsedAmount.toFixed(2),
        currency,
        transactionType: String(transactionType).trim(),
        location: String(location).trim(),
        deviceId: String(deviceId).trim(),
        status,
        ...(timestamp ? { timestamp: new Date(timestamp) } : {}),
      },
    });

    const risk = await riskService.calculateAndPersistRisk(transaction.id);

    await writeAudit(
      req.user.id,
      'CREATE',
      'Transaction',
      transaction.id,
      {
        amount: transaction.amount.toString(),
        vendorId: transaction.vendorId,
        riskLevel: risk.riskLevel,
      },
    );

    const result = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        vendor: true,
        riskScore: true,
        alerts: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const {
      userId,
      vendorId,
      amount,
      currency,
      transactionType,
      location,
      deviceId,
      status,
      timestamp,
    } = req.body;

    const data = {};

    if (userId !== undefined) {
      const parsedUserId = Number(userId);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid userId',
        });
      }
      data.userId = parsedUserId;
    }

    if (vendorId !== undefined) {
      const parsedVendorId = Number(vendorId);
      if (!Number.isInteger(parsedVendorId) || parsedVendorId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendorId',
        });
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id: parsedVendorId },
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      data.vendorId = parsedVendorId;
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);

      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than zero',
        });
      }

      data.amount = parsedAmount.toFixed(2);
    }

    if (currency !== undefined) data.currency = String(currency).trim();
    if (transactionType !== undefined) {
      data.transactionType = String(transactionType).trim();
    }
    if (location !== undefined) data.location = String(location).trim();
    if (deviceId !== undefined) data.deviceId = String(deviceId).trim();

    if (status !== undefined) {
      const validStatuses = [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'FLAGGED',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction status',
        });
      }

      data.status = status;
    }

    if (timestamp !== undefined) {
      const parsedTimestamp = new Date(timestamp);

      if (Number.isNaN(parsedTimestamp.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timestamp',
        });
      }

      data.timestamp = parsedTimestamp;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
    });

    const risk = await riskService.calculateAndPersistRisk(id);

    await writeAudit(
      req.user.id,
      'UPDATE',
      'Transaction',
      id,
      {
        changedFields: Object.keys(data),
        riskLevel: risk.riskLevel,
      },
    );

    const result = await prisma.transaction.findUnique({
      where: { id },
      include: {
        vendor: true,
        riskScore: true,
        alerts: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    await writeAudit(
      req.user.id,
      'DELETE',
      'Transaction',
      id,
    );

    return res.json({
      success: true,
      data: { id },
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  recalculateRisk,
};