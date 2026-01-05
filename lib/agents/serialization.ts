import type {
  Agent,
  AgentJob,
  AgentJobTask,
  MCPTool,
  TaskAttempt,
} from "../db/schema";

// Serialized types for API responses
export interface SerializedAgent {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tools: SerializedMCPTool[];
}

export interface SerializedMCPTool {
  id: string;
  name: string;
  description: string | null;
  host: string;
  isActive: boolean;
  createdAt: string;
}

export interface SerializedJob {
  id: string;
  userId: string;
  title: string;
  goal: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  agents: SerializedAgent[];
  tasks: SerializedTask[];
}

export interface SerializedTask {
  id: string;
  jobId: string;
  agentId: string;
  title: string;
  description: string | null;
  status: string;
  order: number;
  attempts: TaskAttempt[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Serialization Functions
// ============================================================================

export function serializeMCPTool(tool: MCPTool): SerializedMCPTool {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    host: tool.host,
    isActive: tool.isActive,
    createdAt: tool.createdAt.toISOString(),
  };
}

export function serializeAgent(
  agent: Agent,
  tools: MCPTool[] = []
): SerializedAgent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    model: agent.model,
    isActive: agent.isActive,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
    tools: tools.map(serializeMCPTool),
  };
}

export function serializeTask(task: AgentJobTask): SerializedTask {
  return {
    id: task.id,
    jobId: task.jobId,
    agentId: task.agentId,
    title: task.title,
    description: task.description,
    status: task.status,
    order: task.order,
    attempts: (task.attempts as TaskAttempt[]) || [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeJob(
  job: AgentJob,
  agents: Array<Agent & { tools?: MCPTool[] }> = [],
  tasks: AgentJobTask[] = []
): SerializedJob {
  return {
    id: job.id,
    userId: job.userId,
    title: job.title,
    goal: job.goal,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    agents: agents.map((a) => serializeAgent(a, a.tools || [])),
    tasks: tasks.map(serializeTask),
  };
}

// ============================================================================
// Deserialization Functions (for round-trip)
// ============================================================================

export function deserializeAgent(data: SerializedAgent): {
  agent: Omit<Agent, "id"> & { id: string };
  tools: MCPTool[];
} {
  return {
    agent: {
      id: data.id,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      model: data.model,
      isActive: data.isActive,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    },
    tools: data.tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      host: t.host,
      isActive: t.isActive,
      createdAt: new Date(t.createdAt),
    })),
  };
}

export function deserializeTask(data: SerializedTask): AgentJobTask {
  return {
    id: data.id,
    jobId: data.jobId,
    agentId: data.agentId,
    title: data.title,
    description: data.description,
    status: data.status as AgentJobTask["status"],
    order: data.order,
    attempts: data.attempts,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export function deserializeJob(data: SerializedJob): {
  job: AgentJob;
  agents: Array<Agent & { tools: MCPTool[] }>;
  tasks: AgentJobTask[];
} {
  return {
    job: {
      id: data.id,
      userId: data.userId,
      title: data.title,
      goal: data.goal,
      status: data.status as AgentJob["status"],
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    },
    agents: data.agents.map((a) => {
      const { agent, tools } = deserializeAgent(a);
      return { ...agent, tools } as Agent & { tools: MCPTool[] };
    }),
    tasks: data.tasks.map(deserializeTask),
  };
}
