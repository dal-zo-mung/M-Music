import mongoose from 'mongoose';
import passport from 'passport';
import User from '../models/user.js';
import {
  hashPassword,
  isLegacyScryptHash,
  toPublicUser,
  validateLoginPayload,
  validateRegistrationPayload,
  verifyPassword
} from '../services/authService.js';

const SESSION_COOKIE_NAME = 'm_music.sid';

function isSafeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function resolveSafeReturnTo(value, fallback = '/') {
  return isSafeReturnPath(value) ? value : fallback;
}

function createLocalSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = String(userId);
      resolve();
    });
  });
}

function completeLogout(req, res, next, { json = false } = {}) {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);

    if (!req.session) {
      res.clearCookie(SESSION_COOKIE_NAME);
      return json ? res.json({ success: true }) : res.redirect('/');
    }

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);

      res.clearCookie(SESSION_COOKIE_NAME);
      return json ? res.json({ success: true }) : res.redirect('/');
    });
  });
}

export function startGoogleAuth(req, res, next) {
  let returnTo = '';
  const requestedReturnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';

  if (isSafeReturnPath(requestedReturnTo)) {
    returnTo = requestedReturnTo;
  } else if (req.headers.referer) {
    try {
      const refUrl = new URL(req.headers.referer);
      const origin = `${req.protocol}://${req.get('host')}`;
      if (refUrl.origin === origin) {
        const refererPath = `${refUrl.pathname}${refUrl.search}`;
        returnTo = resolveSafeReturnTo(refererPath, '');
      }
    } catch {
      // Ignore invalid referrers.
    }
  }

  if (returnTo) {
    req.session.returnTo = returnTo;
  }

  const params = {
    scope: ['profile', 'email']
  };

  if (returnTo) {
    params.state = encodeURIComponent(returnTo);
  }

  passport.authenticate('google', params)(req, res, next);
}

export function finishGoogleAuth(req, res) {
  let redirectTo = resolveSafeReturnTo(req.session?.returnTo || '/');

  if (typeof req.query.state === 'string') {
    try {
      const stateReturn = decodeURIComponent(req.query.state);
      redirectTo = resolveSafeReturnTo(stateReturn, redirectTo);
    } catch {
      // Ignore malformed state values.
    }
  }

  if (req.session) {
    delete req.session.returnTo;
  }

  res.redirect(redirectTo);
}

export function googleFailure(req, res) {
  res.status(401).json({ success: false, message: 'Google authentication failed.' });
}

export function logout(req, res, next) {
  completeLogout(req, res, next);
}

export function logoutJson(req, res, next) {
  completeLogout(req, res, next, { json: true });
}

export async function getCurrentUser(req, res, next) {
  try {
    if (req.user) {
      return res.json({ authenticated: true, user: toPublicUser(req.user) });
    }

    const sessionUserId = req.session?.userId;
    if (!sessionUserId || !mongoose.isValidObjectId(sessionUserId)) {
      if (req.session) {
        delete req.session.userId;
      }
      return res.json({ authenticated: false });
    }

    const user = await User.findById(sessionUserId);
    if (!user) {
      delete req.session.userId;
      return res.json({ authenticated: false });
    }

    return res.json({ authenticated: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const validation = validateRegistrationPayload(req.body);
    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message
      });
    }

    const { username, firstName, lastName, password } = validation.data;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'That username is already taken.'
      });
    }

    const user = await User.create({
      username,
      password: hashPassword(password),
      firstName,
      lastName
    });

    await createLocalSession(req, user._id);
    return res.status(201).json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validation = validateLoginPayload(req.body);
    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message
      });
    }

    const { username, password } = validation.data;
    const user = await User.findOne({ username });

    if (!user || !user.password || !verifyPassword(password, user.password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    if (isLegacyScryptHash(user.password)) {
      user.password = hashPassword(password);
      await user.save();
    }

    await createLocalSession(req, user._id);
    return res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}
