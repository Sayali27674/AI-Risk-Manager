function errorMiddleware(error, req, res, next) {
  console.error(error);

  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'A unique value already exists' });
  }

  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorMiddleware;