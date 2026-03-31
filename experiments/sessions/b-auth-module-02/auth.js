/**
 * auth.js — User authentication module for Node.js
 *
 * Provides login, logout, and session management with SHA-256 + salt
 * password hashing. No HTTP server, no external database.
 *
 * All state is in-memory. Sessions expire after 30 minutes of inactivity
 * (sliding window).
 */

'use strict';

const { createHash, randomBytes } = require('node:crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

/**
 * Hash a plaintext password with a given salt using SHA-256.
 * @param {string} password
 * @param {string} salt  Hex-encoded salt string
 * @returns {string}     Hex-encoded digest
 */
function hashPassword(password, salt) {
  return createHash('sha256')
    .update(salt + password)
    .digest('hex');
}

/**
 * Create a new { salt, hash } credential pair from a plaintext password.
 * @param {string} password
 * @returns {{ salt: string, hash: string }}
 */
function createCredential(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

// ---------------------------------------------------------------------------
// In-memory user store
// Each entry: { salt: string, hash: string }
// ---------------------------------------------------------------------------

const USER_STORE = (() => {
  // Passwords are never stored in plaintext — only salt + hash pairs.
  // These credentials were generated with createCredential() at module init time.
  const store = new Map();

  function addUser(username, password) {
    store.set(username, createCredential(password));
  }

  // Seed with demo users
  addUser('alice', 'hunter2');
  addUser('bob',   'correcthorsebatterystaple');
  addUser('carol', 'Tr0ub4dor&3');

  return store;
})();

// ---------------------------------------------------------------------------
// Session store
// Each entry: { username: string, expiresAt: number }
// ---------------------------------------------------------------------------

/** @type {Map<string, { username: string, expiresAt: number }>} */
const SESSION_STORE = new Map();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random session token (hex string).
 * @returns {string}
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Prune expired sessions from the store (lazy GC).
 */
function pruneExpired() {
  const now = Date.now();
  for (const [token, session] of SESSION_STORE) {
    if (session.expiresAt <= now) {
      SESSION_STORE.delete(token);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with the given credentials.
 *
 * @param {string} username
 * @param {string} password  Plaintext password (never stored)
 * @returns {{ ok: true, token: string } | { ok: false, error: string }}
 */
function login(username, password) {
  const credential = USER_STORE.get(username);

  if (!credential) {
    // Avoid leaking whether the username exists vs. wrong password
    return { ok: false, error: 'Invalid username or password.' };
  }

  const candidate = hashPassword(password, credential.salt);
  if (candidate !== credential.hash) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  pruneExpired();

  const token = generateToken();
  SESSION_STORE.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return { ok: true, token };
}

/**
 * Invalidate a session token. Safe to call on already-invalid tokens.
 *
 * @param {string} token
 * @returns {void}
 */
function logout(token) {
  SESSION_STORE.delete(token);
}

/**
 * Check whether a session token is currently valid.
 * Refreshes the sliding-window expiry on a successful check.
 *
 * @param {string} token
 * @returns {boolean}
 */
function isValidSession(token) {
  const session = SESSION_STORE.get(token);
  if (!session) return false;

  const now = Date.now();
  if (session.expiresAt <= now) {
    SESSION_STORE.delete(token);
    return false;
  }

  // Slide the expiry window
  session.expiresAt = now + SESSION_TTL_MS;
  return true;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  login,
  logout,
  isValidSession,
  // Exported for testing convenience only:
  SESSION_TTL_MS,
  _sessionStore: SESSION_STORE,
  _hashPassword: hashPassword,
  _createCredential: createCredential,
};
