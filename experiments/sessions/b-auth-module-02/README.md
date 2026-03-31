# b-auth-module-02 — Node.js User Authentication Module

A self-contained, in-memory user authentication module for Node.js. No HTTP
server, no database, no external dependencies. Uses `node:crypto` (SHA-256 +
salt) for password hashing and `node:test` for unit tests.

---

## Purpose

Provides three operations:

| Operation | What it does |
|-----------|--------------|
| `login(username, password)` | Validates credentials, returns a session token on success |
| `logout(token)` | Invalidates a session token immediately |
| `isValidSession(token)` | Returns `true`/`false`; slides the 30-minute expiry window on success |

---

## Install

No installation required beyond Node.js >= 18. Clone / copy the files into
your project and require `auth.js` directly.

```
auth.js        <- module
auth.test.js   <- tests
package.json   <- npm scripts
```

---

## Usage

### Require the module

```js
const { login, logout, isValidSession } = require('./auth.js');
```

### Login

```js
const result = login('alice', 'hunter2');

if (result.ok) {
  console.log('Logged in. Token:', result.token);
  // Store result.token in your session cookie / header / etc.
} else {
  console.error('Login failed:', result.error);
  // result.error => 'Invalid username or password.'
}
```

- Returns `{ ok: true, token: string }` on success.
- Returns `{ ok: false, error: string }` on failure. The error message is
  identical for unknown username and wrong password to avoid user enumeration.

### Logout

```js
logout(result.token);
// The token is now invalid. Safe to call on already-invalid tokens.
```

### Session validation

```js
if (isValidSession(token)) {
  // Token is valid; the 30-minute inactivity timer has been reset.
  serveProtectedResource();
} else {
  // Token expired or was logged out.
  redirectToLogin();
}
```

- Sessions expire after **30 minutes of inactivity** (sliding window).
- Each call to `isValidSession` that returns `true` resets the timer.
- Calling `isValidSession` on an expired token deletes it from the store.

---

## Run tests

```
npm test
```

All tests use `node:test` + `node:assert/strict`. No extra packages needed.

Expected output (22 tests, all passing):

```
# tests 22
# pass  22
# fail  0
```

---

## Security notes

- Passwords are never stored in plaintext. Each password is hashed as
  `SHA-256(salt + password)` where `salt` is a 16-byte random value generated
  at startup per user.
- Session tokens are 32-byte cryptographically random values (`randomBytes`).
- The user store and session store are both in-memory; all state is lost on
  process restart (by design for this module).
- The static user store (alice, bob, carol) is seeded at module load time via
  `createCredential()` — no plaintext passwords appear in module state.
