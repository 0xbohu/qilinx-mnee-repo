/**
 * Event Emitter for AGI Agents
 * 
 * Provides pub/sub pattern for job execution events,
 * enabling real-time updates via Server-Sent Events.
 */

import type { ExecutionEvent } from "./types";

type EventCallback = (event: ExecutionEvent) => void;

// In-memory event subscriptions (Map<jobId, Set<callback>>)
const subscriptions = new Map<string, Set<EventCallback>>();

/**
 * Subscribe to events for a specific job
 * @returns Unsubscribe function
 */
export function subscribeToJobEvents(
  jobId: string,
  callback: EventCallback
): () => void {
  if (!subscriptions.has(jobId)) {
    subscriptions.set(jobId, new Set());
  }

  const jobSubscriptions = subscriptions.get(jobId)!;
  jobSubscriptions.add(callback);

  // Return unsubscribe function
  return () => {
    jobSubscriptions.delete(callback);
    if (jobSubscriptions.size === 0) {
      subscriptions.delete(jobId);
    }
  };
}

/**
 * Emit an event to all subscribers of a job
 */
export function emitJobEvent(jobId: string, event: ExecutionEvent): void {
  const jobSubscriptions = subscriptions.get(jobId);
  if (jobSubscriptions) {
    for (const callback of jobSubscriptions) {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in event callback:", error);
      }
    }
  }
}

/**
 * Get the number of subscribers for a job
 */
export function getSubscriberCount(jobId: string): number {
  return subscriptions.get(jobId)?.size || 0;
}

/**
 * Clear all subscriptions for a job
 */
export function clearJobSubscriptions(jobId: string): void {
  subscriptions.delete(jobId);
}
