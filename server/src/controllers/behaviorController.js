const prisma = require('../models/prisma');
const behaviorService = require('../services/behaviorService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function canAccessUserBehavior(req, userId) {
  return ['ADMIN', 'ANALYST'].includes(req.user?.role) || req.user?.id === userId;
}

async function getUserBehavior(req, res, next) {
  try {
    const userId = parseId(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    if (!canAccessUserBehavior(req, userId)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const behavior = await behaviorService.getBehaviorProfile(userId);

    return res.json({
      success: true,
      data: behavior,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTransactionBehavior(req, res, next) {
  try {
    const transactionId = parseId(req.params.id);

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, userId: true },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (!canAccessUserBehavior(req, transaction.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    const behavior = await behaviorService.analyzeTransactionBehavior(
      transactionId,
    );

    return res.json({
      success: true,
      data: behavior,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserBehavior,
  getTransactionBehavior,
};
