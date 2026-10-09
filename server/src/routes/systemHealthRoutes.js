const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const systemHealthController = require('../controllers/systemHealthController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/health',
  authorizeRoles('ADMIN', 'ANALYST'),
  systemHealthController.getHealth,
);

module.exports = router;
