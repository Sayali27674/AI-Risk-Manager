const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DB_URL: process.env.DB_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h',
};