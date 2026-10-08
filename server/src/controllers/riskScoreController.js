const prisma = require('../models/prisma');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function canViewRiskExplanation(user) {
  return ['ADMIN', 'ANALYST'].includes(user?.role);
}

function canAccessRiskScore(score, user) {
  return canViewRiskExplanation(user) || score?.transaction?.userId === user?.id;
}

function sanitizeRiskScore(score, user) {
  if (!score) {
    return score;
  }

  if (canViewRiskExplanation(user)) {
    return score;
  }

  const reasons = score.reasons || {};

  return {
    ...score,
    reasons: {
      ...reasons,
      shap_factors: [],
    },
  };
}

async function getRiskScores(req, res, next) {
  try {
    const scores = await prisma.riskScore.findMany({
      where: canViewRiskExplanation(req.user)
        ? {}
        : { transaction: { userId: req.user.id } },
      include: {
        transaction: {
          select: {
            id: true,
            userId: true,
            amount: true,
            currency: true,
            timestamp: true,
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: scores.map((score) => sanitizeRiskScore(score, req.user)),
    });
  } catch (error) {
    return next(error);
  }
}

async function getRiskScore(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk score ID',
      });
    }

    const score = await prisma.riskScore.findUnique({
      where: { id },
      include: {
        transaction: {
          select: {
            id: true,
            userId: true,
            amount: true,
            currency: true,
            timestamp: true,
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Risk score not found',
      });
    }

    if (!canAccessRiskScore(score, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    return res.json({
      success: true,
      data: sanitizeRiskScore(score, req.user),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRiskScores,
  getRiskScore,
};
