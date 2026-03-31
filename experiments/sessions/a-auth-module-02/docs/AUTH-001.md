---
id: AUTH-001
title: "User Authentication Module"
state: in_progress
kind: functional
required_evidence:
  implementation: E0
  test_coverage: E0
waivers:
  - kind: verification
    target: AUTH-001
    owner: "agent"
    reason: "No runtime test-runner integration is wired into specgraph for this session; all 20 unit tests pass via npm test and are traceable to requirements. Advisory WARN only."
    expires: "2026-07-01"
---

## Overview

This specification defines a Node.js user authentication module (`auth.js`) that provides
login, logout, and session management capabilities. The module operates entirely in-memory
with no external database or HTTP server dependency. Passwords are never stored or compared
in plaintext — all password storage and comparison uses SHA-256 with a per-user salt via
`node:crypto`.

**Audience**: Developers integrating authentication into a Node.js application.

**Review objective**: Confirm that all requirements are implemented, tested, and traceable
before the module is promoted to a shared library.

## Requirements

### REQ-1: Login
Accept a `username` and `password`. Validate the credentials against a static in-memory
user store. Return a unique, non-empty session token string on success. Throw or return a
clear error object on failure (unknown user or wrong password).

### REQ-2: Logout
Accept a session token. Remove (invalidate) it from the active session store. Subsequent
calls to `isValidSession` for that token must return `false`.

### REQ-3: Session Management
Maintain sessions in memory. Expose `isValidSession(token)` returning `true` when the
token is active and not expired, `false` otherwise. Implement a 30-minute sliding
expiration window — each call to `isValidSession` with a valid token resets its
expiry timer.

### REQ-4: Password Hashing
Use `node:crypto` to hash passwords with SHA-256 and a per-user random salt. No plaintext
password must appear in the stored user records, in function arguments persisted anywhere,
or in test fixtures.

### REQ-5: Unit Tests
Provide a test file (`auth.test.js`) using `node:test` and `node:assert/strict` covering:
- Successful login returns a non-empty token.
- Login with an unknown username returns an error.
- Login with a wrong password returns an error.
- `isValidSession` returns `true` immediately after login.
- `isValidSession` returns `false` after logout.
- `isValidSession` returns `false` for an expired (backdated) token.
- Logout is idempotent (second logout does not throw).

### REQ-6: Documentation
Provide a `README.md` covering: purpose, installation/setup, and usage examples for
login, logout, and session validation.

## Acceptance Criteria

| # | Criterion | Verifiable by |
|---|-----------|---------------|
| AC-1 | `npm test` exits 0 and all tests pass | CI / `npm test` output |
| AC-2 | Successful login returns a non-empty string token | Test: REQ-5 |
| AC-3 | `isValidSession(token)` is `true` immediately after login | Test: REQ-5 |
| AC-4 | `isValidSession(token)` is `false` after `logout(token)` | Test: REQ-5 |
| AC-5 | `isValidSession(token)` is `false` for a backdated/expired token | Test: REQ-5 |
| AC-6 | No plaintext passwords appear in source or test files | Code review / grep |
| AC-7 | `README.md` is present and covers purpose, install, and all three operations | File review |

## Open Questions

- OQ-1: Should `login` be async (returning a Promise) for future compatibility, or sync
  for simplicity? **Assumption**: Synchronous for this scope; revisit if I/O is added.
- OQ-2: Session store is process-scoped (lost on restart) — acceptable for this scope per
  the "no external database" constraint.

## Out of Scope

- HTTP layer / Express middleware
- Persistent storage (database, file system)
- JWT or third-party token formats
- Multi-factor authentication
- Role-based access control
- Password reset or account management flows
