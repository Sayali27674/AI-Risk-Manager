const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const riskScoreController = require('../controllers/riskScoreController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', riskScoreController.getRiskScores);
router.get('/:id', riskScoreController.getRiskScore);

module.exports = router;