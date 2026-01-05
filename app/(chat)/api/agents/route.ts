import { auth } from "@/app/(auth)/auth";
import { getAllAgents } from "@/lib/agents/agent-service";
import { serializeAgent } from "@/lib/agents/serialization";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const agents = await getAllAgents(true); // activeOnly
    return Response.json({
      agents: agents.map((a) => serializeAgent(a, a.tools)),
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch agents"
    ).toResponse();
  }
}
