require('dotenv').config();

const app = require('./app');
const { PORT } = require('./config/env');

const port = Number(PORT) || 5000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;