/**
 * Goal Analyzer Service
 * 
 * Analyzes user goals and breaks them down into discrete, actionable tasks
 * using the Gemini 3.0 Pro Preview model with thinking enabled.
 */

import "server-only";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Agent, MCPTool } from "@/lib/db/schema";
import type { ExecutionEvent } from "./types";

export interface AgentWithTools extends Agent {
  tools: MCPTool[];
  executionOrder?: number;
}

export interface AnalyzeGoalInput {
  jobId: string;
  goal: string;
  agents: AgentWithTools[];
  onProgress?: (event: ExecutionEvent) => void;
}

export interface GeneratedTask {
  title: string;
  description: string;
  agentId: string;
  order: number;
}

export interface AnalyzeGoalResult {
  tasks: GeneratedTask[];
  thinking?: string;
}

/**
 * Analyze a user's goal and generate tasks
 */
export async function analyzeGoal(input: AnalyzeGoalInput): Promise<AnalyzeGoalResult> {
  const { jobId, goal, agents, onProgress } = input;

  onProgress?.({ type: "analysis_started", jobId });

  // Build agent capabilities summary
  const agentCapabilities = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    tools: agent.tools.map((t) => ({ name: t.name, description: t.description })),
  }));

  const systemPrompt = `You are a task planning assistant. Analyze the user's goal and break it down into discrete, actionable tasks.

Available Agents:
${JSON.stringify(agentCapabilities, null, 2)}

Rules:
1. Break down the goal into GRANULAR, ATOMIC tasks - each task should do ONE specific thing
2. For payment/transfer operations, create separate tasks for:
   - Checking wallet balance
   - Executing the transfer
   - Verifying/confirming the transaction status
3. Each task should be assigned to the most appropriate agent based on capabilities
4. Tasks should be ordered logically (dependencies first)
5. An agent can have MULTIPLE tasks assigned to it - don't combine steps into one task
6. Include a clear title and description for each task
7. If a Reviewer Agent is available, add a final review task
8. Use the agent's ID (uuid) for the agentId field
9. Each task should map to roughly ONE tool call when executed

Example for a payment goal:
- Task 1: "Check wallet balance" - Verify sufficient funds before transfer
- Task 2: "Execute MNEE transfer" - Send the specified amount to recipient
- Task 3: "Verify transaction" - Confirm the transfer was successful
- Task 4: "Report final balance" - Check and report the new balance

Respond with ONLY a valid JSON array of tasks, no markdown or explanation:
[
  {
    "title": "Task title",
    "description": "Detailed description of what this task should accomplish",
    "agentId": "uuid-of-assigned-agent",
    "order": 1
  }
]`;

  try {
    const result = await generateText({
      model: google("gemini-3-pro-preview"),
      system: systemPrompt,
      prompt: `Goal: ${goal}`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 2048,
          },
        },
      },
    });

    // Extract thinking from reasoning parts
    const thinking = result.reasoning?.map((r) => r.text).join("\n");

    // Parse tasks from response - handle potential markdown code blocks
    let tasksJson = result.text.trim();
    if (tasksJson.startsWith("```")) {
      // Remove markdown code block
      tasksJson = tasksJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const tasks = JSON.parse(tasksJson) as GeneratedTask[];

    // Validate tasks have required fields
    for (const task of tasks) {
      if (!task.title || !task.agentId || task.order === undefined) {
        throw new Error("Invalid task structure: missing required fields");
      }
    }

    onProgress?.({ type: "analysis_completed", jobId, taskCount: tasks.length });

    return { tasks, thinking };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Analysis failed";
    onProgress?.({ type: "analysis_failed", jobId, error: errorMessage });
    throw error;
  }
}
