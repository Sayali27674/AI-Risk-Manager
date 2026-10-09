const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'auth-controller-test-secret';
process.env.NODE_ENV = 'development';

const prismaPath = require.resolve('../models/prisma');
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: {
    user: {
      findUnique: async () => null,
      create: async () => {
        throw new Error('Unexpected user.create call');
      },
    },
  },
};

const prisma = require('../models/prisma');
const authController = require('./authController');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('register stores selected role, hashes the password, and signs role and user ID', async () => {
  const user = {
    id: 17,
    name: 'Analyst User',
    email: 'analyst@test.com',
    role: 'ANALYST',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let createdData;
  prisma.user.create = async ({ data }) => {
    createdData = data;
    return { ...user, ...data };
  };
  const res = response();

  await authController.register({
    body: {
      name: user.name,
      email: user.email,
      password: 'StrongTestPassword123!',
      role: 'ANALYST',
    },
  }, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.role, 'ANALYST');
  assert.equal(createdData.role, 'ANALYST');
  assert.notEqual(createdData.passwordHash, 'StrongTestPassword123!');
  assert.equal(
    await bcrypt.compare('StrongTestPassword123!', createdData.passwordHash),
    true,
  );
  const token = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(token.sub, String(user.id));
  assert.equal(token.role, 'ANALYST');
});

test('register defaults an omitted role to USER', async () => {
  let createdRole;
  prisma.user.create = async ({ data }) => {
    createdRole = data.role;
    return {
      id: 18,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
  const res = response();

  await authController.register({
    body: {
      name: 'Default User',
      email: 'user@test.com',
      password: 'StrongTestPassword123!',
    },
  }, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(createdRole, 'USER');
  assert.equal(res.body.user.role, 'USER');
});

test('register rejects unsupported roles before creating a user', async () => {
  let createCalled = false;
  prisma.user.create = async () => {
    createCalled = true;
  };
  const res = response();

  await authController.register({
    body: {
      name: 'Invalid Role',
      email: 'invalid@test.com',
      password: 'StrongTestPassword123!',
      role: 'SUPERADMIN',
    },
  }, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Role must be ADMIN, ANALYST, or USER/);
  assert.equal(createCalled, false);
});

test('register cannot assign a selected role outside development', async () => {
  let createCalled = false;
  prisma.user.create = async () => {
    createCalled = true;
  };
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const res = response();

  try {
    await authController.register({
      body: {
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'StrongTestPassword123!',
        role: 'ADMIN',
      },
    }, res, (error) => {
      throw error;
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /only available in development/);
  assert.equal(createCalled, false);
});

test('register rejects invalid name, email, and password values', async () => {
  const invalidRequests = [
    { name: 'A', email: 'valid@test.com', password: 'StrongTestPassword123!' },
    { name: 'Valid Name', email: 'not-an-email', password: 'StrongTestPassword123!' },
    { name: 'Valid Name', email: 'valid@test.com', password: 'short' },
  ];
  let createCalled = false;
  prisma.user.create = async () => {
    createCalled = true;
  };

  for (const body of invalidRequests) {
    const res = response();
    await authController.register({ body }, res, (error) => {
      throw error;
    });
    assert.equal(res.statusCode, 400);
  }

  assert.equal(createCalled, false);
});

test('login returns the database role and signs that role into the token', async () => {
  const passwordHash = await bcrypt.hash('StrongTestPassword123!', 4);
  prisma.user.findUnique = async () => ({
    id: 19,
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'ADMIN',
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const res = response();

  await authController.login({
    body: {
      email: 'admin@test.com',
      password: 'StrongTestPassword123!',
    },
  }, res, (error) => {
    throw error;
  });

  assert.equal(res.body.success, true);
  assert.equal(res.body.user.role, 'ADMIN');
  const token = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(token.sub, '19');
  assert.equal(token.role, 'ADMIN');
});

test('me returns the persisted user role', async () => {
  prisma.user.findUnique = async () => ({
    id: 20,
    name: 'Analyst User',
    email: 'analyst@test.com',
    role: 'ANALYST',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const res = response();

  await authController.me({ user: { id: 20 } }, res, (error) => {
    throw error;
  });

  assert.equal(res.body.success, true);
  assert.equal(res.body.user.role, 'ANALYST');
});
