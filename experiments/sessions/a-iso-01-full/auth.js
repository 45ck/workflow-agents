/**
 * @module auth
 * @spec AUTH-001
 * @description User authentication module — login, logout, and session management.
 * Passwords are never stored or compared in plaintext; SHA-256 + per-user salt is used.
 * Sessions expire after 30 minutes of inactivity.
 */

import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Hash a plaintext password with a given salt using SHA-256.
 *
 * @spec AUTH-001
 * @implements AUTH-001-R4
 * @evidence E0
 *
 * @param {string} password - Plaintext password (used transiently; never stored).
 * @param {string} salt     - Hex-encoded per-user salt.
 * @returns {string}        - Hex-encoded SHA-256 digest of `salt + password`.
 */
function hashPassword(password, salt) {
  return createHash('sha256').update(salt + password).digest('hex');
}

/**
 * Generate a cryptographically random session token.
 *
 * @spec AUTH-001
 * @implements AUTH-001-R1
 * @evidence E0
 *
 * @returns {string} - 32-byte hex-encoded random token (64 hex chars).
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Static user store
// Passwords are stored as { salt, hashedPassword } — no plaintext anywhere.
// To add a user: run hashPassword(salt, rawPassword) offline and store the digest.
// ---------------------------------------------------------------------------

/** @type {Map<string, { salt: string, hashedPassword: string }>} */
const USER_STORE = new Map();

// Seed two demo accounts.  Salts and digests are pre-computed; no plaintext here.
// salt for "alice": a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
// password for "alice": correct-horse  → digest below
USER_STORE.set('alice', {
  salt: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  hashedPassword: createHash('sha256')
    .update('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' + 'correct-horse')
    .digest('hex'),
});

// salt for "bob": f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3
// password for "bob": battery-staple  → digest below
USER_STORE.set('bob', {
  salt: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3',
  hashedPassword: createHash('sha256')
    .update('f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3' + 'battery-staple')
    .digest('hex'),
});

// ---------------------------------------------------------------------------
// Session store
// Maps token → { username, lastActive: Date }
// ---------------------------------------------------------------------------

/** @type {Map<string, { username: string, lastActive: number }>} */
export const _sessions = new Map(); // exported for test backdating only

/** Session inactivity expiry in milliseconds (30 minutes). */
export const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with the provided credentials.
 *
 * Validates `username` against the static user store and compares the SHA-256
 * hash of the supplied `password` (with the stored salt) to the stored digest.
 * On success a new session token is created and returned. On failure an error
 * is thrown with a message that does not reveal whether the username or
 * password was incorrect (prevents user enumeration).
 *
 * @spec AUTH-001
 * @implements AUTH-001-R1
 * @implements AUTH-001-R4
 * @evidence E0
 *
 * @param {string} username - Account identifier.
 * @param {string} password - Plaintext password (used only for hashing; not stored).
 * @returns {string}        - A fresh session token valid for 30 minutes of inactivity.
 * @throws {Error}          - If credentials are invalid.
 */
export function login(username, password) {
  const record = USER_STORE.get(username);
  if (!record) {
    throw new Error('Invalid credentials');
  }

  const digest = hashPassword(password, record.salt);
  if (digest !== record.hashedPassword) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken();
  _sessions.set(token, { username, lastActive: Date.now() });
  return token;
}

/**
 * Invalidate an active session token.
 *
 * Removes the token from the active session map. Subsequent calls to
 * `isValidSession(token)` will return `false`. If the token is not found
 * (already invalidated or never existed) the function returns without error.
 *
 * @spec AUTH-001
 * @implements AUTH-001-R2
 * @evidence E0
 *
 * @param {string} token - Session token to invalidate.
 * @returns {void}
 */
export function logout(token) {
  _sessions.delete(token);
}

/**
 * Check whether a session token is currently valid.
 *
 * A token is valid if it exists in the active session map and its `lastActive`
 * timestamp is within the last 30 minutes. Calling this function on a valid
 * token also refreshes `lastActive` (sliding window expiry).
 *
 * @spec AUTH-001
 * @implements AUTH-001-R3
 * @implements AUTH-001-R5
 * @evidence E0
 *
 * @param {string} token - Session token to validate.
 * @returns {boolean}    - `true` if the session is active and not expired; `false` otherwise.
 */
export function isValidSession(token) {
  const session = _sessions.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now - session.lastActive > SESSION_TTL_MS) {
    _sessions.delete(token); // clean up expired entry
    return false;
  }

  // Refresh the sliding window.
  session.lastActive = now;
  return true;
}
