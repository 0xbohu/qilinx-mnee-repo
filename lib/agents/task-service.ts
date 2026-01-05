import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
  agent,
  agentJob,
  type AgentJobTask,
  agentJobTask,
  type AgentJobTaskStatus,
  agentJobTaskStatusValues,
  type TaskAttempt,
} from "../db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Types for task operations
export interface CreateTaskInput {
  jobId: string;
  agentId: string;
  title: string;
  description?: string;
  order?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: AgentJobTaskStatus;
  order?: number;
}

export interface AttemptResult {
  aiResponse: string;
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
}

// ============================================================================
// Task CRUD Operations
// ============================================================================

export async function createTask(data: CreateTaskInput): Promise<AgentJobTask> {
  try {
    // Validate job exists
    const [existingJob] = await db
      .select({ id: agentJob.id })
      .from(agentJob)
      .where(eq(agentJob.id, data.jobId));

    if (!existingJob) {
      throw new ChatSDKError(
        "bad_request:database",
        `Job not found: ${data.jobId}`
      );
    }

    // Validate agent exists
    const [existingAgent] = await db
      .select({ id: agent.id })
      .from(agent)
      .where(eq(agent.id, data.agentId));

    if (!existingAgent) {
      throw new ChatSDKError(
        "bad_request:database",
        `Agent not found: ${data.agentId}`
      );
    }

    const [newTask] = await db
      .insert(agentJobTask)
      .values({
        jobId: data.jobId,
        agentId: data.agentId,
        title: data.title,
        description: data.description,
        order: data.order ?? 0,
        status: "pending",
        attempts: [],
      })
      .returning();

    return newTask;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to create task");
  }
}

export async function getTaskById(id: string): Promise<AgentJobTask | null> {
  try {
    const [foundTask] = await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.id, id));

    return foundTask || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get task by id");
  }
}

export async function getTasksByJobId(jobId: string): Promise<AgentJobTask[]> {
  try {
    return await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.jobId, jobId))
      .orderBy(asc(agentJobTask.order));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get tasks by job id"
    );
  }
}

export async function updateTask(
  id: string,
  data: UpdateTaskInput
): Promise<AgentJobTask> {
  try {
    // Get current task to check status
    const [currentTask] = await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.id, id));

    if (!currentTask) {
      throw new ChatSDKError("not_found:database", `Task not found: ${id}`);
    }

    // Only allow title/description updates for pending tasks
    if (
      currentTask.status !== "pending" &&
      (data.title !== undefined || data.description !== undefined)
    ) {
      throw new ChatSDKError(
        "bad_request:database",
        `Task ${id} with status '${currentTask.status}' cannot be edited`
      );
    }

    // Validate status if provided
    if (data.status && !agentJobTaskStatusValues.includes(data.status)) {
      throw new ChatSDKError(
        "bad_request:database",
        `Invalid status '${data.status}'. Valid values: ${agentJobTaskStatusValues.join(", ")}`
      );
    }

    const updateData: Partial<AgentJobTask> = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedTask] = await db
      .update(agentJobTask)
      .set(updateData)
      .where(eq(agentJobTask.id, id))
      .returning();

    return updatedTask;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to update task");
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    const [deletedTask] = await db
      .delete(agentJobTask)
      .where(eq(agentJobTask.id, id))
      .returning();

    if (!deletedTask) {
      throw new ChatSDKError("not_found:database", `Task not found: ${id}`);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to delete task");
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function createTasks(
  tasks: CreateTaskInput[]
): Promise<AgentJobTask[]> {
  try {
    if (tasks.length === 0) {
      return [];
    }

    // Validate all jobs and agents exist
    const jobIds = [...new Set(tasks.map((t) => t.jobId))];
    const agentIds = [...new Set(tasks.map((t) => t.agentId))];

    const existingJobs = await db
      .select({ id: agentJob.id })
      .from(agentJob)
      .where(inArray(agentJob.id, jobIds));

    const existingAgents = await db
      .select({ id: agent.id })
      .from(agent)
      .where(inArray(agent.id, agentIds));

    const existingJobIds = new Set(existingJobs.map((j) => j.id));
    const existingAgentIds = new Set(existingAgents.map((a) => a.id));

    for (const task of tasks) {
      if (!existingJobIds.has(task.jobId)) {
        throw new ChatSDKError(
          "bad_request:database",
          `Job not found: ${task.jobId}`
        );
      }
      if (!existingAgentIds.has(task.agentId)) {
        throw new ChatSDKError(
          "bad_request:database",
          `Agent not found: ${task.agentId}`
        );
      }
    }

    const taskValues = tasks.map((task, index) => ({
      jobId: task.jobId,
      agentId: task.agentId,
      title: task.title,
      description: task.description,
      order: task.order ?? index,
      status: "pending" as const,
      attempts: [],
    }));

    return await db.insert(agentJobTask).values(taskValues).returning();
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to create tasks");
  }
}

export async function reorderTasks(
  jobId: string,
  taskOrders: { id: string; order: number }[]
): Promise<void> {
  try {
    // Update each task's order
    await Promise.all(
      taskOrders.map(({ id, order }) =>
        db
          .update(agentJobTask)
          .set({ order, updatedAt: new Date() })
          .where(and(eq(agentJobTask.id, id), eq(agentJobTask.jobId, jobId)))
      )
    );
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to reorder tasks");
  }
}

// ============================================================================
// Attempt Management
// ============================================================================

export async function startAttempt(taskId: string): Promise<TaskAttempt> {
  try {
    const [task] = await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.id, taskId));

    if (!task) {
      throw new ChatSDKError("not_found:database", `Task not found: ${taskId}`);
    }

    const attempts = (task.attempts as TaskAttempt[]) || [];
    const newAttempt: TaskAttempt = {
      attemptNumber: attempts.length + 1,
      startedAt: new Date().toISOString(),
      status: "running",
    };

    const updatedAttempts = [...attempts, newAttempt];

    await db
      .update(agentJobTask)
      .set({
        attempts: updatedAttempts,
        status: "running",
        updatedAt: new Date(),
      })
      .where(eq(agentJobTask.id, taskId));

    return newAttempt;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to start attempt");
  }
}

