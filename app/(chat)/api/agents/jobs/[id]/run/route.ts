import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getJobById } from "@/lib/agents/job-service";
import { runJob } from "@/lib/agents/orchestrator";
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
    if (job.status !== "ready" && job.status !== "paused") {
      return new ChatSDKError(
        "bad_request:api",
        `Job cannot run from status: ${job.status}`
      ).toResponse();
    }

    // Check that tasks exist
    if (job.tasks.length === 0) {
      return new ChatSDKError(
        "bad_request:api",
        "No tasks to execute. Run analysis first."
      ).toResponse();
    }

    // Start execution in background (non-blocking)
    runJob({
      jobId: id,
      userId: session.user.id,
    }).catch((error) => {
      console.error("Job execution failed:", error);
    });

    return Response.json({ success: true, message: "Job started" });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to start job"
    ).toResponse();
  }
}
