const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/prisma').User; // Adjust the import based on your Prisma setup
const { JWT_SECRET } = require('../config/env');

const authService = {
    register: async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = await User.create({
            data: {
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                role: userData.role || 'USER', // Default role
            },
        });
        return newUser;
    },

    login: async (email, password) => {
        const user = await User.findUnique({ where: { email } });
        if (!user) {
            throw new Error('User not found');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        return { token, user };
    },

    validateToken: (token) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    },
};

module.exports = authService;