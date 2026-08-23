const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/dashboardController');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', controller.summary);
router.get('/risk-trends', controller.riskTrends);
router.get('/recent-transactions', controller.recentTransactions);
router.get('/recent-alerts', controller.recentAlerts);

module.exports = router;