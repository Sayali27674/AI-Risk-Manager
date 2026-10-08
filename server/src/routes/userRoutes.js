const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const behaviorController = require('../controllers/behaviorController');

const router = express.Router();

router.use(authMiddleware);

router.get('/:userId/behavior', behaviorController.getUserBehavior);

module.exports = router;
