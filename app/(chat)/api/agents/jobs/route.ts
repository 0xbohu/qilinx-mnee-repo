import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createJob, getJobsByUserId } from "@/lib/agents/job-service";
import { serializeJob } from "@/lib/agents/serialization";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const jobs = await getJobsByUserId(session.user.id);
    return Response.json({
      jobs: jobs.map((job) => serializeJob(job, [], [])),
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch jobs"
    ).toResponse();
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const body = await request.json();
    const { title, goal, agentIds } = body;

    if (!title || typeof title !== "string") {
      return new ChatSDKError(
        "bad_request:api",
        "Title is required"
      ).toResponse();
    }

    if (!goal || typeof goal !== "string") {
      return new ChatSDKError(
        "bad_request:api",
        "Goal is required"
      ).toResponse();
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return new ChatSDKError(
        "bad_request:api",
        "At least one agent must be selected"
      ).toResponse();
    }

    const job = await createJob(session.user.id, { title, goal, agentIds });
    return Response.json({ job: serializeJob(job, [], []) }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to create job"
    ).toResponse();
  }
}
