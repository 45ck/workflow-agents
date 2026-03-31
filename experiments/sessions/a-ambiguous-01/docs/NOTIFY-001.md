---
id: NOTIFY-001
title: Notification System Library
state: in_progress
kind: feature
owner: group-a
priority: P1
---

# NOTIFY-001 — Notification System Library

**Status**: Accepted
**Date**: 2026-04-01
**Author**: Group A (spec-writer skill)
**Spec ID**: NOTIFY-001

---

## 1. Purpose and Scope Statement

The task brief is:

> "Build a notification system that sends alerts when things happen."

This document pins down the **minimum viable interpretation** of that brief as a concrete engineering spec before any code is written. All scope decisions made here are deliberate; ambiguities are resolved rather than deferred.

---

## 2. Minimum Viable Interpretation

The brief is interpreted as:

> A pure Node.js library that allows calling code to **subscribe to named event types** and **emit those events with a payload**. Subscribed handlers are invoked synchronously when an event is emitted. The library provides a clean API surface: `subscribe`, `unsubscribe`, and `emit`.

No transport layer, no persistence, no external services. The library wraps `node:events` with a typed, documented, testable API.

---

## 3. Concrete Decisions on "Things" (Event Sources)

The brief says "when things happen." This is resolved as:

| Decision | Rationale |
|---|---|
| "Things" = named string event types supplied by the caller | Avoids inventing a domain; the library is domain-agnostic |
| Events carry an arbitrary payload object | The library does not constrain payload shape |
| The caller is responsible for emitting events at the right time | The library does not poll, watch files, or observe the OS |
| Built-in event types: none | No hard-coded "system" events (no file-watch, no timer, no process signals) |

### Out-of-scope event sources (explicitly ruled out)

- File system watchers (`fs.watch`)
- HTTP webhooks or inbound network events
- OS process signals (`SIGINT`, etc.)
- Timers / scheduled events (cron-style)
- Database change streams
- Message queue consumers (Redis, NATS, etc.)

---

## 4. Concrete Decisions on "Sends Alerts"

The brief says "sends alerts." This is resolved as:

| Decision | Rationale |
|---|---|
| "Send" = synchronous in-process handler invocation | Node.js stdlib only; no I/O |
| "Alert" = calling a subscriber callback with `(eventType, payload)` | Simple, testable, zero dependencies |
| Delivery guarantee = at-most-once, synchronous | Matches `EventEmitter` semantics; no retry, no queue |
| Error isolation: handler errors propagate to caller | No silent swallowing; caller can wrap in try/catch |

### Out-of-scope alert transports (explicitly ruled out)

- Email (SMTP, `nodemailer`, etc.)
- HTTP POST to external webhook
- SMS or push notifications
- Console logging (this is a library; the subscriber decides what to do with the alert)
- File logging
- WebSocket push
- Process IPC / `worker_threads` messaging

---

## 5. Requirements

### REQ-NOTIFY-001-01 — Subscribe

> The library MUST expose a `subscribe(eventType: string, handler: Function): symbol` function that registers a handler for a named event type and returns a unique subscription ID (a `Symbol`).

**Acceptance criteria**:
- `subscribe` accepts a non-empty string and a function.
- Multiple handlers can be registered for the same event type.
- Returns a `Symbol` that uniquely identifies the subscription.
- Throws `TypeError` if `eventType` is not a non-empty string.
- Throws `TypeError` if `handler` is not a function.

### REQ-NOTIFY-001-02 — Unsubscribe

> The library MUST expose an `unsubscribe(subscriptionId: symbol): boolean` function that removes a previously registered handler. Returns `true` if found and removed, `false` if not found.

**Acceptance criteria**:
- A handler removed via `unsubscribe` is NOT called on subsequent `emit` calls.
- Returns `false` for an unknown `subscriptionId`.
- Does not throw if called with an unknown ID.

### REQ-NOTIFY-001-03 — Emit

