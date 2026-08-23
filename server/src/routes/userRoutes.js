const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('../controllers/userController');
const { validateRegistration, validateLogin, validateProfileUpdate } = require('../validators/authValidators');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// User registration
router.post('/register', validateRegistration, registerUser);

// User login
router.post('/login', validateLogin, loginUser);

// Get user profile (protected route)
router.get('/profile', authMiddleware, getUserProfile);

// Update user profile (protected route)
router.put('/profile', authMiddleware, validateProfileUpdate, updateUserProfile);

module.exports = router;