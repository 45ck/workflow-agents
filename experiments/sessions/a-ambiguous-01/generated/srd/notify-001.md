---
id: NOTIFY-001
kind: SRD
title: Notification System Library
status: accepted
scope: library
owner: Group A
date: 2026-04-01
tags: notification, events, library
---

# NOTIFY-001 Notification System Library

Generated from docs/NOTIFY-001.toon

- status: accepted
- path: docs/NOTIFY-001.toon

## REQ-NOTIFY-001-01 Subscribe

The library MUST expose a subscribe(eventType, handler) function that registers a handler for a named event type and returns a unique subscription ID (a Symbol). Throws TypeError if eventType is not a non-empty string. Throws TypeError if handler is not a function.

## REQ-NOTIFY-001-02 Unsubscribe

The library MUST expose an unsubscribe(subscriptionId) function that removes a previously registered handler. Returns true if found and removed, false if not found. Does not throw for unknown IDs.

## REQ-NOTIFY-001-03 Emit

The library MUST expose an emit(eventType, payload) function that invokes all handlers registered for eventType with (eventType, payload) and returns the count of handlers invoked. Throws TypeError if eventType is not a non-empty string. Handler errors propagate to caller.

## REQ-NOTIFY-001-04 Factory

The library MUST export a createNotificationBus() factory function that returns an isolated bus instance. Two buses created by createNotificationBus() do not share subscriptions.

## REQ-NOTIFY-001-05 ESM Module

The library MUST be an ESM module (type: module in package.json) exporting createNotificationBus as a named export from src/notify.js.

## Scope Decisions

Things = named string event types supplied by caller. Sends alerts = synchronous in-process handler invocation. Excluded: email, HTTP, file-watch, timers, process signals, databases, message queues, WebSocket.

## Out of Scope

Wildcard subscriptions, once-only subscriptions, async dispatch, event history/replay, priority ordering, middleware chains, TypeScript types, singleton bus export.

## Raw Snapshot
```json
{
  "id": "NOTIFY-001",
  "kind": "SRD",
  "title": "Notification System Library",
  "status": "accepted",
  "scope": "library",
  "owner": "Group A",
  "date": "2026-04-01",
  "tags": [
    "notification",
    "events",
    "library"
  ],
  "implements": [],
  "dependsOn": [],
  "references": [],
  "supersedes": [],
  "supersededBy": [],
  "conflictsWith": [],
  "specRefs": [],
  "sections": [
    {
      "title": "REQ-NOTIFY-001-01 Subscribe",
      "body": "The library MUST expose a subscribe(eventType, handler) function that registers a handler for a named event type and returns a unique subscription ID (a Symbol). Throws TypeError if eventType is not a non-empty string. Throws TypeError if handler is not a function."
    },
    {
      "title": "REQ-NOTIFY-001-02 Unsubscribe",
      "body": "The library MUST expose an unsubscribe(subscriptionId) function that removes a previously registered handler. Returns true if found and removed, false if not found. Does not throw for unknown IDs."
    },
    {
      "title": "REQ-NOTIFY-001-03 Emit",
      "body": "The library MUST expose an emit(eventType, payload) function that invokes all handlers registered for eventType with (eventType, payload) and returns the count of handlers invoked. Throws TypeError if eventType is not a non-empty string. Handler errors propagate to caller."
    },
    {
      "title": "REQ-NOTIFY-001-04 Factory",
      "body": "The library MUST export a createNotificationBus() factory function that returns an isolated bus instance. Two buses created by createNotificationBus() do not share subscriptions."
    },
    {
      "title": "REQ-NOTIFY-001-05 ESM Module",
      "body": "The library MUST be an ESM module (type: module in package.json) exporting createNotificationBus as a named export from src/notify.js."
    },
    {
      "title": "Scope Decisions",
      "body": "Things = named string event types supplied by caller. Sends alerts = synchronous in-process handler invocation. Excluded: email, HTTP, file-watch, timers, process signals, databases, message queues, WebSocket."
    },
    {
      "title": "Out of Scope",
      "body": "Wildcard subscriptions, once-only subscriptions, async dispatch, event history/replay, priority ordering, middleware chains, TypeScript types, singleton bus export."
    }
  ]
}
```
