import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getJobById, updateJobStatus } from "@/lib/agents/job-service";
import { cancelJob, isJobRunning } from "@/lib/agents/orchestrator";
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

    // Check job status - can cancel from running, paused, analyzing, or pending
    const cancellableStatuses = ["running", "paused", "analyzing", "pending"];
    if (!cancellableStatuses.includes(job.status)) {
      return new ChatSDKError(
        "bad_request:api",
        `Job cannot be cancelled from status: ${job.status}`
      ).toResponse();
    }

    // If job is running in orchestrator, cancel it there
    if (isJobRunning(id)) {
      cancelJob(id);
    } else {
      // Otherwise just update the status directly
      await updateJobStatus(id, "failed");
    }

    return Response.json({ success: true, message: "Job cancelled" });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to cancel job"
    ).toResponse();
  }
}
