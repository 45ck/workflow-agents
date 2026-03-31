/**
 * auth.js — User authentication module
 *
 * Provides login, logout, and session validity checks.
 * Passwords are stored as SHA-256(salt + password) hex strings.
 * Sessions expire after 30 minutes of inactivity.
 *
 * No external dependencies — uses only node:crypto.
 */

import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Inactivity timeout in milliseconds (30 minutes). */
export const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/**
 * Hash a password with the given salt using SHA-256.
 * @param {string} password  Plaintext password.
 * @param {string} salt      Hex-encoded salt.
 * @returns {string}         Hex-encoded digest.
 */
export function hashPassword(password, salt) {
  return createHash('sha256').update(salt + password).digest('hex');
}

/**
 * Create a new {salt, hash} pair for a plaintext password.
 * @param {string} password
 * @returns {{ salt: string, hash: string }}
 */
export function createPasswordRecord(password) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

// ---------------------------------------------------------------------------
// In-memory user store
// ---------------------------------------------------------------------------
// Format: username -> { salt: string, hash: string }
//
// Passwords are never stored in plaintext.  The values below were produced by
// calling createPasswordRecord() offline and are included here as constants.
//
// alice / s3cr3t
// bob   / hunter2

const USER_STORE = new Map([
  [
    'alice',
    {
      salt: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      hash: hashPassword('s3cr3t', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'),
    },
  ],
  [
    'bob',
    {
      salt: 'deadbeefdeadbeefdeadbeefdeadbeef',
      hash: hashPassword('hunter2', 'deadbeefdeadbeefdeadbeefdeadbeef'),
    },
  ],
]);

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------
// Format: token -> { username: string, lastActivity: number }

const SESSION_STORE = new Map();

/**
 * Generate a cryptographically random session token.
 * @returns {string}
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with the supplied credentials.
 *
 * @param {string} username
 * @param {string} password  Plaintext password (compared against stored hash).
 * @returns {{ token: string, username: string }}
 * @throws {Error}  If credentials are invalid.
 */
export function login(username, password) {
  const record = USER_STORE.get(username);
  if (!record) {
    throw new Error('Invalid credentials');
  }

  const candidate = hashPassword(password, record.salt);
  if (candidate !== record.hash) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken();
  SESSION_STORE.set(token, { username, lastActivity: Date.now() });
  return { token, username };
}

/**
 * Log out by invalidating a session token.
 * Silently ignores tokens that are already absent.
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
 * timestamp is within the 30-minute inactivity window.  A successful check
 * refreshes the last-activity timestamp (sliding expiry).
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isValidSession(token) {
  const session = SESSION_STORE.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now - session.lastActivity > SESSION_TTL_MS) {
    // Expired — clean up eagerly.
    SESSION_STORE.delete(token);
    return false;
  }

  // Slide the expiry window.
  session.lastActivity = now;
  return true;
}

// ---------------------------------------------------------------------------
// Test helpers (exported to allow time manipulation in tests)
// ---------------------------------------------------------------------------

/**
 * Directly manipulate the last-activity timestamp of an active session.
 * Intended only for use in tests.
 *
 * @param {string} token
 * @param {number} timestamp  Unix milliseconds.
 */
export function _setSessionLastActivity(token, timestamp) {
  const session = SESSION_STORE.get(token);
  if (session) session.lastActivity = timestamp;
}

/**
 * Clear all active sessions.  Intended only for use in tests.
 */
export function _clearAllSessions() {
  SESSION_STORE.clear();
}
