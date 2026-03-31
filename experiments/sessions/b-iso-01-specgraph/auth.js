/**
 * @spec AUTH-001
 * @module auth
 *
 * User authentication module.
 * SHA-256 + per-user salt password hashing via node:crypto.
 * In-memory session store with 30-minute sliding inactivity expiry.
 * No external packages. ESM.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// @spec AUTH-001 @implements AUTH-001-R05 @evidence E0
// ---------------------------------------------------------------------------

/** Inactivity window before a session is considered expired (30 minutes). */
export const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Hash a password with a hex salt using SHA-256.
 *
 * @spec AUTH-001 @implements AUTH-001-R04 @evidence E0
 * @param {string} password - Plaintext password (used only during hashing, never stored).
 * @param {string} salt     - Per-user hex salt string.
 * @returns {string} Hex-encoded SHA-256 digest.
 */
function hashPassword(password, salt) {
  return createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Compare two hex digest strings in constant time.
 *
 * @spec AUTH-001 @implements AUTH-001-R04 @evidence E0
 * @param {string} a - First hex digest.
 * @param {string} b - Second hex digest.
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// User store (static in-memory)
// @spec AUTH-001 @implements AUTH-001-R01 @evidence E0
//
// Passwords are stored as { salt, hash } — no plaintext.
// Salt is generated once at module load time per user entry.
// ---------------------------------------------------------------------------

/**
 * Build a user record from a plaintext password.
 *
 * @spec AUTH-001 @implements AUTH-001-R04 @evidence E0
 * @param {string} plaintext
 * @returns {{ salt: string, hash: string }}
 */
function makeUserRecord(plaintext) {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(plaintext, salt);
  return { salt, hash };
}

/**
 * In-memory user store: Map<username, { salt: string, hash: string }>.
 * Populated at module initialisation — no plaintext passwords stored.
 *
 * @spec AUTH-001 @implements AUTH-001-R01 AUTH-001-R04 @evidence E0
 */
export const _users = new Map([
  ['alice', makeUserRecord('correct-horse-battery-staple')],
  ['bob',   makeUserRecord('hunter2')],
]);

// ---------------------------------------------------------------------------
// Session store
// @spec AUTH-001 @implements AUTH-001-R03 AUTH-001-R05 @evidence E0
//
// Map<token, { username: string, lastActivity: number }>
// ---------------------------------------------------------------------------

/** @type {Map<string, { username: string, lastActivity: number }>} */
export const _sessions = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with the supplied credentials.
 *
 * @spec AUTH-001 @implements AUTH-001-R01 @evidence E0
 *
 * @param {string} username
 * @param {string} password - Plaintext; compared via SHA-256+salt, never stored.
 * @returns {string} A cryptographically random hex session token.
 * @throws {Error} If credentials are invalid (deliberately vague message).
 */
export function login(username, password) {
  const user = _users.get(username);

  // Always compute hash even for unknown users to make timing uniform.
  const dummySalt = '0000000000000000000000000000000000000000000000000000000000000000';
  const candidate = hashPassword(password, user ? user.salt : dummySalt);
  const stored    = user ? user.hash : hashPassword('', dummySalt);

  const valid = user !== undefined && safeEqual(candidate, stored);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = randomBytes(32).toString('hex');
  _sessions.set(token, { username, lastActivity: Date.now() });
  return token;
}

/**
 * Invalidate an active session.
 *
 * @spec AUTH-001 @implements AUTH-001-R02 @evidence E0
 *
 * @param {string} token - Session token to invalidate.
 * @returns {void} No-op if token is unknown.
 */
export function logout(token) {
  _sessions.delete(token);
}

/**
 * Check whether a session token is currently valid (exists and not expired).
 * Refreshes the last-activity timestamp on success (sliding window).
 * Removes expired sessions as a side-effect.
 *
 * @spec AUTH-001 @implements AUTH-001-R03 AUTH-001-R05 @evidence E0
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isValidSession(token) {
  const session = _sessions.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now - session.lastActivity >= SESSION_TTL_MS) {
    _sessions.delete(token);
    return false;
  }

  // Refresh sliding window.
  session.lastActivity = now;
  return true;
}
