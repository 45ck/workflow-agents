# auth — User Authentication Module

A minimal, dependency-free Node.js authentication module with login, logout,
and session management. Passwords are stored as SHA-256+salt hashes using
`node:crypto`. Sessions expire after 30 minutes of inactivity.

## Requirements

- Node.js >= 22
- No external runtime dependencies

## Installation

No additional packages are required beyond Node itself.

```sh
npm install   # only installs dev/quality tooling
```

## API

All functions are named exports from `src/auth.js`.

---

### `login(username, password) → { token: string }`

Validates credentials against the in-memory user store. Returns a session
token on success, or throws `Error('Invalid credentials')` on failure.

```js
import { login } from './src/auth.js';

const { token } = login('alice', 'correct-horse-battery-staple');
// token is a 64-character hex string, e.g. "a3f9..."
```

---

### `logout(token) → void`

Invalidates the given session token. Silently succeeds for unknown or already-
expired tokens so double-logout is safe.

```js
import { logout } from './src/auth.js';

logout(token);
// any subsequent isValidSession(token) call returns false
```

---

### `isValidSession(token) → boolean`

Returns `true` if the token exists and has been active within the last 30
minutes. Each successful check slides the expiry window (rolling TTL).
Expired tokens are removed from the session store automatically.

```js
import { login, isValidSession } from './src/auth.js';

const { token } = login('alice', 'correct-horse-battery-staple');
isValidSession(token);  // true

// ... 30 minutes of inactivity ...
isValidSession(token);  // false — token expired and cleaned up
```

---

### `getSessionUser(token) → string | null`

Returns the username for a valid session, or `null` for invalid/expired tokens.

```js
import { getSessionUser } from './src/auth.js';

const user = getSessionUser(token);  // 'alice' or null
```

---

### `hashPassword(password, salt?) → { hash: string, salt: string }`
### `verifyPassword(password, storedHash, salt) → boolean`

Low-level password utilities exposed for use by callers that manage their own
user stores. The `salt` parameter is auto-generated when omitted.

```js
import { hashPassword, verifyPassword } from './src/auth.js';

const { hash, salt } = hashPassword('mypassword');
// store hash + salt; never store the plaintext

verifyPassword('mypassword', hash, salt);  // true
verifyPassword('wrongpass',  hash, salt);  // false
```

---

## Running tests

```sh
npm test
```

Tests use the built-in `node:test` runner. Expected output:

```
# tests 27
# pass  27
# fail  0
```

## Security notes

- Passwords are never stored or logged as plaintext anywhere in this codebase.
- Each password is salted with 16 random bytes before hashing, preventing
  rainbow-table attacks.
- Error messages from `login` are deliberately identical for wrong-username
  and wrong-password to avoid user enumeration.
- SHA-256+salt is used for simplicity per the task constraints; for production
  use, prefer an adaptive algorithm such as bcrypt or Argon2.
- Session tokens are 32 cryptographically random bytes (64 hex chars).
