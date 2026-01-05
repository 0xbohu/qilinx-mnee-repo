import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  deleteJob,
  getJobById,
  updateJob,
  updateJobStatus,
} from "@/lib/agents/job-service";
import { serializeJob } from "@/lib/agents/serialization";
import { ChatSDKError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
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

    // Debug: Log task attempts
    for (const task of job.tasks) {
      const attempts = task.attempts as unknown[];
      console.log(`[API GET] Task ${task.id}: status=${task.status}, attempts=${JSON.stringify(attempts)?.substring(0, 500)}`);
    }

    return Response.json({ job: serializeJob(job, job.agents, job.tasks) });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch job"
    ).toResponse();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { id } = await params;
    const existingJob = await getJobById(id);

    if (!existingJob) {
      return new ChatSDKError("not_found:chat", "Job not found").toResponse();
    }

    // Verify ownership
    if (existingJob.userId !== session.user.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const body = await request.json();
    const { status, title, goal } = body;

    let updatedJob;
    if (status) {
      updatedJob = await updateJobStatus(id, status);
    } else {
      updatedJob = await updateJob(id, { title, goal });
    }

    return Response.json({ job: serializeJob(updatedJob, [], []) });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to update job"
    ).toResponse();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { id } = await params;
    const existingJob = await getJobById(id);

    if (!existingJob) {
      return new ChatSDKError("not_found:chat", "Job not found").toResponse();
    }

    // Verify ownership
    if (existingJob.userId !== session.user.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    await deleteJob(id);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to delete job"
    ).toResponse();
  }
}
