const investigationService = require('../services/investigationService');

async function chat(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Investigation question is required',
      });
    }

    if (!['ADMIN', 'ANALYST'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    const result = await investigationService.chat({
      userId: req.user.id,
      message,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  chat,
};
