const systemHealthService = require('../services/systemHealthService');

async function getHealth(req, res, next) {
  try {
    const data = await systemHealthService.checkAll();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHealth,
};
