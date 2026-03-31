/**
 * @file notify.js
 * @spec NOTIFY-001
 * @implements src/notify.js#createNotificationBus
 * @implements src/notify.js#subscribe
 * @implements src/notify.js#unsubscribe
 * @implements src/notify.js#emit
 * @test src/notify.test.js
 * @evidence E1 — file exists, unit tests in src/notify.test.js exercise all requirements
 *
 * Notification system library.
 * Pure Node.js stdlib, no external dependencies.
 * Exposes a factory function that creates isolated notification buses.
 */

'use strict';

/**
 * Validates that `value` is a non-empty string.
 * @param {unknown} value
 * @param {string} label — used in error message
 * @throws {TypeError}
 */
function assertEventType(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string, got: ${typeof value}`);
  }
}

/**
 * Validates that `value` is a function.
 * @param {unknown} value
 * @param {string} label — used in error message
 * @throws {TypeError}
 */
function assertFunction(value, label) {
  if (typeof value !== 'function') {
    throw new TypeError(`${label} must be a function, got: ${typeof value}`);
  }
}

/**
 * @spec NOTIFY-001
 * @implements REQ-NOTIFY-001-04
 *
 * Creates and returns an isolated notification bus.
 * Each call returns a new bus with its own independent subscription registry.
 *
 * @returns {{ subscribe: Function, unsubscribe: Function, emit: Function }}
 *
 * @example
 * const bus = createNotificationBus();
 * const id = bus.subscribe('user.login', (type, payload) => {
 *   console.log(`Event: ${type}`, payload);
 * });
 * bus.emit('user.login', { userId: 42 }); // handler called
 * bus.unsubscribe(id);
 * bus.emit('user.login', { userId: 42 }); // no handlers called
 */
export function createNotificationBus() {
  /**
   * Map from eventType string → Map<Symbol, Function>
   * Using a Map<Symbol, Function> per event type preserves insertion order
   * and allows O(1) lookup by subscription ID for unsubscribe.
   *
   * @type {Map<string, Map<symbol, Function>>}
   */
  const registry = new Map();

  /**
   * Reverse-index: subscriptionId → eventType, so unsubscribe can find
   * the right inner Map without scanning all event types.
   *
   * @type {Map<symbol, string>}
   */
  const idToType = new Map();

  /**
   * @spec NOTIFY-001
   * @implements REQ-NOTIFY-001-01
   *
   * Registers `handler` to be called whenever `eventType` is emitted.
   *
   * @param {string} eventType — non-empty string identifying the event
   * @param {Function} handler — called as handler(eventType, payload) on emit
   * @returns {symbol} — unique subscription ID; pass to `unsubscribe` to remove
   * @throws {TypeError} if eventType is not a non-empty string
   * @throws {TypeError} if handler is not a function
   */
  function subscribe(eventType, handler) {
    assertEventType(eventType, 'eventType');
    assertFunction(handler, 'handler');

    const id = Symbol('subscription');

    if (!registry.has(eventType)) {
      registry.set(eventType, new Map());
    }
    registry.get(eventType).set(id, handler);
    idToType.set(id, eventType);

    return id;
  }

  /**
   * @spec NOTIFY-001
   * @implements REQ-NOTIFY-001-02
   *
   * Removes the subscription identified by `subscriptionId`.
   *
   * @param {symbol} subscriptionId — value returned by `subscribe`
   * @returns {boolean} — true if the subscription existed and was removed, false otherwise
   */
  function unsubscribe(subscriptionId) {
    if (!idToType.has(subscriptionId)) {
      return false;
    }
    const eventType = idToType.get(subscriptionId);
    idToType.delete(subscriptionId);

    const handlers = registry.get(eventType);
    if (handlers) {
      handlers.delete(subscriptionId);
      if (handlers.size === 0) {
        registry.delete(eventType);
      }
    }

    return true;
  }

  /**
   * @spec NOTIFY-001
   * @implements REQ-NOTIFY-001-03
   *
   * Invokes all handlers registered for `eventType` in registration order,
   * passing `(eventType, payload)` to each.
   *
   * Handler errors are NOT caught; they propagate to the caller.
   *
   * @param {string} eventType — non-empty string identifying the event
   * @param {unknown} [payload] — arbitrary value forwarded to each handler
   * @returns {number} — count of handlers invoked
   * @throws {TypeError} if eventType is not a non-empty string
   */
  function emit(eventType, payload) {
    assertEventType(eventType, 'eventType');

    const handlers = registry.get(eventType);
    if (!handlers || handlers.size === 0) {
      return 0;
    }

    let count = 0;
    for (const handler of handlers.values()) {
      handler(eventType, payload);
      count++;
    }
    return count;
  }

  return { subscribe, unsubscribe, emit };
}
