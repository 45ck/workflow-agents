# auth-module

User authentication module for Node.js. Provides login, logout, and session validation with
SHA-256+salt password hashing and 30-minute sliding-window inactivity expiry. No external
dependencies; uses only `node:crypto`.

Spec: [docs/AUTH-001.md](docs/AUTH-001.md)

---

## Installation

No external packages are required beyond the repo itself.

```sh
npm install   # installs devDependency @45ck/agent-docs only
```

Node.js >= 22 is required (ESM, `node:crypto`, `node:test`).

---

## API

### `login(username, password) → string`

Validates credentials against the in-memory user store. Returns a cryptographically random hex
session token on success. Throws `Error('Invalid credentials')` on failure.

```js
import { login } from './auth.js';

const token = login('alice', 'correct-horse-battery-staple');
console.log(token); // e.g. "a3f9...c1d2"
```

### `logout(token) → void`

Invalidates the session identified by `token`. No-op if the token is unknown or already expired.

```js
import { logout } from './auth.js';

logout(token);
// token is now invalid
```

### `isValidSession(token) → boolean`

Returns `true` if the session exists and has been active within the last 30 minutes. Returns
`false` otherwise. Refreshes the inactivity timer on a `true` result (sliding window). Removes
expired sessions as a side-effect.

```js
import { isValidSession } from './auth.js';

if (isValidSession(token)) {
  console.log('session is active');
} else {
  console.log('session expired or invalid');
}
```

---

## Running tests

```sh
npm test
```

Uses Node.js built-in `node:test`. All 16 tests should pass.

---

## Security notes

- Passwords are hashed with SHA-256 and a random 16-byte per-user salt. No plaintext passwords
  are stored anywhere.
- Digest comparison uses `node:crypto.timingSafeEqual` to prevent timing attacks.
- Error messages deliberately do not distinguish between unknown username and wrong password.
- Session tokens are 32-byte cryptographically random values.
