/**
 * Execution Event Types for AGI Agents
 * 
 * These events are emitted during job execution and streamed to the UI via SSE.
 */

export type ExecutionEvent =
  | { type: "job_started"; jobId: string }
  | { type: "job_paused"; jobId: string }
  | { type: "job_resumed"; jobId: string }
  | { type: "job_cancelled"; jobId: string }
  | { type: "job_completed"; jobId: string }
  | { type: "job_failed"; jobId: string; error?: string }
  | { type: "task_started"; taskId: string; attemptNumber: number }
  | { type: "task_completed"; taskId: string; response: string; thinking?: string }
  | { type: "task_failed"; taskId: string; error: string }
  | { type: "tool_called"; taskId: string; toolName: string; arguments: Record<string, unknown>; result?: unknown }
  | { type: "analysis_started"; jobId: string }
  | { type: "analysis_completed"; jobId: string; taskCount: number }
  | { type: "analysis_failed"; jobId: string; error: string };

/**
 * Orchestrator state for tracking running jobs
 */
export interface OrchestratorState {
  jobId: string;
  status: "running" | "paused" | "cancelled";
  currentTaskIndex: number;
}

/**
 * Retry configuration for task execution
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(attemptNumber: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
