import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
  type Agent,
  agent,
  type AgentMcpTool,
  agentMcpTools,
  type MCPTool,
  mcpTools,
} from "../db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Types for agent operations
export interface AgentWithTools extends Agent {
  tools: MCPTool[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  instructions: string;
  model?: string;
  toolIds?: string[];
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  instructions?: string;
  model?: string;
  isActive?: boolean;
}

// ============================================================================
// Agent CRUD Operations
// ============================================================================

export async function createAgent(data: CreateAgentInput): Promise<Agent> {
  try {
    const [newAgent] = await db
      .insert(agent)
      .values({
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        model: data.model || "gemini-2.5-pro-preview-05-06",
      })
      .returning();

    // Assign tools if provided
    if (data.toolIds && data.toolIds.length > 0) {
      await assignToolsToAgent(newAgent.id, data.toolIds);
    }

    return newAgent;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create agent");
  }
}

export async function getAgentById(id: string): Promise<AgentWithTools | null> {
  try {
    const [foundAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id));

    if (!foundAgent) {
      return null;
    }

    const tools = await getAgentTools(id);
    return { ...foundAgent, tools };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get agent by id");
  }
}

export async function getAllAgents(
  activeOnly = false
): Promise<AgentWithTools[]> {
  try {
    const whereClause = activeOnly ? eq(agent.isActive, true) : undefined;

    const agents = await db
      .select()
      .from(agent)
      .where(whereClause)
      .orderBy(asc(agent.createdAt));

    // Get tools for all agents
    const agentsWithTools = await Promise.all(
      agents.map(async (a) => {
        const tools = await getAgentTools(a.id);
        return { ...a, tools };
      })
    );

    return agentsWithTools;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get all agents");
  }
}

export async function updateAgent(
  id: string,
  data: UpdateAgentInput
): Promise<Agent> {
  try {
    const updateData: Partial<Agent> = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedAgent] = await db
      .update(agent)
      .set(updateData)
      .where(eq(agent.id, id))
      .returning();

    if (!updatedAgent) {
      throw new ChatSDKError("not_found:database", `Agent not found: ${id}`);
    }

    return updatedAgent;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to update agent");
  }
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    const [deletedAgent] = await db
      .delete(agent)
      .where(eq(agent.id, id))
      .returning();

    if (!deletedAgent) {
      throw new ChatSDKError("not_found:database", `Agent not found: ${id}`);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to delete agent");
  }
}

// ============================================================================
// Agent-Tool Association Operations
// ============================================================================

export async function getAgentTools(agentId: string): Promise<MCPTool[]> {
  try {
    const toolAssociations = await db
      .select({
        tool: mcpTools,
      })
      .from(agentMcpTools)
      .innerJoin(mcpTools, eq(agentMcpTools.mcpToolId, mcpTools.id))
      .where(eq(agentMcpTools.agentId, agentId));

    return toolAssociations.map((ta) => ta.tool);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent tools"
    );
  }
}

export async function assignToolsToAgent(
  agentId: string,
  toolIds: string[]
): Promise<void> {
  try {
    // Validate that all tools exist
    const existingTools = await db
      .select({ id: mcpTools.id })
      .from(mcpTools)
      .where(inArray(mcpTools.id, toolIds));

    const existingToolIds = new Set(existingTools.map((t) => t.id));
    const invalidToolIds = toolIds.filter((id) => !existingToolIds.has(id));

    if (invalidToolIds.length > 0) {
      throw new ChatSDKError(
        "bad_request:database",
        `Invalid tool IDs: ${invalidToolIds.join(", ")}`
      );
    }

    // Insert associations (ignore duplicates)
    const associations = toolIds.map((toolId) => ({
      agentId,
      mcpToolId: toolId,
    }));

    await db
      .insert(agentMcpTools)
      .values(associations)
      .onConflictDoNothing();
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to assign tools to agent"
    );
  }
}

export async function removeToolsFromAgent(
  agentId: string,
  toolIds: string[]
): Promise<void> {
  try {
    await db
      .delete(agentMcpTools)
      .where(
        and(
          eq(agentMcpTools.agentId, agentId),
          inArray(agentMcpTools.mcpToolId, toolIds)
        )
      );
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to remove tools from agent"
    );
  }
}

export async function setAgentTools(
  agentId: string,
  toolIds: string[]
): Promise<void> {
  try {
    // Remove all existing associations
    await db
      .delete(agentMcpTools)
      .where(eq(agentMcpTools.agentId, agentId));

    // Add new associations if any
    if (toolIds.length > 0) {
      await assignToolsToAgent(agentId, toolIds);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to set agent tools"
    );
  }
}
