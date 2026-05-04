import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.get('/google', authController.startGoogleAuth);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/Login.html?error=google-login-failed',
    failureMessage: true
  }),
  authController.finishGoogleAuth
);

router.get('/google/failure', authController.googleFailure);

export default router;
