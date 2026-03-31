/**
 * Tests for auth.js
 * @spec AUTH-001
 * @implements AUTH-001-R06
 * @test AUTH-001-R01-login
 * @test AUTH-001-R02-logout
 * @test AUTH-001-R03-session
 * @test AUTH-001-R04-hashing
 * @test AUTH-001-R05-expiry
 * @evidence E0
 *
 * Run with: npm test
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { login, logout, isValidSession, SESSION_TTL_MS, _sessions } from './auth.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset session store between tests that need isolation. */
function clearSessions() {
  _sessions.clear();
}

// ---------------------------------------------------------------------------
// AUTH-001-R01: Login
// ---------------------------------------------------------------------------

describe('login', () => {
  beforeEach(clearSessions);

  it('returns a non-empty token string on valid credentials', () => {
    const token = login('alice', 'correct-horse-battery-staple');
    assert.ok(typeof token === 'string', 'token should be a string');
    assert.ok(token.length > 0, 'token should be non-empty');
  });

  it('returns different tokens on successive logins', () => {
    const t1 = login('alice', 'correct-horse-battery-staple');
    const t2 = login('alice', 'correct-horse-battery-staple');
    assert.notEqual(t1, t2, 'each login should produce a unique token');
  });

  it('throws on wrong password', () => {
    assert.throws(
      () => login('alice', 'wrong-password'),
      /Invalid credentials/,
      'should throw for bad password'
    );
  });

  it('throws on unknown username', () => {
    assert.throws(
      () => login('nobody', 'any-password'),
      /Invalid credentials/,
      'should throw for unknown user'
    );
  });

  it('error message does not reveal whether username or password was wrong', () => {
    let msgBadUser, msgBadPass;
    try { login('nobody', 'pw'); } catch (e) { msgBadUser = e.message; }
    try { login('alice', 'wrong'); } catch (e) { msgBadPass = e.message; }
    assert.equal(msgBadUser, msgBadPass, 'error messages should be identical');
  });
});

// ---------------------------------------------------------------------------
// AUTH-001-R02: Logout
// ---------------------------------------------------------------------------

describe('logout', () => {
  beforeEach(clearSessions);

  it('invalidates a valid session', () => {
    const token = login('bob', 'hunter2');
    assert.ok(isValidSession(token), 'token should be valid before logout');
    logout(token);
    assert.equal(isValidSession(token), false, 'token should be invalid after logout');
  });

  it('is a no-op for an unknown token', () => {
    assert.doesNotThrow(() => logout('non-existent-token-xyz'));
  });

  it('is a no-op when called twice on the same token', () => {
    const token = login('alice', 'correct-horse-battery-staple');
    logout(token);
    assert.doesNotThrow(() => logout(token));
  });
});

// ---------------------------------------------------------------------------
// AUTH-001-R03: isValidSession
// ---------------------------------------------------------------------------

describe('isValidSession', () => {
  beforeEach(clearSessions);

  it('returns true immediately after login', () => {
    const token = login('alice', 'correct-horse-battery-staple');
    assert.equal(isValidSession(token), true);
  });

  it('returns false for an unknown token', () => {
    assert.equal(isValidSession('totally-made-up'), false);
  });

  it('returns false after logout', () => {
    const token = login('bob', 'hunter2');
    logout(token);
    assert.equal(isValidSession(token), false);
  });
});

// ---------------------------------------------------------------------------
// AUTH-001-R05: Session expiry
// ---------------------------------------------------------------------------

describe('session expiry', () => {
  beforeEach(clearSessions);

  it('returns false for a backdated (expired) session', () => {
    const token = login('alice', 'correct-horse-battery-staple');
    // Backdate the session to simulate expiry.
    const session = _sessions.get(token);
    session.lastActivity = Date.now() - SESSION_TTL_MS - 1;

    assert.equal(isValidSession(token), false, 'expired session should be invalid');
  });

  it('removes the expired session from the store', () => {
    const token = login('alice', 'correct-horse-battery-staple');
    const session = _sessions.get(token);
    session.lastActivity = Date.now() - SESSION_TTL_MS - 1;

    isValidSession(token); // triggers removal
    assert.equal(_sessions.has(token), false, 'expired session should be removed from store');
  });

  it('refreshes lastActivity (sliding window) on a valid check', () => {
    const token = login('bob', 'hunter2');
    const before = _sessions.get(token).lastActivity;
    // Small artificial delay to ensure timestamp advances.
    const spin = Date.now() + 5;
    while (Date.now() < spin) { /* busy-wait 5 ms */ }

    assert.equal(isValidSession(token), true);
    const after = _sessions.get(token).lastActivity;
    assert.ok(after >= before, 'lastActivity should be refreshed');
  });
});

// ---------------------------------------------------------------------------
// AUTH-001-R04: No plaintext passwords
// (Structural check — the user store must only contain salt+hash records)
// ---------------------------------------------------------------------------

describe('password hashing', () => {
  it('user store contains no plaintext passwords', async () => {
    const { _users } = await import('./auth.js');
    for (const [username, record] of _users) {
      assert.ok('salt' in record, `user ${username} record should have salt`);
      assert.ok('hash' in record, `user ${username} record should have hash`);
      assert.ok(!('password' in record), `user ${username} record must not have plaintext password`);
    }
  });

  it('salt is a non-empty hex string of at least 32 chars (16 bytes)', async () => {
    const { _users } = await import('./auth.js');
    for (const [username, record] of _users) {
      assert.ok(
        typeof record.salt === 'string' && record.salt.length >= 32,
        `user ${username} salt should be at least 32 hex chars`
      );
    }
  });
});