> The library MUST expose an `emit(eventType: string, payload?: unknown): number` function that invokes all handlers registered for `eventType` with `(eventType, payload)` and returns the count of handlers invoked.

**Acceptance criteria**:
- All handlers registered for `eventType` are called in registration order.
- Returns `0` when no handlers are registered.
- Returns the correct count of invoked handlers.
- Emitting an event with no subscribers does NOT throw.
- Handler errors propagate (are not caught by `emit`).
- Throws `TypeError` if `eventType` is not a non-empty string.

### REQ-NOTIFY-001-04 — NotificationBus factory

> The library MUST export a `createNotificationBus()` factory function that returns an isolated bus instance with its own `subscribe`, `unsubscribe`, and `emit` methods.

**Acceptance criteria**:
- Two buses created by `createNotificationBus()` do not share subscriptions.
- Each bus is independently usable.

### REQ-NOTIFY-001-05 — ESM module

> The library MUST be an ESM module (`"type": "module"` in `package.json`) exporting `createNotificationBus` as a named export from `src/notify.js`.

---

## 6. Out-of-Scope — Explicit Exclusions

The following are **not** part of this implementation:

| Item | Reason excluded |
|---|---|
| Wildcard event subscriptions (`*`) | Not in brief; adds complexity |
| Once-only subscriptions (`subscribeOnce`) | Not in brief; can be composed by caller |
| Async/Promise-based dispatch | Not in brief; adds error-handling complexity |
| Event history / replay | Not in brief; requires persistence |
| Priority ordering of handlers | Not in brief |
| Middleware / interceptor chains | Not in brief |
| TypeScript types / `.d.ts` files | Constraints specify stdlib only; plain JS |
| Named export of a singleton bus | Factories are safer; singleton is out of scope |
| `node:events` subclassing exposed to caller | Internal implementation detail only |

---

## 7. Module API Surface (normative)

```js
// src/notify.js

/**
 * @spec NOTIFY-001
 * Creates and returns an isolated notification bus.
 * @returns {{ subscribe, unsubscribe, emit }}
 */
export function createNotificationBus() { ... }

// bus.subscribe(eventType, handler) -> Symbol
// bus.unsubscribe(subscriptionId)   -> boolean
// bus.emit(eventType, payload?)     -> number (handler count)
```

---

## 8. Test Plan

| Test ID | Requirement | Description |
|---|---|---|
| T-01 | REQ-001-01 | `subscribe` registers a handler; handler is called on emit |
| T-02 | REQ-001-01 | `subscribe` returns a Symbol |
| T-03 | REQ-001-01 | Multiple handlers for same event type are all called |
| T-04 | REQ-001-01 | `subscribe` throws TypeError for non-string eventType |
| T-05 | REQ-001-01 | `subscribe` throws TypeError for non-function handler |
| T-06 | REQ-001-02 | `unsubscribe` removes handler; handler not called after removal |
| T-07 | REQ-001-02 | `unsubscribe` returns true when found, false when not |
| T-08 | REQ-001-03 | `emit` returns correct handler count |
| T-09 | REQ-001-03 | `emit` returns 0 when no subscribers |
| T-10 | REQ-001-03 | `emit` does not throw when no subscribers |
| T-11 | REQ-001-03 | Handler receives correct `(eventType, payload)` arguments |
| T-12 | REQ-001-03 | Handler errors propagate out of `emit` |
| T-13 | REQ-001-03 | `emit` throws TypeError for non-string eventType |
| T-14 | REQ-001-04 | Two buses are isolated; subscriptions do not cross |
| T-15 | REQ-001-04 | `createNotificationBus` returns a new bus each call |

---

## 9. Open Questions

None. All ambiguities have been resolved by the decisions in Sections 3 and 4.

---

## 10. Linked Artifacts

- Implementation: `src/notify.js` (not yet written)
- Tests: `src/notify.test.js` (not yet written)
- Spec ID used in `@spec` annotations: `NOTIFY-001`
