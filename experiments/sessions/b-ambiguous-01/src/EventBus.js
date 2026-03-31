/**
 * EventBus — a simple synchronous pub/sub event bus.
 *
 * Subscribers register handlers for named events. When an event is emitted,
 * all registered handlers receive the payload synchronously in registration order.
 * One-time subscribers (once) are removed after first delivery.
 */
export class EventBus {
  /** @type {Map<string, Array<{handler: Function, once: boolean}>>} */
  #listeners = new Map();

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {(payload: unknown) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(event, handler) {
    if (typeof event !== 'string' || !event) throw new TypeError('event must be a non-empty string');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');

    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    const entry = { handler, once: false };
    this.#listeners.get(event).push(entry);

    return () => this.#removeEntry(event, entry);
  }

  /**
   * Subscribe to an event exactly once.
   * @param {string} event
   * @param {(payload: unknown) => void} handler
   * @returns {() => void} unsubscribe function
   */
  once(event, handler) {
    if (typeof event !== 'string' || !event) throw new TypeError('event must be a non-empty string');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');

    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    const entry = { handler, once: true };
    this.#listeners.get(event).push(entry);

    return () => this.#removeEntry(event, entry);
  }

  /**
   * Remove all handlers for an event (or all events if no event given).
   * @param {string} [event]
   */
  off(event) {
    if (event === undefined) {
      this.#listeners.clear();
    } else {
      this.#listeners.delete(event);
    }
  }

  /**
   * Emit an event, invoking all registered handlers synchronously.
   * @param {string} event
   * @param {unknown} [payload]
   * @returns {number} number of handlers called
   */
  emit(event, payload) {
    if (typeof event !== 'string' || !event) throw new TypeError('event must be a non-empty string');

    const entries = this.#listeners.get(event);
    if (!entries || entries.length === 0) return 0;

    // Snapshot to handle once-removal during iteration
    const snapshot = [...entries];
    let count = 0;
    for (const entry of snapshot) {
      if (entry.once) this.#removeEntry(event, entry);
      entry.handler(payload);
      count++;
    }
    return count;
  }

  /**
   * Return the number of listeners for an event.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this.#listeners.get(event)?.length ?? 0;
  }

  /** @param {string} event @param {{ handler: Function, once: boolean }} entry */
  #removeEntry(event, entry) {
    const entries = this.#listeners.get(event);
    if (!entries) return;
    const idx = entries.indexOf(entry);
    if (idx !== -1) entries.splice(idx, 1);
  }
}
