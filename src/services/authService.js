import bcrypt from 'bcrypt';
import { scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_KEY_LENGTH = 64;
const MAX_NAME_LENGTH = 50;
const MAX_PASSWORD_LENGTH = 128;
const USERNAME_PATTERN = /^(?=.{3,30}$)[a-z0-9._-]+$/;

function readString(value) {
  return typeof value === 'string' ? value : '';
}

export function normalizeUsername(value) {
  return readString(value).trim().toLowerCase();
}

export function normalizeName(value) {
  return readString(value).trim();
}

export function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username || null,
    displayName: user.displayName || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    profileImage: user.profileImage || null,
    authProvider: user.googleId ? 'google' : 'local',
    createdAt: user.createdAt
  };
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function isLegacyScryptHash(storedValue) {
  return typeof storedValue === 'string' && storedValue.includes(':');
}

export function verifyPassword(password, storedValue) {
  if (typeof password !== 'string' || typeof storedValue !== 'string' || storedValue.length === 0) {
    return false;
  }

  if (isLegacyScryptHash(storedValue)) {
    const [salt, storedHash] = storedValue.split(':');
    if (!salt || !storedHash) return false;

    const derivedHash = scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH);
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (storedBuffer.length !== derivedHash.length) return false;
    return timingSafeEqual(storedBuffer, derivedHash);
  }

  return bcrypt.compareSync(password, storedValue);
}

export function validatePassword(password) {
  const rules = [
    { valid: (p) => p.length >= 8, message: 'Password must be at least 8 characters long.' },
    { valid: (p) => p.length <= MAX_PASSWORD_LENGTH, message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
    { valid: (p) => /[A-Z]/.test(p), message: 'Password must include at least one uppercase letter.' },
    { valid: (p) => /[a-z]/.test(p), message: 'Password must include at least one lowercase letter.' },
    { valid: (p) => /[0-9]/.test(p), message: 'Password must include at least one number.' },
    { valid: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p), message: 'Password must include at least one special character.' }
  ];

  const errors = rules.filter((rule) => !rule.valid(password)).map((rule) => rule.message);
  return { valid: errors.length === 0, errors };
}

export function validateRegistrationPayload(payload) {
  const username = normalizeUsername(payload?.username);
  const firstName = normalizeName(payload?.firstName);
  const lastName = normalizeName(payload?.lastName);
  const password = readString(payload?.password);

  if (!firstName || !lastName || !username || !password) {
    return {
      valid: false,
      status: 400,
      message: 'Please complete all required fields.'
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      status: 400,
      message: 'Username must be 3-30 characters and use only letters, numbers, dots, underscores, or hyphens.'
    };
  }

  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      status: 400,
      message: `Names must be ${MAX_NAME_LENGTH} characters or fewer.`
    };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return {
      valid: false,
      status: 400,
      message: passwordValidation.errors.join(' ')
    };
  }

  return {
    valid: true,
    data: { username, firstName, lastName, password }
  };
}

export function validateLoginPayload(payload) {
  const username = normalizeUsername(payload?.username);
  const password = readString(payload?.password);

  if (!username || !password) {
    return {
      valid: false,
      status: 400,
      message: 'Username and password are required.'
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      status: 400,
      message: 'Username format is invalid.'
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      status: 400,
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`
    };
  }

  return {
    valid: true,
    data: { username, password }
  };
}
