/**
 * @module auth
 * @spec AUTH-001
 * @description User authentication module — login, logout, and session management.
 * No plaintext passwords are stored or compared. All hashing uses SHA-256 + salt
 * via node:crypto.
 */

import { randomBytes, createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * In-memory user store.
 * Each entry: { salt: string, hash: string }
 * Populated via initUsers() — never stores plaintext passwords.
 * @type {Map<string, { salt: string, hash: string }>}
 */
const users = new Map();

/**
 * Active sessions.
 * Each entry: { expiresAt: number } where expiresAt is Date.now() ms.
 * @type {Map<string, { expiresAt: number }>}
 */
const sessions = new Map();

/** Session TTL in milliseconds (30 minutes sliding window). */
const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Hash a password with a given salt using SHA-256.
 *
 * @spec AUTH-001
 * @implements REQ-4
 * @evidence E0
 *
 * @param {string} password - The plaintext password (used only transiently, never stored).
 * @param {string} salt - Hex-encoded salt string.
 * @returns {string} Hex-encoded SHA-256 digest of `salt + password`.
 */
function hashPassword(password, salt) {
  return createHash('sha256').update(salt + password).digest('hex');
}

/**
 * Generate a cryptographically random hex token.
 *
 * @spec AUTH-001
 * @implements REQ-1
 * @evidence E0
 *
 * @param {number} [bytes=32] - Number of random bytes (token length = bytes * 2 hex chars).
 * @returns {string} Non-empty hex string.
 */
function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the in-memory user store with hashed credentials.
 * Call this once at startup. Clears any previously registered users.
 *
 * @spec AUTH-001
 * @implements REQ-4
 * @evidence E0
 *
 * @param {Array<{ username: string, password: string }>} userList
 *   Array of { username, password } pairs. Passwords are hashed immediately;
 *   plaintext values are not retained.
 * @returns {void}
 */
export function initUsers(userList) {
  users.clear();
  for (const { username, password } of userList) {
    const salt = randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    users.set(username, { salt, hash });
  }
}

/**
 * Attempt to log in with the given credentials.
 *
 * @spec AUTH-001
 * @implements REQ-1
 * @evidence E0
 *
 * @param {string} username
 * @param {string} password - Plaintext password used only for comparison; never stored.
 * @returns {{ token: string }} Object containing the session token on success.
 * @throws {Error} With `.code` set to `'INVALID_CREDENTIALS'` on failure.
 */
export function login(username, password) {
  const record = users.get(username);
  if (!record) {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const hash = hashPassword(password, record.salt);
  if (hash !== record.hash) {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = generateToken();
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return { token };
}

/**
 * Invalidate a session token.
 *
 * @spec AUTH-001
 * @implements REQ-2
 * @evidence E0
 *
 * @param {string} token - The session token to invalidate.
 * @returns {void}
 * Idempotent: calling logout on an already-invalid or unknown token is a no-op.
 */
export function logout(token) {
  sessions.delete(token);
}

/**
 * Check whether a session token is currently valid.
 * Implements a 30-minute sliding expiration window: each successful check
 * extends the session by another SESSION_TTL_MS milliseconds.
 *
 * @spec AUTH-001
 * @implements REQ-3
 * @evidence E0
 *
 * @param {string} token - The session token to validate.
 * @returns {boolean} `true` if the token exists and has not expired; `false` otherwise.
 */
export function isValidSession(token) {
  const session = sessions.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now >= session.expiresAt) {
    sessions.delete(token);
    return false;
  }

  // Sliding window: reset expiry on each valid check.
  session.expiresAt = now + SESSION_TTL_MS;
  return true;
}

/**
 * Return the number of currently active (non-expired) sessions.
 * Useful for testing and diagnostics.
 *
 * @spec AUTH-001
 * @implements REQ-3
 * @evidence E0
 *
 * @returns {number}
 */
export function activeSessionCount() {
  const now = Date.now();
  let count = 0;
  for (const session of sessions.values()) {
    if (now < session.expiresAt) count++;
  }
  return count;
}

/**
 * Clear all sessions and users. Intended for test teardown only.
 *
 * @spec AUTH-001
 * @implements REQ-3
 * @evidence E0
 *
 * @returns {void}
 */
export function _reset() {
  sessions.clear();
  users.clear();
}
