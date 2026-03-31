/**
 * @file notify.test.js
 * @spec NOTIFY-001
 * @implements src/notify.test.js#notify-tests
 * @test src/notify.test.js
 * @evidence E1 — automated unit tests for all NOTIFY-001 requirements
 *
 * Run with: node --test src/notify.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationBus } from './notify.js';

// ---------------------------------------------------------------------------
// REQ-NOTIFY-001-01 — subscribe
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  it('T-01: registers a handler that is called on emit', () => {
    const bus = createNotificationBus();
    let called = false;
    bus.subscribe('test.event', () => { called = true; });
    bus.emit('test.event');
    assert.equal(called, true);
  });

  it('T-02: returns a Symbol', () => {
    const bus = createNotificationBus();
    const id = bus.subscribe('test.event', () => {});
    assert.equal(typeof id, 'symbol');
  });

  it('T-03: multiple handlers for the same event type are all called', () => {
    const bus = createNotificationBus();
    const results = [];
    bus.subscribe('multi', () => results.push(1));
    bus.subscribe('multi', () => results.push(2));
    bus.subscribe('multi', () => results.push(3));
    bus.emit('multi');
    assert.deepEqual(results, [1, 2, 3]);
  });

  it('T-04: throws TypeError for non-string eventType', () => {
    const bus = createNotificationBus();
    assert.throws(() => bus.subscribe(42, () => {}), TypeError);
    assert.throws(() => bus.subscribe(null, () => {}), TypeError);
    assert.throws(() => bus.subscribe('', () => {}), TypeError);
  });

  it('T-05: throws TypeError for non-function handler', () => {
    const bus = createNotificationBus();
    assert.throws(() => bus.subscribe('event', 'notAFunction'), TypeError);
    assert.throws(() => bus.subscribe('event', null), TypeError);
    assert.throws(() => bus.subscribe('event', 42), TypeError);
  });
});

// ---------------------------------------------------------------------------
// REQ-NOTIFY-001-02 — unsubscribe
// ---------------------------------------------------------------------------

describe('unsubscribe', () => {
  it('T-06: removes handler so it is not called after removal', () => {
    const bus = createNotificationBus();
    let count = 0;
    const id = bus.subscribe('evt', () => count++);
    bus.emit('evt');
    assert.equal(count, 1);
    bus.unsubscribe(id);
    bus.emit('evt');
    assert.equal(count, 1); // still 1, not called again
  });

  it('T-07a: returns true when subscription is found and removed', () => {
    const bus = createNotificationBus();
    const id = bus.subscribe('evt', () => {});
    const result = bus.unsubscribe(id);
    assert.equal(result, true);
  });

  it('T-07b: returns false when subscription ID is unknown', () => {
    const bus = createNotificationBus();
    const unknownId = Symbol('unknown');
    const result = bus.unsubscribe(unknownId);
    assert.equal(result, false);
  });
});

// ---------------------------------------------------------------------------
// REQ-NOTIFY-001-03 — emit
// ---------------------------------------------------------------------------

describe('emit', () => {
  it('T-08: returns correct handler count', () => {
    const bus = createNotificationBus();
    bus.subscribe('counted', () => {});
    bus.subscribe('counted', () => {});
    const n = bus.emit('counted');
    assert.equal(n, 2);
  });

  it('T-09: returns 0 when no subscribers', () => {
    const bus = createNotificationBus();
    const n = bus.emit('nothing');
    assert.equal(n, 0);
  });

  it('T-10: does not throw when no subscribers', () => {
    const bus = createNotificationBus();
    assert.doesNotThrow(() => bus.emit('no-one-listening'));
  });

  it('T-11: handler receives correct (eventType, payload) arguments', () => {
    const bus = createNotificationBus();
    let receivedType;
    let receivedPayload;
    bus.subscribe('typed', (type, payload) => {
      receivedType = type;
      receivedPayload = payload;
    });
    bus.emit('typed', { userId: 99 });
    assert.equal(receivedType, 'typed');
    assert.deepEqual(receivedPayload, { userId: 99 });
  });

  it('T-12: handler errors propagate out of emit', () => {
    const bus = createNotificationBus();
    bus.subscribe('boom', () => { throw new Error('handler failed'); });
    assert.throws(() => bus.emit('boom'), /handler failed/);
  });

  it('T-13: throws TypeError for non-string eventType', () => {
    const bus = createNotificationBus();
    assert.throws(() => bus.emit(null), TypeError);
    assert.throws(() => bus.emit(''), TypeError);
    assert.throws(() => bus.emit(42), TypeError);
  });
});

// ---------------------------------------------------------------------------
// REQ-NOTIFY-001-04 — createNotificationBus isolation
// ---------------------------------------------------------------------------

describe('createNotificationBus', () => {
  it('T-14: two buses are isolated — subscriptions do not cross', () => {
    const busA = createNotificationBus();
    const busB = createNotificationBus();
    const callsA = [];
    const callsB = [];
    busA.subscribe('shared', (t, p) => callsA.push(p));
    busB.subscribe('shared', (t, p) => callsB.push(p));
    busA.emit('shared', 'from-A');
    assert.deepEqual(callsA, ['from-A']);
    assert.deepEqual(callsB, []); // busB handler NOT called
    busB.emit('shared', 'from-B');
    assert.deepEqual(callsA, ['from-A']); // busA handler NOT called
    assert.deepEqual(callsB, ['from-B']);
  });

  it('T-15: createNotificationBus returns a new bus on each call', () => {
    const busA = createNotificationBus();
    const busB = createNotificationBus();
    assert.notEqual(busA, busB);
  });
});
