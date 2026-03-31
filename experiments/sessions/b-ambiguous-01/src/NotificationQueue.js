/**
 * NotificationQueue — a priority-aware, ordered notification queue.
 *
 * Notifications have a severity level: 'info' | 'warning' | 'critical'.
 * Consumers dequeue items one at a time (FIFO within each priority band).
 * Priority order: critical > warning > info.
 */

/** @typedef {'info'|'warning'|'critical'} Severity */

/** @typedef {{ id: string, severity: Severity, message: string, meta: unknown, timestamp: number }} Notification */

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };
let _seq = 0;

/**
 * Generate a unique notification ID.
 * @returns {string}
 */
function nextId() {
  return `notif-${Date.now()}-${++_seq}`;
}

export class NotificationQueue {
  /** @type {Notification[]} */
  #queue = [];

  /**
   * Enqueue a notification.
   * @param {Severity} severity
   * @param {string} message
   * @param {unknown} [meta]
   * @returns {Notification} the enqueued notification
   */
  enqueue(severity, message, meta = null) {
    if (!SEVERITY_RANK[severity]) {
      throw new TypeError(`severity must be one of: ${Object.keys(SEVERITY_RANK).join(', ')}`);
    }
    if (typeof message !== 'string' || !message.trim()) {
      throw new TypeError('message must be a non-empty string');
    }

    /** @type {Notification} */
    const notif = {
      id: nextId(),
      severity,
      message,
      meta,
      timestamp: Date.now(),
    };
    this.#queue.push(notif);
    return notif;
  }

  /**
   * Dequeue the highest-priority notification (critical first, then warning, then info).
   * FIFO within the same priority band.
   * @returns {Notification|null}
   */
  dequeue() {
    if (this.#queue.length === 0) return null;

    let bestIdx = 0;
    let bestRank = SEVERITY_RANK[this.#queue[0].severity];

    for (let i = 1; i < this.#queue.length; i++) {
      const rank = SEVERITY_RANK[this.#queue[i].severity];
      if (rank > bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    }

    return this.#queue.splice(bestIdx, 1)[0];
  }

  /**
   * Peek at the highest-priority notification without removing it.
   * @returns {Notification|null}
   */
  peek() {
    if (this.#queue.length === 0) return null;

    let best = this.#queue[0];
    let bestRank = SEVERITY_RANK[best.severity];

    for (let i = 1; i < this.#queue.length; i++) {
      const rank = SEVERITY_RANK[this.#queue[i].severity];
      if (rank > bestRank) {
        bestRank = rank;
        best = this.#queue[i];
      }
    }

    return best;
  }

  /**
   * Drain all notifications in priority order.
   * @returns {Notification[]}
   */
  drainAll() {
    const result = [];
    let item;
    while ((item = this.dequeue()) !== null) result.push(item);
    return result;
  }

  /** @returns {number} */
  get size() {
    return this.#queue.length;
  }

  /** @returns {boolean} */
  get isEmpty() {
    return this.#queue.length === 0;
  }

  /**
   * Return all notifications of a given severity (does not remove them).
   * @param {Severity} severity
   * @returns {Notification[]}
   */
  filterBySeverity(severity) {
    return this.#queue.filter((n) => n.severity === severity);
  }
}
