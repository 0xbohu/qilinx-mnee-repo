import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
  type Agent,
  agent,
  type AgentJob,
  agentJob,
  type AgentJobAgent,
  agentJobAgents,
  type AgentJobStatus,
  agentJobStatusValues,
  type AgentJobTask,
  agentJobTask,
  agentMcpTools,
  type MCPTool,
  mcpTools,
} from "../db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Types for job operations
export interface AgentWithTools extends Agent {
  tools: MCPTool[];
  executionOrder?: number;
}

export interface JobWithDetails extends AgentJob {
  agents: AgentWithTools[];
  tasks: AgentJobTask[];
}

export interface CreateJobInput {
  title: string;
  goal: string;
  agentIds: string[];
}

export interface UpdateJobInput {
  title?: string;
  goal?: string;
  status?: AgentJobStatus;
}

// ============================================================================
// Job CRUD Operations
// ============================================================================

export async function createJob(
  userId: string,
  data: CreateJobInput
): Promise<AgentJob> {
  try {
    const [newJob] = await db
      .insert(agentJob)
      .values({
        userId,
        title: data.title,
        goal: data.goal,
        status: "pending",
      })
      .returning();

    // Assign agents if provided
    if (data.agentIds && data.agentIds.length > 0) {
      await assignAgentsToJob(newJob.id, data.agentIds);
    }

    return newJob;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create job");
  }
}

export async function getJobById(id: string): Promise<JobWithDetails | null> {
  try {
    const [foundJob] = await db
      .select()
      .from(agentJob)
      .where(eq(agentJob.id, id));

    if (!foundJob) {
      return null;
    }

    const agents = await getJobAgents(id);
    const tasks = await getJobTasks(id);

    return { ...foundJob, agents, tasks };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get job by id");
  }
}

export async function getJobsByUserId(userId: string): Promise<AgentJob[]> {
  try {
    return await db
      .select()
      .from(agentJob)
      .where(eq(agentJob.userId, userId))
      .orderBy(asc(agentJob.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get jobs by user id"
    );
  }
}

export async function updateJob(
  id: string,
  data: UpdateJobInput
): Promise<AgentJob> {
  try {
    // Validate status if provided
    if (data.status && !agentJobStatusValues.includes(data.status)) {
      throw new ChatSDKError(
        "bad_request:database",
        `Invalid status '${data.status}'. Valid values: ${agentJobStatusValues.join(", ")}`
      );
    }

    const updateData: Partial<AgentJob> = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedJob] = await db
      .update(agentJob)
      .set(updateData)
      .where(eq(agentJob.id, id))
      .returning();

    if (!updatedJob) {
      throw new ChatSDKError("not_found:database", `Job not found: ${id}`);
    }

    return updatedJob;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to update job");
  }
}

export async function deleteJob(id: string): Promise<void> {
  try {
    const [deletedJob] = await db
      .delete(agentJob)
      .where(eq(agentJob.id, id))
      .returning();

    if (!deletedJob) {
      throw new ChatSDKError("not_found:database", `Job not found: ${id}`);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to delete job");
  }
}

// ============================================================================
// Job-Agent Association Operations
// ============================================================================

async function getJobAgents(jobId: string): Promise<AgentWithTools[]> {
  try {
    const agentAssociations = await db
      .select({
        agent: agent,
        executionOrder: agentJobAgents.executionOrder,
      })
      .from(agentJobAgents)
      .innerJoin(agent, eq(agentJobAgents.agentId, agent.id))
      .where(eq(agentJobAgents.jobId, jobId))
      .orderBy(asc(agentJobAgents.executionOrder));

    // Get tools for each agent
    const agentsWithTools = await Promise.all(
      agentAssociations.map(async (aa) => {
        const toolAssociations = await db
          .select({ tool: mcpTools })
          .from(agentMcpTools)
          .innerJoin(mcpTools, eq(agentMcpTools.mcpToolId, mcpTools.id))
          .where(eq(agentMcpTools.agentId, aa.agent.id));

        return {
          ...aa.agent,
          tools: toolAssociations.map((ta) => ta.tool),
          executionOrder: aa.executionOrder,
        };
      })
    );

    return agentsWithTools;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get job agents");
  }
}

async function getJobTasks(jobId: string): Promise<AgentJobTask[]> {
  try {
    return await db
      .select()
      .from(agentJobTask)
      .where(eq(agentJobTask.jobId, jobId))
      .orderBy(asc(agentJobTask.order));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get job tasks");
  }
}

export async function assignAgentsToJob(
  jobId: string,
  agentIds: string[],
  orders?: number[]
): Promise<void> {
  try {
    // Validate that all agents exist and are active
    const existingAgents = await db
      .select({ id: agent.id, isActive: agent.isActive })
      .from(agent)
      .where(inArray(agent.id, agentIds));

    const existingAgentMap = new Map(
      existingAgents.map((a) => [a.id, a.isActive])
    );

    for (const agentId of agentIds) {
      if (!existingAgentMap.has(agentId)) {
        throw new ChatSDKError(
          "bad_request:database",
          `Agent not found: ${agentId}`
        );
      }
      if (!existingAgentMap.get(agentId)) {
        throw new ChatSDKError(
          "bad_request:database",
          `Cannot assign inactive agent: ${agentId}`
        );
      }
    }

    // Insert associations with execution order
    const associations = agentIds.map((agentId, index) => ({
      jobId,
      agentId,
      executionOrder: orders?.[index] ?? index,
    }));

    await db
      .insert(agentJobAgents)
      .values(associations)
      .onConflictDoNothing();
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to assign agents to job"
    );
  }
}

export async function removeAgentsFromJob(
  jobId: string,
  agentIds: string[]
): Promise<void> {
  try {
    await db
      .delete(agentJobAgents)
      .where(
        and(
          eq(agentJobAgents.jobId, jobId),
          inArray(agentJobAgents.agentId, agentIds)
        )
      );
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to remove agents from job"
    );
  }
}

// ============================================================================
// Job Status Management
// ============================================================================

export async function updateJobStatus(
  jobId: string,
  status: AgentJobStatus
): Promise<AgentJob> {
  // Validate status
  if (!agentJobStatusValues.includes(status)) {
    throw new ChatSDKError(
      "bad_request:database",
      `Invalid status '${status}'. Valid values: ${agentJobStatusValues.join(", ")}`
    );
  }

  // If trying to run, check prerequisites
  if (status === "running") {
    const canRun = await canJobRun(jobId);
    if (!canRun) {
      throw new ChatSDKError(
        "bad_request:database",
        `Job ${jobId} cannot run: no agents assigned`
      );
    }
  }

  return updateJob(jobId, { status });
}

export async function canJobRun(jobId: string): Promise<boolean> {
  try {
    const [result] = await db
      .select({ agentId: agentJobAgents.agentId })
      .from(agentJobAgents)
      .where(eq(agentJobAgents.jobId, jobId))
      .limit(1);

    return !!result;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to check if job can run"
    );
  }
}
