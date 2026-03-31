/**
 * notification-system — public API
 *
 * Re-exports all four components so consumers can import from a single entry point.
 *
 *   import { EventBus, NotificationQueue, NotificationLog, ChannelRouter } from './src/index.js';
 */

export { EventBus } from './EventBus.js';
export { NotificationQueue } from './NotificationQueue.js';
export { NotificationLog } from './NotificationLog.js';
export { ChannelRouter } from './ChannelRouter.js';
