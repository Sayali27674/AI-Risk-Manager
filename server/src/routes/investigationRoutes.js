const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const investigationRateLimit = require('../middleware/investigationRateLimit');
const investigationController = require('../controllers/investigationController');

const router = express.Router();

router.post(
  '/chat',
  authMiddleware,
  investigationRateLimit,
  investigationController.chat,
);

module.exports = router;
