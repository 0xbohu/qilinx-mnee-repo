/**
 * Task Executor Service
 * 
 * Executes individual tasks using the assigned agent's instructions
 * and available MCP tools with the Gemini 3.0 Pro Preview model.
 */

import "server-only";

import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { loadMCPToolsForUser, disconnectMCPClients } from "@/lib/mcp/loader";
import type { AgentJob, AgentJobTask, TaskAttempt } from "@/lib/db/schema";
import type { AgentWithTools } from "./goal-analyzer";
import type { ExecutionEvent } from "./types";

export interface ExecuteTaskInput {
  task: AgentJobTask;
  agent: AgentWithTools;
  job: AgentJob;
  userId: string;
  previousTaskResults?: TaskAttempt[];
  onProgress?: (event: ExecutionEvent) => void;
}

export interface ExecuteTaskResult {
  attempt: TaskAttempt;
  success: boolean;
}

/**
 * Execute a single task with the assigned agent
 */
export async function executeTask(input: ExecuteTaskInput): Promise<ExecuteTaskResult> {
  const { task, agent, job, userId, previousTaskResults, onProgress } = input;

  const attemptNumber = (task.attempts?.length || 0) + 1;
  const attempt: TaskAttempt = {
    attemptNumber,
    startedAt: new Date().toISOString(),
    status: "running",
    toolCalls: [],
  };

  onProgress?.({ type: "task_started", taskId: task.id, attemptNumber });

  let mcpContext = { tools: {}, clients: [] as Awaited<ReturnType<typeof loadMCPToolsForUser>>["clients"] };

  try {
    // Load MCP tools for this user
    mcpContext = await loadMCPToolsForUser(userId);
    
    const toolCount = Object.keys(mcpContext.tools).length;
    console.log(`[TaskExecutor] Loaded ${toolCount} MCP tools for user ${userId}`);
    if (toolCount > 0) {
      console.log(`[TaskExecutor] Available tools: ${Object.keys(mcpContext.tools).join(", ")}`);
    }

    // Build context from previous task results
    const previousContext = previousTaskResults
      ?.filter((r) => r.status === "completed" && r.aiResponse)
      .map((r) => `Previous task result: ${r.aiResponse}`)
      .join("\n\n");

    const systemPrompt = `${agent.instructions}

You are executing a specific task as part of a larger job.
Job Goal: ${job.goal}

${previousContext ? `Context from previous tasks:\n${previousContext}\n` : ""}

Execute the following task and use the available tools as needed.
Report your findings clearly and concisely.`;

    const result = await generateText({
      model: google("gemini-3-pro-preview"),
      system: systemPrompt,
      prompt: `Task: ${task.title}\n\nDescription: ${task.description || "No additional description"}`,
      tools: Object.keys(mcpContext.tools).length > 0 ? mcpContext.tools : undefined,
      stopWhen: stepCountIs(10), // Allow up to 10 tool call steps
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 2048,
          },
        },
      },
      onStepFinish: ({ toolCalls, toolResults }) => {
        // Emit progress for each tool call
        if (toolCalls && toolCalls.length > 0) {
          for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i] as { toolName: string; args?: Record<string, unknown> };
            const toolResult = toolResults?.[i] as { result?: unknown } | undefined;

            const toolCallRecord = {
              toolName: call.toolName,
              arguments: call.args ?? {},
              result: toolResult?.result,
              error: typeof toolResult?.result === "object" && toolResult?.result !== null && "error" in toolResult.result
                ? String((toolResult.result as { error: unknown }).error)
                : undefined,
            };

            attempt.toolCalls?.push(toolCallRecord);

            onProgress?.({
              type: "tool_called",
              taskId: task.id,
              toolName: call.toolName,
              arguments: call.args as Record<string, unknown>,
              result: toolResult?.result,
            });
          }
        }
      },
    });

    // Disconnect MCP clients
    await disconnectMCPClients(mcpContext);

    // Extract thinking from reasoning parts
    attempt.thinking = result.reasoning?.map((r) => r.text).join("\n");
    attempt.aiResponse = result.text;
    attempt.completedAt = new Date().toISOString();
    attempt.status = "completed";

    // Log captured data for debugging
    console.log(`[TaskExecutor] Task ${task.id} completed`);
    console.log(`[TaskExecutor] Tool calls captured: ${attempt.toolCalls?.length || 0}`);
    console.log(`[TaskExecutor] AI response length: ${attempt.aiResponse?.length || 0}`);
    console.log(`[TaskExecutor] Thinking length: ${attempt.thinking?.length || 0}`);
    if (attempt.toolCalls && attempt.toolCalls.length > 0) {
      for (const tc of attempt.toolCalls) {
        console.log(`[TaskExecutor] Tool: ${tc.toolName}, Args: ${JSON.stringify(tc.arguments)}, Result: ${JSON.stringify(tc.result)?.substring(0, 200)}`);
      }
    }

    onProgress?.({
      type: "task_completed",
      taskId: task.id,
      response: result.text,
      thinking: attempt.thinking,
    });

    return { attempt, success: true };
  } catch (error) {
    // Ensure MCP clients are disconnected on error
    await disconnectMCPClients(mcpContext);

    attempt.completedAt = new Date().toISOString();
    attempt.status = "failed";
    attempt.error = error instanceof Error ? error.message : "Unknown error";

    onProgress?.({
      type: "task_failed",
      taskId: task.id,
      error: attempt.error,
    });

    return { attempt, success: false };
  }
}
