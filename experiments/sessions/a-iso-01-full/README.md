# User Authentication Module

A minimal Node.js authentication module that handles login, logout, and session
management using SHA-256 + salt password hashing and 30-minute inactivity expiry.

Spec: [docs/AUTH-001.md](docs/AUTH-001.md)

## Requirements

- Node.js >= 22
- No external dependencies (uses `node:crypto` only)

## Installation

No installation step needed for the module itself. If you cloned this repo:

```sh
npm install   # installs devDependencies only
```

## API

### `login(username, password) → string`

Validates credentials against the static in-memory user store. Returns a random
64-character hex session token on success. Throws `Error('Invalid credentials')`
on failure (unknown user or wrong password).

```js
import { login } from './auth.js';

const token = login('alice', 'correct-horse');
console.log(token); // e.g. "3f8a2b...c1d9"
```

### `logout(token) → void`

Invalidates the session token. The token will no longer be accepted by
`isValidSession`. Safe to call on an already-invalid or unknown token.

```js
import { logout } from './auth.js';

logout(token);
```

### `isValidSession(token) → boolean`

Returns `true` if the token is active and was last used within the past
30 minutes; `false` otherwise. Refreshes the sliding expiry window on
each successful check.

```js
import { isValidSession } from './auth.js';

if (isValidSession(token)) {
  console.log('Session is active');
} else {
  console.log('Session expired or invalid');
}
```

## Running Tests

```sh
npm test
```

All 18 unit tests cover login, logout, session validity, expiry, and
password hashing behaviour.

## Security Notes

- Passwords are never stored or compared in plaintext.
- Each user account has a unique random salt; the stored value is
  `SHA-256(salt + password)`.
- Session tokens are 32 bytes of `crypto.randomBytes`, encoded as hex.
- Sessions expire after 30 minutes of inactivity (sliding window).
