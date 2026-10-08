const express = require('express');
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

// Get all alerts (with filters: ?severity=HIGH&status=OPEN&page=1&limit=50)
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

// Create a new alert (admin only)
router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN'),
  alertController.createAlert,
);

// Update alert status via dedicated endpoint (ADMIN + ANALYST can triage)
router.put(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  alertController.updateAlertStatus,
);

// Full alert update (admin only)
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