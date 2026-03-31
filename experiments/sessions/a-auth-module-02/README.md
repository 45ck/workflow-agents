# auth — User Authentication Module

A lightweight, zero-dependency Node.js authentication module providing login, logout, and
in-memory session management. Passwords are never stored or compared in plaintext — all
credential storage uses SHA-256 with a per-user random salt via `node:crypto`.

## Purpose

Drop-in authentication primitives for a Node.js application that needs credential
validation and short-lived sessions without a database or HTTP layer.

## Installation / Setup

This module is a single ESM file. Copy `auth.js` into your project (Node.js >= 22).

```js
import { initUsers, login, logout, isValidSession } from './auth.js';
```

No `npm install` step is required — the module uses only Node.js built-ins.

## Usage

### 1. Initialise the user store

Call `initUsers` once at startup with an array of `{ username, password }` pairs.
Passwords are hashed immediately; no plaintext is retained.

```js
initUsers([
  { username: 'alice', password: 'correct-horse-battery-staple' },
  { username: 'bob',   password: 'tr0ub4dor&3' },
]);
```

### 2. Login

```js
try {
  const { token } = login('alice', 'correct-horse-battery-staple');
  console.log('Logged in. Session token:', token);
} catch (err) {
  if (err.code === 'INVALID_CREDENTIALS') {
    console.error('Bad username or password');
  }
}
```

`login(username, password)` returns `{ token: string }` on success or throws an `Error`
with `err.code === 'INVALID_CREDENTIALS'` on failure.

### 3. Validate a session

```js
if (isValidSession(token)) {
  console.log('Session is active');
} else {
  console.log('Session expired or invalid — please log in again');
}
```

`isValidSession(token)` returns `true` if the token is active and not expired.
Sessions expire after **30 minutes of inactivity** (sliding window — each call to
`isValidSession` with a valid token resets the timer).

### 4. Logout

```js
logout(token);
// isValidSession(token) now returns false
```

`logout(token)` is idempotent — calling it on an already-invalid token is a no-op.

## Running the tests

```sh
npm test
```

Uses `node:test` and `node:assert/strict`. All 20 unit tests cover login success/failure,
logout idempotency, session validity, expiry (time-travel via `Date.now` mock), and
password-hashing invariants.

## Spec

See `docs/AUTH-001.md` for the full specification and traceability information.
