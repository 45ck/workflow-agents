/**
 * NotificationLog — append-only, file-backed audit log for notifications.
 *
 * Each record is written as a JSON line (JSONL) so the file is human-readable
 * and easy to parse. The log directory is created if it does not exist.
 * All writes are synchronous for simplicity and predictability.
 */

import { appendFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';

export class NotificationLog {
  /** @type {string} */
  #filePath;

  /**
   * @param {string} filePath  Absolute or relative path to the JSONL log file.
   */
  constructor(filePath) {
    if (typeof filePath !== 'string' || !filePath) {
      throw new TypeError('filePath must be a non-empty string');
    }
    this.#filePath = filePath;
    // Ensure parent directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Append a notification record to the log.
   * @param {{ id: string, severity: string, message: string, meta: unknown, timestamp: number }} notification
   * @param {string} [channel]  Optional channel name for context.
   */
  write(notification, channel = 'default') {
    const record = {
      ...notification,
      channel,
      loggedAt: new Date().toISOString(),
    };
    appendFileSync(this.#filePath, JSON.stringify(record) + '\n', 'utf8');
  }

  /**
   * Read all log records from the file.
   * @returns {object[]}
   */
  readAll() {
    if (!existsSync(this.#filePath)) return [];
    const raw = readFileSync(this.#filePath, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map((line) => JSON.parse(line));
  }

  /**
   * Clear (delete) the log file.
   */
  clear() {
    if (existsSync(this.#filePath)) {
      unlinkSync(this.#filePath);
    }
  }

  /**
   * Return the number of records in the log.
   * @returns {number}
   */
  count() {
    return this.readAll().length;
  }

  /**
   * Return the path of the log file.
   * @returns {string}
   */
  get filePath() {
    return this.#filePath;
  }
}
