const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const userController = require('../controllers/userController');
const behaviorController = require('../controllers/behaviorController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  authorizeRoles('ADMIN'),
  userController.listUsers,
);

router.get(
  '/stats',
  authorizeRoles('ADMIN'),
  userController.getUserStats,
);

router.get('/:userId/behavior', behaviorController.getUserBehavior);

module.exports = router;
