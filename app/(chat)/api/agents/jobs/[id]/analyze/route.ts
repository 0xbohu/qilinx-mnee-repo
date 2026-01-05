import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getJobById, updateJobStatus } from "@/lib/agents/job-service";
import { createTasks } from "@/lib/agents/task-service";
import { analyzeGoal } from "@/lib/agents/goal-analyzer";
import { emitJobEvent } from "@/lib/agents/event-emitter";
import { ChatSDKError } from "@/lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { id } = await params;
    const job = await getJobById(id);

    if (!job) {
      return new ChatSDKError("not_found:chat", "Job not found").toResponse();
    }

    // Verify ownership
    if (job.userId !== session.user.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Check job status
    if (job.status !== "pending") {
      return new ChatSDKError(
        "bad_request:api",
        `Job cannot be analyzed from status: ${job.status}`
      ).toResponse();
    }

    // Check that agents are assigned
    if (job.agents.length === 0) {
      return new ChatSDKError(
        "bad_request:api",
        "No agents assigned to job"
      ).toResponse();
    }

    // Update status to analyzing
    await updateJobStatus(id, "analyzing");

    try {
      const result = await analyzeGoal({
        jobId: id,
        goal: job.goal,
        agents: job.agents,
        onProgress: (event) => emitJobEvent(id, event),
      });

      // Create tasks in database
      await createTasks(
        result.tasks.map((t) => ({
          jobId: id,
          agentId: t.agentId,
          title: t.title,
          description: t.description,
          order: t.order,
        }))
      );

      // Update status to ready
      await updateJobStatus(id, "ready");

      return Response.json({
        success: true,
        taskCount: result.tasks.length,
        thinking: result.thinking,
      });
    } catch (error) {
      // Update status to failed on error
      await updateJobStatus(id, "failed");
      throw error;
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Analysis failed:", error);
    return new ChatSDKError(
      "bad_request:api",
      error instanceof Error ? error.message : "Analysis failed"
    ).toResponse();
  }
}
