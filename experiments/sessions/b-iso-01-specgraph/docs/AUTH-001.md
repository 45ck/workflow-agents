---
id: AUTH-001
title: "AUTH-001: User Authentication Module"
state: in_progress
kind: functional
owner: b-iso-01-specgraph
tags:
  - auth
  - security
  - session
---

# AUTH-001: User Authentication Module

## Metadata

- **spec_id**: AUTH-001
- **version**: 1.0.0
- **status**: active
- **created**: 2026-04-01
- **owner**: b-iso-01-specgraph

## Overview

This specification defines the user authentication module for a Node.js application. The module
provides in-memory session management with SHA-256+salt password hashing and 30-minute inactivity
expiry. No external packages are required; all cryptographic operations use `node:crypto`.

## Requirements

### AUTH-001-R01: Login

The module MUST expose a `login(username, password)` function that:

1. Looks up the username in the in-memory user store.
2. Hashes the supplied password with the stored per-user salt using SHA-256.
3. Compares the resulting digest against the stored hashed password (constant-time comparison).
4. On success, generates a cryptographically random session token, records the token with the
   current timestamp, and returns the token string.
5. On failure (unknown username or wrong password), throws or rejects with a clear error message.
   The error message MUST NOT reveal whether the username or the password was wrong (prevent
   username enumeration).

### AUTH-001-R02: Logout

The module MUST expose a `logout(token)` function that:

1. Removes the session identified by `token` from the active session store.
2. Is a no-op (does not throw) when the token is unknown or already expired.

### AUTH-001-R03: isValidSession

The module MUST expose an `isValidSession(token)` function that:

1. Returns `true` if the token exists in the active session store AND its last-activity timestamp
   is within 30 minutes of the current time.
2. Returns `false` in all other cases (unknown token, expired token).
3. When returning `true`, updates the last-activity timestamp to the current time (sliding window).

### AUTH-001-R04: Password hashing

The module MUST:

1. Store passwords as `SHA-256(password + salt)` where salt is a per-user random hex string of at
   least 16 bytes generated at module initialisation time.
2. Never store, log, or compare plaintext passwords anywhere in the source.
3. Use `node:crypto.timingSafeEqual` for digest comparison to prevent timing attacks.

### AUTH-001-R05: Session expiry

The module MUST:

1. Define the inactivity window as 30 minutes (1 800 000 ms).
2. Consider a session expired when `now - lastActivity >= SESSION_TTL_MS`.
3. Automatically remove expired sessions when they are checked via `isValidSession`.

### AUTH-001-R06: Tests

The test suite MUST cover:

1. Successful login returns a non-empty token string.
2. Login with wrong password throws / rejects.
3. Login with unknown username throws / rejects.
4. `isValidSession` returns `true` immediately after login.
5. `isValidSession` returns `false` after `logout`.
6. `isValidSession` returns `false` for a backdated (expired) session.
7. No plaintext password present in source or test files (verified by code review convention).

## Implementation notes

- ESM module (`"type": "module"` in package.json or `.mjs` extension).
- Single source file `auth.js`; single test file `auth.test.js`.
- Use `node:crypto` `randomBytes` for token and salt generation.
- Use `node:crypto` `createHash('sha256')` for password hashing.
- In-memory stores are plain `Map` objects; no persistence between process restarts is required.
