import express from 'express';
import passport from 'passport';
import { getRequestOrigin, normalizeReturnTo } from '../utils/redirect.js';

const router = express.Router();

router.get('/google', (req, res, next) => {
  const origin = getRequestOrigin(req);
  let returnTo = normalizeReturnTo(req.query.returnTo, origin);

  if (returnTo === '/' && req.headers.referer) {
    try {
      const refUrl = new URL(req.headers.referer);
      if (refUrl.origin === origin && !['/Login.html', '/Register.html'].includes(refUrl.pathname)) {
        returnTo = normalizeReturnTo(`${refUrl.pathname}${refUrl.search}${refUrl.hash}`, origin);
      }
    } catch {
      returnTo = '/';
    }
  }

  req.session.returnTo = returnTo;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: encodeURIComponent(returnTo)
  })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/Login.html?error=google-login-failed',
    failureMessage: true
  }),
  (req, res) => {
    const origin = getRequestOrigin(req);
    const sessionReturnTo = normalizeReturnTo(req.session?.returnTo, origin);

    let stateReturnTo = '/';
    if (req.query.state) {
      try {
        stateReturnTo = normalizeReturnTo(decodeURIComponent(req.query.state), origin);
      } catch {
        stateReturnTo = '/';
      }
    }

    if (req.session) {
      req.session.returnTo = null;
    }

    const redirectTo = stateReturnTo !== '/' ? stateReturnTo : sessionReturnTo;
    res.redirect(redirectTo || '/');
  }
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Google authentication failed.' });
});

export default router;
