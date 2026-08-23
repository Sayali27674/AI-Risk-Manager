const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../models/prisma');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
  );
}

function validateCredentials({ name, email, password, confirmPassword }) {
  if (!name || name.trim().length < 2) {
    return 'Name must contain at least 2 characters';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'A valid email is required';
  }

  if (!password || password.length < 8) {
    return 'Password must contain at least 8 characters';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}

async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const validationError = validateCredentials(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'USER',
      },
    });

    return res.status(201).json({
      user: publicUser(user),
      token: createToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    const validPassword = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !validPassword) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    return res.json({
      user: publicUser(user),
      token: createToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  // JWT authentication is stateless. The client must delete its token.
  return res.json({
    message: 'Logged out successfully. Remove the token on the client.',
  });
}

module.exports = {
  register,
  login,
  me,
  logout,
};