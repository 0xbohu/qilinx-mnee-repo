import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getJobById } from "@/lib/agents/job-service";
import { subscribeToJobEvents } from "@/lib/agents/event-emitter";
import { ChatSDKError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
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

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const connectEvent = `data: ${JSON.stringify({ type: "connected", jobId: id })}\n\n`;
        controller.enqueue(encoder.encode(connectEvent));

        // Subscribe to job events
        unsubscribe = subscribeToJobEvents(id, (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Close stream on terminal events
            if (
              event.type === "job_completed" ||
              event.type === "job_failed" ||
              event.type === "job_cancelled"
            ) {
              setTimeout(() => {
                try {
                  controller.close();
                } catch {
                  // Stream may already be closed
                }
              }, 100);
            }
          } catch (error) {
            console.error("Error sending SSE event:", error);
          }
        });
      },
      cancel() {
        if (unsubscribe) {
          unsubscribe();
        }
      },
    });

    // Handle request abort
    request.signal.addEventListener("abort", () => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to create stream"
    ).toResponse();
  }
}
