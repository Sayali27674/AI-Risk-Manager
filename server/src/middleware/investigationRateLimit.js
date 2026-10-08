const WINDOW_MS = Number(process.env.INVESTIGATION_RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.INVESTIGATION_RATE_LIMIT_MAX || 20);
const buckets = new Map();

function investigationRateLimit(req, res, next) {
  const key = `${req.user?.id || 'anon'}:${req.ip}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many investigation requests. Please try again shortly.',
    });
  }

  return next();
}

module.exports = investigationRateLimit;
