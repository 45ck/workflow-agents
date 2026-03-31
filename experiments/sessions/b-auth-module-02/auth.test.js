'use strict';

const { test } = require('node:test');
const assert  = require('node:assert/strict');

const {
  login,
  logout,
  isValidSession,
  SESSION_TTL_MS,
  _sessionStore,
  _hashPassword,
  _createCredential,
} = require('./auth.js');

// ---------------------------------------------------------------------------
// Helper: clear the session store between tests that manipulate it directly
// ---------------------------------------------------------------------------
function clearSessions() {
  _sessionStore.clear();
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

test('hashPassword produces consistent output for same salt+password', () => {
  const { salt, hash } = _createCredential('mypassword');
  const rehash = _hashPassword('mypassword', salt);
  assert.equal(rehash, hash);
});

test('hashPassword produces different output for different passwords', () => {
  const { salt, hash } = _createCredential('passwordA');
  const other = _hashPassword('passwordB', salt);
  assert.notEqual(other, hash);
});

test('hashPassword produces different output for different salts', () => {
  const cred1 = _createCredential('samepassword');
  const cred2 = _createCredential('samepassword');
  // Salts should differ (with overwhelming probability)
  assert.notEqual(cred1.salt, cred2.salt);
  assert.notEqual(cred1.hash, cred2.hash);
});

test('stored hash is not the plaintext password', () => {
  const password = 'hunter2';
  const { hash } = _createCredential(password);
  assert.notEqual(hash, password);
  assert.ok(!hash.includes(password));
});

// ---------------------------------------------------------------------------
// Login — success
// ---------------------------------------------------------------------------

test('login returns ok:true and a non-empty token for valid credentials', () => {
  clearSessions();
  const result = login('alice', 'hunter2');
  assert.equal(result.ok, true);
  assert.ok(result.token);
  assert.ok(result.token.length > 0);
});

test('login token is immediately valid', () => {
  clearSessions();
  const { ok, token } = login('alice', 'hunter2');
  assert.equal(ok, true);
  assert.equal(isValidSession(token), true);
});

test('each login call produces a unique token', () => {
  clearSessions();
  const r1 = login('alice', 'hunter2');
  const r2 = login('alice', 'hunter2');
  assert.notEqual(r1.token, r2.token);
});

test('multiple users can be logged in simultaneously', () => {
  clearSessions();
  const ra = login('alice', 'hunter2');
  const rb = login('bob', 'correcthorsebatterystaple');
  assert.equal(ra.ok, true);
  assert.equal(rb.ok, true);
  assert.equal(isValidSession(ra.token), true);
  assert.equal(isValidSession(rb.token), true);
});

// ---------------------------------------------------------------------------
// Login — failure
// ---------------------------------------------------------------------------

test('login returns ok:false for unknown username', () => {
  const result = login('nobody', 'somepassword');
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(result.token, undefined);
});

test('login returns ok:false for wrong password', () => {
  const result = login('alice', 'wrongpassword');
  assert.equal(result.ok, false);
  assert.ok(result.error);
});

test('login error message does not reveal whether username exists', () => {
  const r1 = login('nobody', 'irrelevant');
  const r2 = login('alice',  'wrongpassword');
  assert.equal(r1.error, r2.error);
});

test('login does not return a token on failure', () => {
  const result = login('alice', 'badpass');
  assert.equal(result.ok, false);
  assert.equal(result.token, undefined);
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test('token is invalid after logout', () => {
  clearSessions();
  const { ok, token } = login('alice', 'hunter2');
  assert.equal(ok, true);
  assert.equal(isValidSession(token), true);
  logout(token);
  assert.equal(isValidSession(token), false);
});

test('logout is idempotent — no error on repeated calls', () => {
  clearSessions();
  const { token } = login('alice', 'hunter2');
  logout(token);
  assert.doesNotThrow(() => logout(token));
  assert.equal(isValidSession(token), false);
});

test('logout only invalidates the target token', () => {
  clearSessions();
  const r1 = login('alice', 'hunter2');
  const r2 = login('alice', 'hunter2');
  logout(r1.token);
  assert.equal(isValidSession(r1.token), false);
  assert.equal(isValidSession(r2.token), true);
});

test('logout on a non-existent token does not throw', () => {
  assert.doesNotThrow(() => logout('totallyinvalidtoken'));
});

// ---------------------------------------------------------------------------
// isValidSession
// ---------------------------------------------------------------------------

test('isValidSession returns false for arbitrary strings', () => {
  assert.equal(isValidSession('notarealtoken'), false);
  assert.equal(isValidSession(''),              false);
});

test('isValidSession returns false for undefined/null gracefully', () => {
  // Map.get(undefined) returns undefined — should return false, not throw
  assert.equal(isValidSession(undefined), false);
  assert.equal(isValidSession(null),      false);
});

// ---------------------------------------------------------------------------
// Session expiry (backdated token / time manipulation)
// ---------------------------------------------------------------------------

test('token is invalid when its expiresAt is in the past', () => {
  clearSessions();
  const { ok, token } = login('carol', 'Tr0ub4dor&3');
  assert.equal(ok, true);

  // Manually backdate the session to simulate expiry
  const session = _sessionStore.get(token);
  session.expiresAt = Date.now() - 1;

  assert.equal(isValidSession(token), false);
  // Should also be removed from the store
  assert.equal(_sessionStore.has(token), false);
});

test('isValidSession slides the expiry window on a valid check', () => {
  clearSessions();
  const { token } = login('alice', 'hunter2');

  const before = _sessionStore.get(token).expiresAt;

  // Ensure at least 1 ms passes
  const spin = Date.now();
  while (Date.now() === spin) { /* busy-wait */ }

  assert.equal(isValidSession(token), true);
  const after = _sessionStore.get(token).expiresAt;

  assert.ok(after > before, `Expected sliding window: after (${after}) > before (${before})`);
});

test('SESSION_TTL_MS is 30 minutes', () => {
  assert.equal(SESSION_TTL_MS, 30 * 60 * 1000);
});

// ---------------------------------------------------------------------------
// No plaintext passwords in the session store
// ---------------------------------------------------------------------------

test('session store does not contain plaintext passwords', () => {
  clearSessions();
  login('alice', 'hunter2');

  for (const [, session] of _sessionStore) {
    const serialized = JSON.stringify(session);
    assert.ok(!serialized.includes('hunter2'), 'Session store must not contain plaintext password');
  }
});
