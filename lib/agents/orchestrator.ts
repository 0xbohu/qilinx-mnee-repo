/**
 * Agent Orchestrator Service
 * 
 * Manages the execution flow of jobs, coordinating multiple agents
 * and handling pause/resume/cancel operations.
 */

import "server-only";

import { updateJobStatus, getJobById } from "./job-service";
import { updateTask, updateTaskAttempts } from "./task-service";
import { executeTask } from "./task-executor";
import { emitJobEvent } from "./event-emitter";
import type { TaskAttempt } from "@/lib/db/schema";
import type { AgentWithTools } from "./goal-analyzer";
import type { ExecutionEvent, OrchestratorState } from "./types";
import { RETRY_CONFIG, calculateRetryDelay, sleep } from "./types";

// In-memory state for running jobs
const runningJobs = new Map<string, OrchestratorState>();

// Promises for pause/resume synchronization
const resumePromises = new Map<string, { resolve: () => void; promise: Promise<void> }>();

export interface RunJobInput {
  jobId: string;
  userId: string;
}

/**
 * Run a job, executing all tasks in order
 */
export async function runJob(input: RunJobInput): Promise<void> {
  const { jobId, userId } = input;

  const onProgress = (event: ExecutionEvent) => {
    emitJobEvent(jobId, event);
  };

  // Get job with all details
  const job = await getJobById(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Initialize orchestrator state
  const state: OrchestratorState = {
    jobId,
    status: "running",
    currentTaskIndex: 0,
  };
  runningJobs.set(jobId, state);

  // Update job status
  await updateJobStatus(jobId, "running");
  onProgress({ type: "job_started", jobId });

  // Get tasks ordered by execution order
  const tasks = [...job.tasks].sort((a, b) => a.order - b.order);

  if (tasks.length === 0) {
    await updateJobStatus(jobId, "completed");
    onProgress({ type: "job_completed", jobId });
    runningJobs.delete(jobId);
    return;
  }

  // Build agent map for quick lookup
  const agentMap = new Map<string, AgentWithTools>();
  for (const agent of job.agents) {
    agentMap.set(agent.id, agent);
  }

  const completedTaskResults: TaskAttempt[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    state.currentTaskIndex = i;

    // Check for pause/cancel
    const currentState = runningJobs.get(jobId);
    if (!currentState || currentState.status === "cancelled") {
      await updateJobStatus(jobId, "failed");
      onProgress({ type: "job_cancelled", jobId });
      runningJobs.delete(jobId);
      return;
    }

    if (currentState.status === "paused") {
      await updateJobStatus(jobId, "paused");
      onProgress({ type: "job_paused", jobId });
      
      // Wait for resume or cancel
      await waitForResume(jobId);
      
      const resumedState = runningJobs.get(jobId);
      if (!resumedState || resumedState.status === "cancelled") {
        await updateJobStatus(jobId, "failed");
        onProgress({ type: "job_cancelled", jobId });
        runningJobs.delete(jobId);
        return;
      }
      
      await updateJobStatus(jobId, "running");
      onProgress({ type: "job_resumed", jobId });
    }

    // Get agent for this task
    const agent = agentMap.get(task.agentId);
    if (!agent) {
      console.error(`Agent not found for task ${task.id}: ${task.agentId}`);
      await updateTask(task.id, { status: "failed" });
      continue;
    }

    // Update task status to running
    await updateTask(task.id, { status: "running" });

    // Execute task with retry logic
    let success = false;
    let lastAttempt: TaskAttempt | null = null;

    for (let retry = 0; retry < RETRY_CONFIG.maxAttempts && !success; retry++) {
      if (retry > 0) {
        // Exponential backoff
        await sleep(calculateRetryDelay(retry));
      }

      // Re-fetch task to get latest attempts
      const result = await executeTask({
        task: { ...task, attempts: lastAttempt ? [...(task.attempts || []), lastAttempt] : task.attempts },
        agent,
        job,
        userId,
        previousTaskResults: completedTaskResults,
        onProgress,
      });

      lastAttempt = result.attempt;
      success = result.success;

      // Save attempt to database
      const currentTask = tasks[i];
      const updatedAttempts = [...(currentTask.attempts || []), result.attempt];
      await updateTaskAttempts(task.id, updatedAttempts, success ? "completed" : (retry === RETRY_CONFIG.maxAttempts - 1 ? "failed" : "pending"));
    }

    if (!success) {
      // Task failed after all retries
      await updateJobStatus(jobId, "failed");
      onProgress({ type: "job_failed", jobId, error: lastAttempt?.error });
      runningJobs.delete(jobId);
      return;
    }

    if (lastAttempt) {
      completedTaskResults.push(lastAttempt);
    }
  }

  // All tasks completed successfully
  await updateJobStatus(jobId, "completed");
  onProgress({ type: "job_completed", jobId });
  runningJobs.delete(jobId);
}

/**
 * Wait for a paused job to be resumed or cancelled
 */
async function waitForResume(jobId: string): Promise<void> {
  // Create a promise that will be resolved when resume is called
  let resolveFunc: () => void;
  const promise = new Promise<void>((resolve) => {
    resolveFunc = resolve;
  });

  resumePromises.set(jobId, { resolve: resolveFunc!, promise });

  await promise;

  resumePromises.delete(jobId);
}

/**
 * Pause a running job
 */
export function pauseJob(jobId: string): boolean {
  const state = runningJobs.get(jobId);
  if (state && state.status === "running") {
    state.status = "paused";
    return true;
  }
  return false;
}

/**
 * Resume a paused job
 */
export function resumeJob(jobId: string): boolean {
  const state = runningJobs.get(jobId);
  if (state && state.status === "paused") {
    state.status = "running";
    
    // Resolve the wait promise
    const resumePromise = resumePromises.get(jobId);
    if (resumePromise) {
      resumePromise.resolve();
    }
    
    return true;
  }
  return false;
}

/**
 * Cancel a job
 */
export function cancelJob(jobId: string): boolean {
  const state = runningJobs.get(jobId);
  if (state) {
    state.status = "cancelled";
    
    // Resolve the wait promise if paused
    const resumePromise = resumePromises.get(jobId);
    if (resumePromise) {
      resumePromise.resolve();
    }
    
    return true;
  }
  return false;
}

/**
 * Check if a job is currently running
 */
export function isJobRunning(jobId: string): boolean {
  return runningJobs.has(jobId);
}

/**
 * Get the current state of a running job
 */
export function getJobState(jobId: string): OrchestratorState | undefined {
  return runningJobs.get(jobId);
}
