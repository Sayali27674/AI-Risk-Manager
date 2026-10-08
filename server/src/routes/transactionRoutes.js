const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const transactionController = require('../controllers/transactionController');
const behaviorController = require('../controllers/behaviorController');

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  transactionController.getTransactions,
);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  transactionController.createTransaction,
);

router.post(
  '/:id/recalculate-risk',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  transactionController.recalculateRisk,
);

router.get(
  '/:id/behavior',
  authMiddleware,
  behaviorController.getTransactionBehavior,
);

router.get(
  '/:id',
  authMiddleware,
  transactionController.getTransaction,
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'ANALYST'),
  transactionController.updateTransaction,
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN'),
  transactionController.deleteTransaction,
);

module.exports = router;
