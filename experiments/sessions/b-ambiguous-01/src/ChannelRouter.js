/**
 * ChannelRouter — route notifications to named subscriber channels.
 *
 * A channel is a named slot that has zero or more subscriber callbacks.
 * When a notification is sent to a channel, all subscribers on that channel
 * receive it. Channels are created implicitly when first subscribed to.
 * Wildcards: subscribing to '*' receives every notification regardless of channel.
 */

/** @typedef {(notification: object, channel: string) => void} ChannelHandler */

export class ChannelRouter {
  /** @type {Map<string, Set<ChannelHandler>>} */
  #channels = new Map();

  /**
   * Subscribe to a named channel (or '*' for all channels).
   * @param {string} channel
   * @param {ChannelHandler} handler
   * @returns {() => void} unsubscribe function
   */
  subscribe(channel, handler) {
    if (typeof channel !== 'string' || !channel) {
      throw new TypeError('channel must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    if (!this.#channels.has(channel)) this.#channels.set(channel, new Set());
    this.#channels.get(channel).add(handler);

    return () => {
      const set = this.#channels.get(channel);
      if (set) set.delete(handler);
    };
  }

  /**
   * Unsubscribe a handler from a channel (or all channels if channel is '*').
   * @param {string} channel
   * @param {ChannelHandler} handler
   */
  unsubscribe(channel, handler) {
    if (channel === '*') {
      for (const set of this.#channels.values()) set.delete(handler);
    } else {
      this.#channels.get(channel)?.delete(handler);
    }
  }

  /**
   * Send a notification object to a named channel.
   * Wildcard ('*') subscribers also receive the notification.
   * @param {string} channel
   * @param {object} notification
   * @returns {number} total handler invocations
   */
  send(channel, notification) {
    if (typeof channel !== 'string' || !channel) {
      throw new TypeError('channel must be a non-empty string');
    }

    let count = 0;
    const channelSet = this.#channels.get(channel);
    if (channelSet) {
      for (const handler of channelSet) {
        handler(notification, channel);
        count++;
      }
    }

    // Wildcard subscribers
    if (channel !== '*') {
      const wildcardSet = this.#channels.get('*');
      if (wildcardSet) {
        for (const handler of wildcardSet) {
          handler(notification, channel);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Return the names of all channels that have at least one subscriber.
   * @returns {string[]}
   */
  channels() {
    return [...this.#channels.entries()]
      .filter(([, set]) => set.size > 0)
      .map(([ch]) => ch);
  }

  /**
   * Return the number of subscribers on a channel.
   * @param {string} channel
   * @returns {number}
   */
  subscriberCount(channel) {
    return this.#channels.get(channel)?.size ?? 0;
  }

  /**
   * Remove all subscribers from all channels.
   */
  clear() {
    this.#channels.clear();
  }
}
