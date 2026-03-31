# auth — User Authentication Module

A minimal, self-contained user authentication module for Node.js.
No external dependencies. ESM only. Node >= 22.

---

## What it does

| Function | Description |
|---|---|
| `login(username, password)` | Validates credentials, creates a session, returns a token. |
| `logout(token)` | Invalidates the session for the given token. |
| `isValidSession(token)` | Returns `true` if the token is active and not expired. |

Passwords are hashed with **SHA-256 + random salt** (via `node:crypto`).
No plaintext passwords are stored anywhere.

Sessions expire after **30 minutes of inactivity**.
Each successful call to `isValidSession` slides the expiry window forward.

---

## Installation

No dependencies to install.  Copy `auth.js` into your project.

```bash
# run the tests to confirm everything works
npm test
```

---

## Usage

```js
import { login, logout, isValidSession } from './auth.js';

// --- Login ---
// Returns { token, username } on success.
// Throws an Error with message "Invalid credentials" on failure.
const { token } = login('alice', 's3cr3t');
console.log(token); // e.g. "3f8a2c..."  (64-char hex string)

// --- Check session ---
console.log(isValidSession(token)); // true

// --- Logout ---
logout(token);
console.log(isValidSession(token)); // false
```

---

## Adding users

The in-memory user store is defined in `auth.js` as `USER_STORE`.
Use the exported helper to pre-compute a salt+hash pair, then add it:

```js
import { createPasswordRecord } from './auth.js';

const { salt, hash } = createPasswordRecord('myplaintextpassword');
console.log({ salt, hash });
// Store salt+hash in USER_STORE — never the plaintext.
```

---

## Running tests

```bash
npm test
# or directly:
node --test auth.test.js
```

Expected output: 24 tests, 0 failures.

---

## Design decisions

- **SHA-256 + salt** — uses only `node:crypto` (built-in), avoiding the need
  for an external bcrypt package while still preventing rainbow-table attacks.
- **Sliding expiry** — `isValidSession` refreshes `lastActivity` on every
  successful check, so active users are not logged out mid-session.
- **Eager cleanup** — expired tokens are deleted from the store on first
  detection; no background sweep process is needed.
- **Test helpers** — `_setSessionLastActivity` and `_clearAllSessions` are
  exported with underscore prefixes to make their test-only nature explicit.
  They are not part of the public API.
