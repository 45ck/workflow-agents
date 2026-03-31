/**
 * auth.js — User authentication module
 *
 * Provides login, logout, and session management using SHA-256+salt
 * password hashing (node:crypto). Sessions expire after 30 minutes
 * of inactivity. No external dependencies; ESM only.
 */

import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Session inactivity window in milliseconds (30 minutes). */
export const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Password utilities
// ---------------------------------------------------------------------------

/**
 * Hash a plaintext password with a provided or freshly-generated salt.
 *
 * @param {string} password  - Plaintext password (discarded after hashing).
 * @param {string} [salt]    - Hex salt string. Generated when omitted.
 * @returns {{ hash: string, salt: string }}
 */
export function hashPassword(password, salt) {
  const usedSalt = salt ?? randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(usedSalt + password).digest('hex');
  return { hash, salt: usedSalt };
}

/**
 * Verify a plaintext password against a stored hash+salt pair.
 *
 * @param {string} password   - Plaintext candidate.
 * @param {string} storedHash - Previously computed hash.
 * @param {string} salt       - Salt used when hashing.
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

// ---------------------------------------------------------------------------
// In-memory user store
//
// Credentials are hashed at module initialisation — no plaintext appears
// in storage or at rest.
// ---------------------------------------------------------------------------

function makeUser(password) {
  return hashPassword(password);
}

/** @type {Map<string, { hash: string, salt: string }>} */
const USER_STORE = new Map([
  ['alice', makeUser('correct-horse-battery-staple')],
  ['bob',   makeUser('tr0ub4dor&3')],
]);

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

/**
 * @typedef {{ username: string, lastActivity: number }} Session
 */

/** @type {Map<string, Session>} */
const SESSION_STORE = new Map();

/**
 * Generate a cryptographically random session token.
 *
 * @returns {string} 32-byte hex token.
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with username and password.
 *
 * @param {string} username
 * @param {string} password  - Plaintext; compared via hash only, never stored.
 * @returns {{ token: string }}
 * @throws {Error} If credentials are invalid.
 */
export function login(username, password) {
  const user = USER_STORE.get(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!verifyPassword(password, user.hash, user.salt)) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken();
  SESSION_STORE.set(token, { username, lastActivity: Date.now() });
  return { token };
}

/**
 * Invalidate an active session token.
 *
 * Silently succeeds when the token is unknown or already expired so that
 * callers do not need to guard against double-logout.
 *
 * @param {string} token
 */
export function logout(token) {
  SESSION_STORE.delete(token);
}

/**
 * Check whether a session token is currently valid.
 *
 * A token is valid when it exists in the session store AND its last-activity
 * timestamp is within the SESSION_TTL_MS window. Valid tokens have their
 * lastActivity timestamp refreshed (sliding expiry).
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isValidSession(token) {
  const session = SESSION_STORE.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now - session.lastActivity > SESSION_TTL_MS) {
    // Clean up expired session.
    SESSION_STORE.delete(token);
    return false;
  }

  // Slide the expiry window on each successful check.
  session.lastActivity = now;
  return true;
}

/**
 * Return the username associated with a valid session token, or null.
 *
 * @param {string} token
 * @returns {string | null}
 */
export function getSessionUser(token) {
  if (!isValidSession(token)) return null;
  return SESSION_STORE.get(token)?.username ?? null;
}

// ---------------------------------------------------------------------------
// Test helpers (not part of the public API surface — exported for test use)
// ---------------------------------------------------------------------------

/**
 * Directly manipulate a session's lastActivity timestamp. Used in tests
 * to simulate inactivity expiry without sleeping.
 *
 * @param {string} token
 * @param {number} timestamp - Unix epoch ms to set as lastActivity.
 */
export function _setSessionLastActivity(token, timestamp) {
  const session = SESSION_STORE.get(token);
  if (session) session.lastActivity = timestamp;
}

/**
 * Expose the internal session store for white-box testing only.
 *
 * @returns {Map<string, Session>}
 */
export function _getSessionStore() {
  return SESSION_STORE;
}
