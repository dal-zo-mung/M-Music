import express from 'express';
import * as authController from '../controllers/authController.js';
import { authWriteLimiter } from '../middleware/authRateLimit.js';

const router = express.Router();

router.get('/logout', authController.logout);
router.post('/logout', authController.logoutJson);
router.get('/me', authController.getCurrentUser);
router.post('/register', authWriteLimiter, authController.register);
router.post('/login', authWriteLimiter, authController.login);

export default router;
