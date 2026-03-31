/**
 * auth.test.js — unit tests for src/auth.js
 *
 * Run with: npm test  (node --test)
 * Node >= 22 required for node:test.
 */

import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  login,
  logout,
  isValidSession,
  getSessionUser,
  hashPassword,
  verifyPassword,
  SESSION_TTL_MS,
  _setSessionLastActivity,
  _getSessionStore,
} from '../src/auth.js';

// ---------------------------------------------------------------------------
// Helper: clear all sessions between tests so state does not bleed.
// ---------------------------------------------------------------------------
afterEach(() => {
  _getSessionStore().clear();
});

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
describe('hashPassword / verifyPassword', () => {
  it('returns a non-empty hash and salt', () => {
    const { hash, salt } = hashPassword('secret');
    assert.ok(hash.length > 0, 'hash must be non-empty');
    assert.ok(salt.length > 0, 'salt must be non-empty');
  });

  it('produces a deterministic hash for the same password+salt', () => {
    const { hash: h1, salt } = hashPassword('secret');
    const { hash: h2 } = hashPassword('secret', salt);
    assert.equal(h1, h2);
  });

  it('produces different hashes for the same password with different salts', () => {
    const { hash: h1 } = hashPassword('secret');
    const { hash: h2 } = hashPassword('secret');
    // Two independently salted hashes should almost certainly differ.
    assert.notEqual(h1, h2);
  });

  it('hash does not contain the plaintext password', () => {
    const { hash, salt } = hashPassword('myplaintextpassword');
    assert.ok(!hash.includes('myplaintextpassword'), 'plaintext must not appear in hash');
    assert.ok(!salt.includes('myplaintextpassword'), 'plaintext must not appear in salt');
  });

  it('verifyPassword returns true for the correct password', () => {
    const pw = 'correct-horse';
    const { hash, salt } = hashPassword(pw);
    assert.ok(verifyPassword(pw, hash, salt));
  });

  it('verifyPassword returns false for a wrong password', () => {
    const { hash, salt } = hashPassword('correct-horse');
    assert.ok(!verifyPassword('wrong-horse', hash, salt));
  });

  it('verifyPassword returns false when salt is wrong', () => {
    const { hash } = hashPassword('correct-horse', 'aabbcc');
    assert.ok(!verifyPassword('correct-horse', hash, 'ddeeff'));
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
describe('login', () => {
  it('returns a non-empty token string for valid credentials', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    assert.ok(typeof token === 'string' && token.length > 0);
  });

  it('returns a different token on each successful login', () => {
    const { token: t1 } = login('alice', 'correct-horse-battery-staple');
    const { token: t2 } = login('alice', 'correct-horse-battery-staple');
    assert.notEqual(t1, t2);
  });

  it('throws for an unknown username', () => {
    assert.throws(
      () => login('nobody', 'doesnt-matter'),
      { message: 'Invalid credentials' },
    );
  });

  it('throws for a wrong password', () => {
    assert.throws(
      () => login('alice', 'wrong-password'),
      { message: 'Invalid credentials' },
    );
  });

  it('does not leak which field was wrong in the error message', () => {
    // Both bad-username and bad-password produce the same message.
    let msgBadUser, msgBadPass;
    try { login('nobody', 'x'); } catch (e) { msgBadUser = e.message; }
    try { login('alice', 'x'); } catch (e) { msgBadPass = e.message; }
    assert.equal(msgBadUser, msgBadPass);
  });

  it('works for second user (bob)', () => {
    const { token } = login('bob', 'tr0ub4dor&3');
    assert.ok(token.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Session validity — basic
// ---------------------------------------------------------------------------
describe('isValidSession', () => {
  it('returns true immediately after login', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    assert.ok(isValidSession(token));
  });

  it('returns false for a random unknown token', () => {
    assert.ok(!isValidSession('deadbeef'.repeat(8)));
  });

  it('returns false for an empty string', () => {
    assert.ok(!isValidSession(''));
  });

  it('getSessionUser returns the username for a valid token', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    assert.equal(getSessionUser(token), 'alice');
  });

  it('getSessionUser returns null for an unknown token', () => {
    assert.equal(getSessionUser('not-a-real-token'), null);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
describe('logout', () => {
  it('invalidates an active session token', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    assert.ok(isValidSession(token), 'precondition: token should be valid');
    logout(token);
    assert.ok(!isValidSession(token), 'token should be invalid after logout');
  });

  it('does not throw when called with an unknown token', () => {
    assert.doesNotThrow(() => logout('nonexistent-token'));
  });

  it('does not throw when called twice on the same token', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    logout(token);
    assert.doesNotThrow(() => logout(token));
  });

  it('only invalidates the specified token, not other sessions', () => {
    const { token: t1 } = login('alice', 'correct-horse-battery-staple');
    const { token: t2 } = login('bob',   'tr0ub4dor&3');
    logout(t1);
    assert.ok(!isValidSession(t1), 't1 should be invalid');
    assert.ok(isValidSession(t2),  't2 should still be valid');
  });
});

// ---------------------------------------------------------------------------
// Session expiry
// ---------------------------------------------------------------------------
describe('session expiry', () => {
  it('returns false for a token whose lastActivity is older than SESSION_TTL_MS', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    // Backdate activity to just past the TTL.
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS - 1);
    assert.ok(!isValidSession(token), 'expired token must be invalid');
  });

  it('cleans up the session store entry on expiry detection', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS - 1);
    isValidSession(token); // trigger expiry cleanup
    assert.ok(!_getSessionStore().has(token), 'expired session must be removed from store');
  });

  it('returns true for a token whose lastActivity is just within SESSION_TTL_MS', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    // One millisecond inside the window.
    _setSessionLastActivity(token, Date.now() - SESSION_TTL_MS + 1);
    assert.ok(isValidSession(token), 'non-expired token must be valid');
  });

  it('SESSION_TTL_MS is 30 minutes', () => {
    assert.equal(SESSION_TTL_MS, 30 * 60 * 1000);
  });

  it('isValidSession slides the expiry window (refreshes lastActivity)', () => {
    const { token } = login('alice', 'correct-horse-battery-staple');
    const before = Date.now();
    _setSessionLastActivity(token, before - 1000); // 1 second ago
    assert.ok(isValidSession(token)); // should refresh
    const session = _getSessionStore().get(token);
    assert.ok(session.lastActivity >= before, 'lastActivity should be refreshed');
  });
});
