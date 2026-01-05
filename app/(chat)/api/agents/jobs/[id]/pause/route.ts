import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getJobById } from "@/lib/agents/job-service";
import { pauseJob } from "@/lib/agents/orchestrator";
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
    if (job.status !== "running") {
      return new ChatSDKError(
        "bad_request:api",
        `Job cannot be paused from status: ${job.status}`
      ).toResponse();
    }

    const success = pauseJob(id);

    if (!success) {
      return new ChatSDKError(
        "bad_request:api",
        "Job is not currently running"
      ).toResponse();
    }

    return Response.json({ success: true, message: "Job paused" });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to pause job"
    ).toResponse();
  }
}
