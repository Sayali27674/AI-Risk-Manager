const express = require('express');
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

// Get all alerts
router.get(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  alertController.getAllAlerts,
);

// Get alert by ID
router.get(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  alertController.getAlertById,
);

// Create a new alert
router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN'),
  alertController.createAlert,
);

// Update an alert
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN'),
  alertController.updateAlert,
);

// Delete an alert
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN'),
  alertController.deleteAlert,
);

module.exports = router;