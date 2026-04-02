const rateLimitBuckets = new Map();

export function securityHeaders(req, res, next) {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}

export function requireTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  const allowedOrigins = new Set([`${req.protocol}://${req.get('host')}`]);
  if (process.env.APP_ORIGIN) {
    allowedOrigins.add(process.env.APP_ORIGIN);
  }

  if (allowedOrigins.has(origin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Blocked by origin policy.'
  });
}

export function createRateLimiter({ windowMs, max, message }) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = `${req.path}:${req.ip}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      rateLimitBuckets.set(key, {
        count: 1,
        expiresAt: now + windowMs
      });
      return next();
    }

    if (bucket.count >= max) {
      res.setHeader('Retry-After', Math.ceil((bucket.expiresAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message
      });
    }

    bucket.count += 1;
    return next();
  };
}
