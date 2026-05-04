import rateLimit from 'express-rate-limit';

const authWindowMs = Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 5 * 60 * 1000;
const authMaxAttempts = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5;

function getRetryAfterSeconds(req) {
  const resetTime = req.rateLimit?.resetTime;

  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  }

  return Math.max(1, Math.ceil(authWindowMs / 1000));
}

function formatRetryMessage(retryAfterSeconds) {
  if (retryAfterSeconds < 60) {
    return `Too many attempts. Please wait ${retryAfterSeconds} seconds before trying again.`;
  }

  const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Please wait ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'} before trying again.`;
}

export const authWriteLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxAttempts,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    const retryMessage = formatRetryMessage(retryAfterSeconds);

    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      success: false,
      status: 429,
      retryAfterSeconds,
      message: retryMessage,
      error: retryMessage
    });
  }
});
