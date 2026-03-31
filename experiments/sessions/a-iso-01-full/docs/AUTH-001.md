---
id: AUTH-001
title: User Authentication Module
state: in_progress
kind: functional
required_evidence:
  implementation: E0
---

# AUTH-001 — User Authentication Module

## Overview

This specification defines a Node.js in-memory user authentication module that supports login, logout, and session validity checking. Passwords are stored and compared using SHA-256 with a per-user salt via `node:crypto`. Sessions expire after 30 minutes of inactivity. No external packages are required beyond the Node.js standard library.

The module exposes three callable functions: `login`, `logout`, and `isValidSession`. It is not an HTTP server; callers invoke functions directly.

## Requirements

| ID | Requirement |
|----|-------------|
| AUTH-001-R1 | `login(username, password)` validates credentials against a static in-memory store of `username → { salt, hashedPassword }` entries. Returns a non-empty session token string on success. Throws or returns a descriptive error on invalid credentials. |
| AUTH-001-R2 | `logout(token)` invalidates the given token so that subsequent calls to `isValidSession(token)` return `false`. No-ops gracefully if the token is already invalid or unknown. |
| AUTH-001-R3 | `isValidSession(token)` returns `true` if the token exists in the active session map and was last active within the past 30 minutes; returns `false` otherwise. |
| AUTH-001-R4 | Passwords are hashed with SHA-256 and a per-user random salt (hex-encoded). No plaintext password appears in source code, test code, or stored state. |
| AUTH-001-R5 | Sessions expire after 30 minutes of inactivity. Expiry is enforced inside `isValidSession`; no background timer is required. |
| AUTH-001-R6 | The implementation uses ESM (`type: "module"` in package.json), Node.js >= 22, and no external packages. |

## Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| AUTH-001-AC1 | `npm test` exits with code 0 and all tests pass. | open |
| AUTH-001-AC2 | A valid `login` call returns a non-empty string token. | open |
| AUTH-001-AC3 | `isValidSession(token)` returns `true` immediately after a successful login. | open |
| AUTH-001-AC4 | `isValidSession(token)` returns `false` after `logout(token)` is called with that token. | open |
| AUTH-001-AC5 | `isValidSession(token)` returns `false` for a session whose `lastActive` timestamp has been backdated beyond 30 minutes. | open |
| AUTH-001-AC6 | `login` with an unknown username or wrong password does not return a token and signals failure. | open |
| AUTH-001-AC7 | No plaintext passwords appear in source or test files (verified by code review and grep). | open |
| AUTH-001-AC8 | A README is present and documents all three public functions with usage examples. | open |

## Out of Scope

- HTTP server, REST API, or middleware integration.
- Persistent storage (database, file system).
- Password reset, registration, or account management flows.
- Rate limiting, account lockout, or brute-force protection.
- JWT or OAuth tokens (a random hex token is sufficient).
- Multi-factor authentication.
- Role-based access control.

## Open Questions

- None at specification time. All requirements are self-contained.

## Traceability

Upstream: SESSION_TASK.md (shared task prompt, Groups A and B).
Downstream: `auth.js` (implementation), `auth.test.js` (tests), `README.md`.
