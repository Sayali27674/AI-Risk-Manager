const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/dashboardController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', controller.overview);
router.get('/high-risk', controller.highRisk);
router.get('/summary', controller.summary);
router.get('/risk-trends', controller.riskTrends);
router.get('/recent-transactions', controller.recentTransactions);
router.get('/recent-alerts', controller.recentAlerts);

router.get(
  '/admin',
  authorizeRoles('ADMIN'),
  controller.adminOverview,
);

router.get(
  '/analyst',
  authorizeRoles('ADMIN', 'ANALYST'),
  controller.analystOverview,
);

module.exports = router;
