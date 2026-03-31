/**
 * Tests for the notification system.
 * Run with: node --test test/notification.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';

import { EventBus } from '../src/EventBus.js';
import { NotificationQueue } from '../src/NotificationQueue.js';
import { NotificationLog } from '../src/NotificationLog.js';
import { ChannelRouter } from '../src/ChannelRouter.js';

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------
describe('EventBus', () => {
  it('calls a registered handler when event is emitted', () => {
    const bus = new EventBus();
    let received;
    bus.on('alert', (payload) => { received = payload; });
    bus.emit('alert', { msg: 'hello' });
    assert.deepEqual(received, { msg: 'hello' });
  });

  it('returns the count of handlers invoked', () => {
    const bus = new EventBus();
    bus.on('x', () => {});
    bus.on('x', () => {});
    const count = bus.emit('x', null);
    assert.equal(count, 2);
  });

  it('returns 0 when no handlers are registered', () => {
    const bus = new EventBus();
    assert.equal(bus.emit('nothing', null), 0);
  });

  it('calls multiple handlers for the same event', () => {
    const bus = new EventBus();
    const results = [];
    bus.on('tick', () => results.push('a'));
    bus.on('tick', () => results.push('b'));
    bus.emit('tick');
    assert.deepEqual(results, ['a', 'b']);
  });

  it('does not call handlers for other events', () => {
    const bus = new EventBus();
    let called = false;
    bus.on('other', () => { called = true; });
    bus.emit('target');
    assert.equal(called, false);
  });

  it('unsubscribes via returned function', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on('ev', () => count++);
    bus.emit('ev');
    unsub();
    bus.emit('ev');
    assert.equal(count, 1);
  });

  it('once handler fires exactly once', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('ping', () => count++);
    bus.emit('ping');
    bus.emit('ping');
    bus.emit('ping');
    assert.equal(count, 1);
  });

  it('off removes all handlers for an event', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('clear', () => count++);
    bus.on('clear', () => count++);
    bus.off('clear');
    bus.emit('clear');
    assert.equal(count, 0);
  });

  it('off with no argument removes all handlers for all events', () => {
    const bus = new EventBus();
    let aCount = 0, bCount = 0;
    bus.on('a', () => aCount++);
    bus.on('b', () => bCount++);
    bus.off();
    bus.emit('a');
    bus.emit('b');
    assert.equal(aCount, 0);
    assert.equal(bCount, 0);
  });

  it('listenerCount returns correct count', () => {
    const bus = new EventBus();
    assert.equal(bus.listenerCount('e'), 0);
    bus.on('e', () => {});
    bus.on('e', () => {});
    assert.equal(bus.listenerCount('e'), 2);
  });

  it('throws on invalid event name', () => {
    const bus = new EventBus();
    assert.throws(() => bus.on('', () => {}), TypeError);
    assert.throws(() => bus.emit(''), TypeError);
  });

  it('throws when handler is not a function', () => {
    const bus = new EventBus();
    assert.throws(() => bus.on('ev', 'not-a-fn'), TypeError);
  });
});

// ---------------------------------------------------------------------------
// NotificationQueue
// ---------------------------------------------------------------------------
describe('NotificationQueue', () => {
  it('enqueues and dequeues a single notification', () => {
    const q = new NotificationQueue();
    q.enqueue('info', 'Hello');
    const item = q.dequeue();
    assert.equal(item.message, 'Hello');
    assert.equal(item.severity, 'info');
  });

  it('returns null when queue is empty', () => {
    const q = new NotificationQueue();
    assert.equal(q.dequeue(), null);
  });

  it('dequeues critical before warning before info', () => {
    const q = new NotificationQueue();
    q.enqueue('info', 'low');
    q.enqueue('critical', 'high');
    q.enqueue('warning', 'medium');

    const first = q.dequeue();
    assert.equal(first.severity, 'critical');
    const second = q.dequeue();
    assert.equal(second.severity, 'warning');
    const third = q.dequeue();
    assert.equal(third.severity, 'info');
  });

  it('drainAll returns items in priority order and empties the queue', () => {
    const q = new NotificationQueue();
    q.enqueue('info', 'a');
    q.enqueue('critical', 'b');
    q.enqueue('warning', 'c');
    const all = q.drainAll();
    assert.equal(all.length, 3);
    assert.equal(all[0].severity, 'critical');
    assert.equal(all[1].severity, 'warning');
    assert.equal(all[2].severity, 'info');
    assert.equal(q.isEmpty, true);
  });

  it('peek returns highest priority item without removal', () => {
    const q = new NotificationQueue();
    q.enqueue('info', 'i');
    q.enqueue('warning', 'w');
    const top = q.peek();
    assert.equal(top.severity, 'warning');
    assert.equal(q.size, 2); // unchanged
  });

  it('peek returns null on empty queue', () => {
    const q = new NotificationQueue();
    assert.equal(q.peek(), null);
  });

  it('reports correct size', () => {
    const q = new NotificationQueue();
    assert.equal(q.size, 0);
    q.enqueue('info', 'x');
    q.enqueue('info', 'y');
    assert.equal(q.size, 2);
    q.dequeue();
    assert.equal(q.size, 1);
  });

  it('filterBySeverity returns matching items', () => {
    const q = new NotificationQueue();
    q.enqueue('info', 'a');
    q.enqueue('critical', 'b');
    q.enqueue('info', 'c');
    const infos = q.filterBySeverity('info');
    assert.equal(infos.length, 2);
    assert.ok(infos.every((n) => n.severity === 'info'));
  });

  it('attaches meta data to notification', () => {
    const q = new NotificationQueue();
    const n = q.enqueue('warning', 'disk full', { disk: '/var', used: 99 });
    assert.deepEqual(n.meta, { disk: '/var', used: 99 });
  });

  it('assigns unique id to each notification', () => {
    const q = new NotificationQueue();
    const a = q.enqueue('info', 'a');
    const b = q.enqueue('info', 'b');
    assert.notEqual(a.id, b.id);
  });

  it('throws on invalid severity', () => {
    const q = new NotificationQueue();
    assert.throws(() => q.enqueue('urgent', 'x'), TypeError);
  });

  it('throws on empty message', () => {
    const q = new NotificationQueue();
    assert.throws(() => q.enqueue('info', ''), TypeError);
  });

  it('FIFO within same priority band', () => {
    const q = new NotificationQueue();
    q.enqueue('warning', 'first');
    q.enqueue('warning', 'second');
    assert.equal(q.dequeue().message, 'first');
    assert.equal(q.dequeue().message, 'second');
  });
});

// ---------------------------------------------------------------------------
// NotificationLog
// ---------------------------------------------------------------------------
describe('NotificationLog', () => {
  let logPath;

  before(() => {
    logPath = join(tmpdir(), `notif-test-${Date.now()}.jsonl`);
  });

  after(() => {
    if (existsSync(logPath)) unlinkSync(logPath);
  });

  it('writes a record and reads it back', () => {
    const log = new NotificationLog(logPath);
    log.clear();
    const notif = { id: 'n1', severity: 'info', message: 'test', meta: null, timestamp: Date.now() };
    log.write(notif);
    const records = log.readAll();
    assert.equal(records.length, 1);
    assert.equal(records[0].id, 'n1');
    assert.equal(records[0].message, 'test');
  });

  it('appends multiple records', () => {
    const log = new NotificationLog(logPath);
    log.clear();
    log.write({ id: 'n1', severity: 'info', message: 'a', meta: null, timestamp: 1 });
    log.write({ id: 'n2', severity: 'critical', message: 'b', meta: null, timestamp: 2 });
    assert.equal(log.count(), 2);
  });

  it('includes channel in record', () => {
    const log = new NotificationLog(logPath);
    log.clear();
    log.write({ id: 'n1', severity: 'info', message: 'msg', meta: null, timestamp: 1 }, 'ops');
    const records = log.readAll();
    assert.equal(records[0].channel, 'ops');
  });

  it('defaults channel to "default"', () => {
    const log = new NotificationLog(logPath);
    log.clear();
    log.write({ id: 'n1', severity: 'info', message: 'msg', meta: null, timestamp: 1 });
    const records = log.readAll();
    assert.equal(records[0].channel, 'default');
  });

  it('readAll returns empty array when file does not exist', () => {
    const missing = join(tmpdir(), `no-such-file-${Date.now()}.jsonl`);
    const log = new NotificationLog(missing);
    assert.deepEqual(log.readAll(), []);
  });

  it('clear removes all records', () => {
    const log = new NotificationLog(logPath);
    log.write({ id: 'n1', severity: 'info', message: 'x', meta: null, timestamp: 1 });
    log.clear();
    assert.equal(log.count(), 0);
  });

  it('count returns 0 for empty/missing log', () => {
    const fresh = join(tmpdir(), `fresh-${Date.now()}.jsonl`);
    const log = new NotificationLog(fresh);
    assert.equal(log.count(), 0);
  });

  it('creates parent directory if it does not exist', () => {
    const nested = join(tmpdir(), `notif-nested-${Date.now()}`, 'sub', 'log.jsonl');
    const log = new NotificationLog(nested);
    log.write({ id: 'n1', severity: 'info', message: 'nested', meta: null, timestamp: 1 });
    assert.equal(log.count(), 1);
    log.clear();
  });

  it('throws on empty filePath', () => {
    assert.throws(() => new NotificationLog(''), TypeError);
  });

  it('exposes filePath property', () => {
    const log = new NotificationLog(logPath);
    assert.equal(log.filePath, logPath);
  });
});

// ---------------------------------------------------------------------------
// ChannelRouter
// ---------------------------------------------------------------------------
describe('ChannelRouter', () => {
  it('delivers notification to subscriber on named channel', () => {
    const router = new ChannelRouter();
    let received;
    router.subscribe('alerts', (n) => { received = n; });
    router.send('alerts', { msg: 'fire' });
    assert.deepEqual(received, { msg: 'fire' });
  });

  it('delivers to multiple subscribers on same channel', () => {
    const router = new ChannelRouter();
    const got = [];
    router.subscribe('ch', (n) => got.push('a'));
    router.subscribe('ch', (n) => got.push('b'));
    router.send('ch', {});
    assert.deepEqual(got, ['a', 'b']);
  });

  it('does not deliver to subscribers on other channels', () => {
    const router = new ChannelRouter();
    let called = false;
    router.subscribe('other', () => { called = true; });
    router.send('target', {});
    assert.equal(called, false);
  });

  it('wildcard subscriber receives all channel notifications', () => {
    const router = new ChannelRouter();
    const seen = [];
    router.subscribe('*', (n, ch) => seen.push(ch));
    router.send('alpha', {});
    router.send('beta', {});
    assert.deepEqual(seen, ['alpha', 'beta']);
  });

  it('wildcard subscriber receives channel name as second argument', () => {
    const router = new ChannelRouter();
    let channelArg;
    router.subscribe('*', (n, ch) => { channelArg = ch; });
    router.send('ops-alerts', { sev: 'critical' });
    assert.equal(channelArg, 'ops-alerts');
  });

  it('returns count of handler invocations', () => {
    const router = new ChannelRouter();
    router.subscribe('c', () => {});
    router.subscribe('c', () => {});
    const count = router.send('c', {});
    assert.equal(count, 2);
  });

  it('returns 0 when channel has no subscribers', () => {
    const router = new ChannelRouter();
    assert.equal(router.send('empty', {}), 0);
  });

  it('unsubscribes via returned function', () => {
    const router = new ChannelRouter();
    let count = 0;
    const unsub = router.subscribe('ch', () => count++);
    router.send('ch', {});
    unsub();
    router.send('ch', {});
    assert.equal(count, 1);
  });

  it('unsubscribe(channel, handler) removes specific handler', () => {
    const router = new ChannelRouter();
    let aCount = 0, bCount = 0;
    const handlerA = () => aCount++;
    const handlerB = () => bCount++;
    router.subscribe('ch', handlerA);
    router.subscribe('ch', handlerB);
    router.unsubscribe('ch', handlerA);
    router.send('ch', {});
    assert.equal(aCount, 0);
    assert.equal(bCount, 1);
  });

  it('unsubscribe("*", handler) removes handler from all channels', () => {
    const router = new ChannelRouter();
    let count = 0;
    const h = () => count++;
    router.subscribe('x', h);
    router.subscribe('y', h);
    router.unsubscribe('*', h);
    router.send('x', {});
    router.send('y', {});
    assert.equal(count, 0);
  });

  it('channels() returns names with active subscribers', () => {
    const router = new ChannelRouter();
    router.subscribe('alpha', () => {});
    router.subscribe('beta', () => {});
    const chs = router.channels();
    assert.ok(chs.includes('alpha'));
    assert.ok(chs.includes('beta'));
  });

  it('subscriberCount returns correct count', () => {
    const router = new ChannelRouter();
    assert.equal(router.subscriberCount('x'), 0);
    router.subscribe('x', () => {});
    router.subscribe('x', () => {});
    assert.equal(router.subscriberCount('x'), 2);
  });

  it('clear removes all subscribers', () => {
    const router = new ChannelRouter();
    let count = 0;
    router.subscribe('ch', () => count++);
    router.clear();
    router.send('ch', {});
    assert.equal(count, 0);
  });

  it('throws on empty channel name in subscribe', () => {
    const router = new ChannelRouter();
    assert.throws(() => router.subscribe('', () => {}), TypeError);
  });

  it('throws when handler is not a function in subscribe', () => {
    const router = new ChannelRouter();
    assert.throws(() => router.subscribe('ch', 42), TypeError);
  });

  it('throws on empty channel name in send', () => {
    const router = new ChannelRouter();
    assert.throws(() => router.send('', {}), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Integration: EventBus + NotificationQueue + ChannelRouter + NotificationLog
// ---------------------------------------------------------------------------
describe('Integration', () => {
  it('EventBus drives queue enqueue and channel delivery', () => {
    const bus = new EventBus();
    const queue = new NotificationQueue();
    const router = new ChannelRouter();
    const delivered = [];

    router.subscribe('system', (n) => delivered.push(n));

    bus.on('system:alert', (payload) => {
      const notif = queue.enqueue(payload.severity, payload.message, payload.meta);
      router.send('system', notif);
    });

    bus.emit('system:alert', { severity: 'critical', message: 'Disk full', meta: { path: '/var' } });
    bus.emit('system:alert', { severity: 'info', message: 'Backup complete', meta: null });

    assert.equal(queue.size, 2);
    assert.equal(delivered.length, 2);
    assert.equal(delivered[0].severity, 'critical');
    assert.equal(delivered[1].severity, 'info');
  });

  it('NotificationLog records everything delivered via ChannelRouter', () => {
    const router = new ChannelRouter();
    const logPath = join(tmpdir(), `integration-${Date.now()}.jsonl`);
    const log = new NotificationLog(logPath);

    router.subscribe('*', (n, ch) => log.write(n, ch));

    router.send('ops', { id: 'x1', severity: 'warning', message: 'CPU high', meta: null, timestamp: Date.now() });
    router.send('dev', { id: 'x2', severity: 'info', message: 'Deploy done', meta: null, timestamp: Date.now() });

    const records = log.readAll();
    assert.equal(records.length, 2);
    assert.equal(records[0].channel, 'ops');
    assert.equal(records[1].channel, 'dev');

    log.clear();
  });

  it('priority queue drain produces correct order after mixed emits', () => {
    const bus = new EventBus();
    const queue = new NotificationQueue();

    bus.on('event', ({ severity, message }) => queue.enqueue(severity, message));

    bus.emit('event', { severity: 'info', message: 'a' });
    bus.emit('event', { severity: 'critical', message: 'b' });
    bus.emit('event', { severity: 'warning', message: 'c' });
    bus.emit('event', { severity: 'info', message: 'd' });

    const drained = queue.drainAll();
    assert.equal(drained[0].severity, 'critical');
    assert.equal(drained[1].severity, 'warning');
    // remaining two are info
    assert.ok(drained.slice(2).every((n) => n.severity === 'info'));
  });
});
