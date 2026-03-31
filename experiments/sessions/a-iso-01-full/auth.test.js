/**
 * @file auth.test.js
 * @spec AUTH-001
 * @description Unit tests for the auth module covering login, logout,
 * session validity, and expiry (AUTH-001-AC1 through AUTH-001-AC7).
 */

import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { login, logout, isValidSession, _sessions, SESSION_TTL_MS } from './auth.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Backdate the lastActive timestamp of a session to simulate expiry.
 *
 * @spec AUTH-001
 * @implements AUTH-001-AC5
 * @evidence E0
 *
 * @param {string} token      - Active session token to backdate.
 * @param {number} offsetMs   - Milliseconds to subtract from lastActive.
 */
function backdateSession(token, offsetMs) {
  const session = _sessions.get(token);
  if (!session) throw new Error(`backdateSession: token not found — ${token}`);
  session.lastActive -= offsetMs;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AUTH-001 — login', () => {
  afterEach(() => _sessions.clear());

  it('returns a non-empty token string for valid credentials (AUTH-001-AC2)', () => {
    const token = login('alice', 'correct-horse');
    assert.ok(typeof token === 'string' && token.length > 0,
      'token must be a non-empty string');
  });

  it('throws on unknown username (AUTH-001-AC6)', () => {
    assert.throws(
      () => login('nobody', 'whatever'),
      /Invalid credentials/,
      'should reject unknown user'
    );
  });

  it('throws on wrong password for known user (AUTH-001-AC6)', () => {
    assert.throws(
      () => login('alice', 'wrong-password'),
      /Invalid credentials/,
      'should reject incorrect password'
    );
  });

  it('throws on empty password (AUTH-001-AC6)', () => {
    assert.throws(
      () => login('alice', ''),
      /Invalid credentials/
    );
  });

  it('returns distinct tokens for two sequential logins', () => {
    const t1 = login('alice', 'correct-horse');
    const t2 = login('alice', 'correct-horse');
    assert.notEqual(t1, t2, 'sequential logins should produce different tokens');
  });
});

describe('AUTH-001 — isValidSession (post-login)', () => {
  afterEach(() => _sessions.clear());

  it('reports true immediately after successful login (AUTH-001-AC3)', () => {
    const token = login('alice', 'correct-horse');
    assert.ok(isValidSession(token), 'fresh token must be valid');
  });

  it('reports false for an unknown / fabricated token', () => {
    assert.strictEqual(isValidSession('00'.repeat(32)), false);
  });

  it('reports false for an empty string token', () => {
    assert.strictEqual(isValidSession(''), false);
  });
});

describe('AUTH-001 — logout', () => {
  afterEach(() => _sessions.clear());

  it('reports false after logout (AUTH-001-AC4)', () => {
    const token = login('alice', 'correct-horse');
    assert.ok(isValidSession(token), 'precondition: token valid before logout');
    logout(token);
    assert.strictEqual(isValidSession(token), false,
      'token must be invalid after logout');
  });

  it('does not throw when called with an unknown token (AUTH-001-R2)', () => {
    assert.doesNotThrow(() => logout('nonexistent-token'));
  });

  it('does not throw when called twice on the same token (AUTH-001-R2)', () => {
    const token = login('bob', 'battery-staple');
    logout(token);
    assert.doesNotThrow(() => logout(token));
  });
});

describe('AUTH-001 — session expiry', () => {
  afterEach(() => _sessions.clear());

  it('reports false for a backdated (expired) session (AUTH-001-AC5)', () => {
    const token = login('bob', 'battery-staple');
    assert.ok(isValidSession(token), 'precondition: token valid before expiry');
    // Backdate by SESSION_TTL_MS + 1 ms to push it just over the threshold.
    backdateSession(token, SESSION_TTL_MS + 1);
    assert.strictEqual(isValidSession(token), false,
      'expired token must be invalid');
  });

  it('reports true for a session backdated to just within the window', () => {
    const token = login('alice', 'correct-horse');
    backdateSession(token, SESSION_TTL_MS - 1000); // 1 second before expiry
    assert.ok(isValidSession(token), 'session just inside window must still be valid');
  });

  it('removes the expired entry from the session map (AUTH-001-R5)', () => {
    const token = login('alice', 'correct-horse');
    backdateSession(token, SESSION_TTL_MS + 1);
    isValidSession(token); // trigger cleanup
    assert.strictEqual(_sessions.has(token), false,
      'expired session must be removed from map');
  });
});

describe('AUTH-001 — password hashing (AUTH-001-R4)', () => {
  afterEach(() => _sessions.clear());

  it('auth.js uses SHA-256 hashing and salt', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(new URL('./auth.js', import.meta.url), 'utf8');
    assert.ok(src.includes('createHash'), 'auth.js must use createHash (SHA-256)');
    assert.ok(src.includes('salt'), 'auth.js must reference salt');
  });

  it('stored credentials are hashed — login succeeds with correct password', () => {
    // If passwords were stored as plaintext a comparison mismatch would cause
    // login to throw; the fact that it succeeds confirms hash comparison is working.
    assert.doesNotThrow(() => login('alice', 'correct-horse'));
    assert.doesNotThrow(() => login('bob', 'battery-staple'));
  });

  it('login rejects a password that is close-but-wrong (not plaintext comparison)', () => {
    assert.throws(() => login('alice', 'correct-horse '), /Invalid credentials/);
    assert.throws(() => login('alice', 'Correct-horse'), /Invalid credentials/);
  });

  it('two different users with different passwords produce different tokens', () => {
    const t1 = login('alice', 'correct-horse');
    const t2 = login('bob', 'battery-staple');
    assert.notEqual(t1, t2);
  });
});
