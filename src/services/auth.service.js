import bcrypt from 'bcrypt';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import User from '../models/user.js';

const PASSWORD_HASH_KEY_LENGTH = 64;
const BCRYPT_ROUNDS = 12;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username || null,
    displayName: user.displayName || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    profileImage: user.profileImage || null,
    role: user.role || 'user',
    authProvider: user.googleId ? 'google' : 'local',
    createdAt: user.createdAt
  };
}

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export function validateUsername(username) {
  if (!username) {
    return 'Username is required.';
  }

  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3-30 characters and use only letters, numbers, dots, underscores, or hyphens.';
  }

  return null;
}

export function validatePassword(password) {
  const rules = [
    { valid: (value) => value.length >= 8, message: 'Password must be at least 8 characters long.' },
    { valid: (value) => /[A-Z]/.test(value), message: 'Password must include at least one uppercase letter.' },
    { valid: (value) => /[a-z]/.test(value), message: 'Password must include at least one lowercase letter.' },
    { valid: (value) => /[0-9]/.test(value), message: 'Password must include at least one number.' },
    { valid: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value), message: 'Password must include at least one special character.' }
  ];

  const errors = rules.filter((rule) => !rule.valid(password)).map((rule) => rule.message);
  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, storedValue) {
  if (!storedValue) return false;

  if (storedValue.includes(':')) {
    const [salt, storedHash] = storedValue.split(':');
    if (!salt || !storedHash) return false;

    const derivedHash = scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH);
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (storedBuffer.length !== derivedHash.length) return false;
    return timingSafeEqual(storedBuffer, derivedHash);
  }

  return bcrypt.compare(password, storedValue);
}

export async function getAuthenticatedUser(req) {
  if (req.user) {
    return req.user;
  }

  if (!req.session?.userId) {
    return null;
  }

  const legacyUser = await User.findById(req.session.userId);
  if (!legacyUser) {
    req.session.userId = null;
    return null;
  }

  return legacyUser;
}

export function createAuthenticatedSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((sessionError) => {
      if (sessionError) return reject(sessionError);

      req.login(user, (loginError) => {
        if (loginError) return reject(loginError);
        resolve();
      });
    });
  });
}

export function destroyAuthenticatedSession(req) {
  return new Promise((resolve, reject) => {
    req.logout((logoutError) => {
      if (logoutError) return reject(logoutError);

      if (!req.session) {
        return resolve();
      }

      req.session.destroy((sessionError) => {
        if (sessionError) return reject(sessionError);
        resolve();
      });
    });
  });
}
