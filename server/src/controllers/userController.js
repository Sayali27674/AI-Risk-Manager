const User = require('../models/prisma').User;

// Register a new user
exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const newUser = await User.create({
            data: {
                username,
                email,
                password, // Note: Password should be hashed before saving
            },
        });
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

// Get user details
exports.getUserDetails = async (req, res) => {
    const userId = req.user.id; // Assuming user ID is stored in the token

    try {
        const user = await User.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user details', error });
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.id; // Assuming user ID is stored in the token
    const { username, email } = req.body;

    try {
        const updatedUser = await User.update({
            where: { id: userId },
            data: {
                username,
                email,
            },
        });
        res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user profile', error });
    }
};