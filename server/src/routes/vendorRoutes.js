const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const vendorController = require('../controllers/vendorController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  authorizeRoles('ADMIN', 'ANALYST'),
  vendorController.getVendors,
);

router.get(
  '/:id',
  authorizeRoles('ADMIN', 'ANALYST'),
  vendorController.getVendorById,
);

router.post(
  '/',
  authorizeRoles('ADMIN'),
  vendorController.createVendor,
);

router.put(
  '/:id',
  authorizeRoles('ADMIN'),
  vendorController.updateVendor,
);

router.delete(
  '/:id',
  authorizeRoles('ADMIN'),
  vendorController.deleteVendor,
);

module.exports = router;