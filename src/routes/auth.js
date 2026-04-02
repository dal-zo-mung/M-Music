import express from 'express';
import User from '../models/user.js';
import {
  createAuthenticatedSession,
  destroyAuthenticatedSession,
  getAuthenticatedUser,
  hashPassword,
  normalizeUsername,
  toPublicUser,
  validatePassword,
  validateUsername,
  verifyPassword
} from '../services/auth.service.js';
import { createRateLimiter, requireTrustedOrigin } from '../middleware/security.js';

const router = express.Router();
const SESSION_COOKIE_NAME = 'm_music.sid';
const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in a few minutes.'
});
const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many registrations from this connection. Please try again later.'
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({ authenticated: false });
    }

    return res.json({ authenticated: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/register', requireTrustedOrigin, registerRateLimit, async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const password = String(req.body.password || '');

    if (!firstName || !lastName || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.'
      });
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({
        success: false,
        message: usernameError
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join(' ')
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'That username is already taken.'
      });
    }

    const user = await User.create({
      username,
      password: await hashPassword(password),
      firstName,
      lastName
    });

    await createAuthenticatedSession(req, user);
    return res.status(201).json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'That username is already taken.'
      });
    }

    next(error);
  }
});

router.post('/login', requireTrustedOrigin, loginRateLimit, async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const user = await User.findOne({ username });
    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    if (user.password.includes(':')) {
      user.password = await hashPassword(password);
      await user.save();
    }

    await createAuthenticatedSession(req, user);
    return res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireTrustedOrigin, async (req, res, next) => {
  try {
    await destroyAuthenticatedSession(req);
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
