const prisma = require('../models/prisma');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getRiskScores(req, res, next) {
  try {
    const scores = await prisma.riskScore.findMany({
      include: {
        transaction: {
          select: {
            id: true,
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
      data: scores,
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

    return res.json({
      success: true,
      data: score,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRiskScores,
  getRiskScore,
};