export async function completeAttempt(
  taskId: string,
  attemptNumber: number,
  result: AttemptResult
): Promise<TaskAttempt> {
  try {
    const [task] = await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.id, taskId));

    if (!task) {
      throw new ChatSDKError("not_found:database", `Task not found: ${taskId}`);
    }

    const attempts = (task.attempts as TaskAttempt[]) || [];
    const attemptIndex = attempts.findIndex(
      (a) => a.attemptNumber === attemptNumber
    );

    if (attemptIndex === -1) {
      throw new ChatSDKError(
        "not_found:database",
        `Attempt ${attemptNumber} not found for task ${taskId}`
      );
    }

    const updatedAttempt: TaskAttempt = {
      ...attempts[attemptIndex],
      completedAt: new Date().toISOString(),
      status: "completed",
      aiResponse: result.aiResponse,
      toolCalls: result.toolCalls,
    };

    const updatedAttempts = [...attempts];
    updatedAttempts[attemptIndex] = updatedAttempt;

    await db
      .update(agentJobTask)
      .set({
        attempts: updatedAttempts,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(agentJobTask.id, taskId));

    return updatedAttempt;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to complete attempt"
    );
  }
}

export async function failAttempt(
  taskId: string,
  attemptNumber: number,
  error: string
): Promise<TaskAttempt> {
  try {
    const [task] = await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.id, taskId));

    if (!task) {
      throw new ChatSDKError("not_found:database", `Task not found: ${taskId}`);
    }

    const attempts = (task.attempts as TaskAttempt[]) || [];
    const attemptIndex = attempts.findIndex(
      (a) => a.attemptNumber === attemptNumber
    );

    if (attemptIndex === -1) {
      throw new ChatSDKError(
        "not_found:database",
        `Attempt ${attemptNumber} not found for task ${taskId}`
      );
    }

    const updatedAttempt: TaskAttempt = {
      ...attempts[attemptIndex],
      completedAt: new Date().toISOString(),
      status: "failed",
      error,
    };

    const updatedAttempts = [...attempts];
    updatedAttempts[attemptIndex] = updatedAttempt;

    await db
      .update(agentJobTask)
      .set({
        attempts: updatedAttempts,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(agentJobTask.id, taskId));

    return updatedAttempt;
  } catch (err) {
    if (err instanceof ChatSDKError) throw err;
    throw new ChatSDKError("bad_request:database", "Failed to fail attempt");
  }
}

/**
 * Update task with full attempt data including thinking, tool calls, and AI response
 * This is used by the orchestrator to save complete execution results
 */
export async function updateTaskAttempts(
  taskId: string,
  attempts: TaskAttempt[],
  status: "pending" | "running" | "completed" | "failed" | "skipped"
): Promise<void> {
  try {
    // Log the attempts being saved for debugging
    console.log(`[TaskService] Saving ${attempts.length} attempts for task ${taskId}`);
    if (attempts.length > 0) {
      const latestAttempt = attempts[attempts.length - 1];
      console.log(`[TaskService] Latest attempt status: ${latestAttempt.status}`);
      console.log(`[TaskService] Tool calls count: ${latestAttempt.toolCalls?.length || 0}`);
      console.log(`[TaskService] Has AI response: ${!!latestAttempt.aiResponse}`);
      console.log(`[TaskService] Has thinking: ${!!latestAttempt.thinking}`);
    }

    await db
      .update(agentJobTask)
      .set({
        attempts,
        status,
        updatedAt: new Date(),
      })
      .where(eq(agentJobTask.id, taskId));

    console.log(`[TaskService] Successfully saved attempts for task ${taskId}`);
  } catch (error) {
    console.error(`[TaskService] Failed to save attempts for task ${taskId}:`, error);
    throw new ChatSDKError("bad_request:database", "Failed to update task attempts");
  }
}
