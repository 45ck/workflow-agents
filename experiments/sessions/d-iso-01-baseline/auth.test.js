/**
 * auth.test.js — Unit tests for the authentication module.
 *
 * Run with:  node --test auth.test.js
 *            (or via `npm test`)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  login,
  logout,
  isValidSession,
  hashPassword,
  createPasswordRecord,
  SESSION_TTL_MS,
  _clearAllSessions,
  _setSessionLastActivity,
} from './auth.js';

// ---------------------------------------------------------------------------
// Helper: reset shared session state before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  _clearAllSessions();
});

// ---------------------------------------------------------------------------
// 1. Password hashing
// ---------------------------------------------------------------------------

describe('password hashing', () => {
  it('hashPassword returns a non-empty hex string', () => {
    const hash = hashPassword('mypassword', 'somesalt');
    assert.ok(typeof hash === 'string' && hash.length > 0);
    // SHA-256 produces 64 hex chars
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
  });

  it('same password + same salt always produces the same hash', () => {
    const h1 = hashPassword('abc', 'saltsalt');
    const h2 = hashPassword('abc', 'saltsalt');
    assert.equal(h1, h2);
  });

  it('different salts produce different hashes for the same password', () => {
    const h1 = hashPassword('abc', 'salt1111');
    const h2 = hashPassword('abc', 'salt2222');
    assert.notEqual(h1, h2);
  });

  it('createPasswordRecord never stores plaintext', () => {
    const { salt, hash } = createPasswordRecord('supersecret');
    assert.ok(!salt.includes('supersecret'), 'salt must not contain plaintext');
    assert.ok(!hash.includes('supersecret'), 'hash must not contain plaintext');
  });

  it('createPasswordRecord produces a verifiable hash', () => {
    const { salt, hash } = createPasswordRecord('verifyMe');
    assert.equal(hashPassword('verifyMe', salt), hash);
  });
});

// ---------------------------------------------------------------------------
// 2. Login
// ---------------------------------------------------------------------------

describe('login', () => {
  it('returns a non-empty token string for valid credentials', () => {
    const { token } = login('alice', 's3cr3t');
    assert.ok(typeof token === 'string' && token.length > 0);
  });

  it('returns the correct username in the result', () => {
    const { username } = login('alice', 's3cr3t');
    assert.equal(username, 'alice');
  });

  it('each login call returns a distinct token', () => {
    const { token: t1 } = login('alice', 's3cr3t');
    const { token: t2 } = login('alice', 's3cr3t');
    assert.notEqual(t1, t2);
  });

  it('throws on unknown username', () => {
    assert.throws(() => login('nobody', 'pass'), /Invalid credentials/);
  });

  it('throws on wrong password', () => {
    assert.throws(() => login('alice', 'wrongpassword'), /Invalid credentials/);
  });

  it('throws on correct username but empty password', () => {
    assert.throws(() => login('alice', ''), /Invalid credentials/);
  });

  it('second user (bob) can also log in', () => {
    const { token } = login('bob', 'hunter2');
    assert.ok(token.length > 0);
  });
});

// ---------------------------------------------------------------------------
// 3. Session validity — immediately after login
// ---------------------------------------------------------------------------

describe('isValidSession — fresh token', () => {
  it('token is valid right after login', () => {
    const { token } = login('alice', 's3cr3t');
    assert.equal(isValidSession(token), true);
  });

  it('unknown / random token is not valid', () => {
    assert.equal(isValidSession('00000000000000000000000000000000'), false);
  });

  it('empty string is not valid', () => {
    assert.equal(isValidSession(''), false);
  });

  it('isValidSession is idempotent for active sessions (slides TTL)', () => {
    const { token } = login('alice', 's3cr3t');
    assert.equal(isValidSession(token), true);
    assert.equal(isValidSession(token), true);
  });
});

// ---------------------------------------------------------------------------
// 4. Logout
// ---------------------------------------------------------------------------

describe('logout', () => {
  it('token is invalid after logout', () => {
    const { token } = login('alice', 's3cr3t');
    assert.equal(isValidSession(token), true);
    logout(token);
    assert.equal(isValidSession(token), false);
  });

  it('logout is idempotent — calling twice does not throw', () => {
    const { token } = login('alice', 's3cr3t');
    logout(token);
    assert.doesNotThrow(() => logout(token));
  });

  it('logout of a never-issued token does not throw', () => {
    assert.doesNotThrow(() => logout('nonexistenttoken'));
  });

  it('logging out one session does not affect another', () => {
    const { token: t1 } = login('alice', 's3cr3t');
    const { token: t2 } = login('bob', 'hunter2');
    logout(t1);
    assert.equal(isValidSession(t1), false);
    assert.equal(isValidSession(t2), true);
  });
});

// ---------------------------------------------------------------------------
// 5. Session expiry
// ---------------------------------------------------------------------------

describe('session expiry', () => {
  it('token is invalid after 30 minutes of inactivity', () => {
    const { token } = login('alice', 's3cr3t');
    // Backdate last-activity by SESSION_TTL_MS + 1 ms.
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS - 1);
    assert.equal(isValidSession(token), false);
  });

  it('token is still valid if inactivity is just under the limit', () => {
    const { token } = login('alice', 's3cr3t');
    // 1 ms before expiry — should still be valid.
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS + 100);
    assert.equal(isValidSession(token), true);
  });

  it('expired token is cleaned from session store (no ghost entries)', () => {
    const { token } = login('alice', 's3cr3t');
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS - 1);
    // First call: detects expiry, removes token.
    assert.equal(isValidSession(token), false);
    // Second call: still invalid (not re-added).
    assert.equal(isValidSession(token), false);
  });

  it('activity before expiry resets the 30-minute window', () => {
    const { token } = login('alice', 's3cr3t');
    // Backdate to 25 minutes ago — still valid, and isValidSession slides it.
    _setSessionLastActivity(token, Date.now() - 25 * 60 * 1000);
    assert.equal(isValidSession(token), true); // slides timestamp to now
    // Now backdate again by only 10 minutes — should still be valid.
    _setSessionLastActivity(token, Date.now() - 10 * 60 * 1000);
    assert.equal(isValidSession(token), true);
  });
});
