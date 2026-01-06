import { generateText, stepCountIs } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { voiceAgentSystemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { ChatSDKError } from "@/lib/errors";
import {
  loadMCPToolsForUser,
  disconnectMCPClients,
  type MCPToolsContext,
} from "@/lib/mcp/loader";
import {
  loadFirecrawlTools,
  disconnectFirecrawlClient,
  type FirecrawlClientInstance,
} from "@/lib/mcp/firecrawl-client";

interface VoiceAgentRequest {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export async function POST(request: NextRequest) {
  let mcpContext: MCPToolsContext = { tools: {}, clients: [] };
  let firecrawlClient: FirecrawlClientInstance | null = null;
  
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const body: VoiceAgentRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Load MCP tools for the user (same as text chat)
    try {
      mcpContext = await loadMCPToolsForUser(session.user.id);
    } catch (error) {
      console.error("Failed to load MCP tools for voice agent:", error);
      // Continue without MCP tools
    }

    // Load Firecrawl tools for news/web scraping
    let firecrawlTools = {};
    try {
      const firecrawlResult = await loadFirecrawlTools();
      firecrawlTools = firecrawlResult.tools;
      firecrawlClient = firecrawlResult.client;
      console.log("Firecrawl tools loaded:", Object.keys(firecrawlTools));
    } catch (error) {
      console.error("Failed to load Firecrawl tools:", error);
      // Continue without Firecrawl
    }

    // Combine all tools
    const allTools = {
      ...mcpContext.tools,
      ...firecrawlTools,
    };

    console.log("All available tools for voice agent:", Object.keys(allTools));

    // Build messages array for the LLM
    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Generate response using Gemini 2.0 Flash with MCP tools
    const result = await generateText({
      model: getLanguageModel("google/gemini-2.0-flash"),
      system: voiceAgentSystemPrompt,
      messages,
      tools: Object.keys(allTools).length > 0 ? allTools : undefined,
      stopWhen: stepCountIs(5), // Allow up to 5 tool call steps
    });

    // Get the text response
    const responseText = result.text || "I'm sorry, I couldn't generate a response.";

    // Cleanup MCP clients
    await disconnectMCPClients(mcpContext);
    await disconnectFirecrawlClient(firecrawlClient);

    return NextResponse.json({
      response: responseText,
    });
  } catch (error) {
    console.error("Voice agent chat error:", error);

    // Cleanup MCP clients on error
    await disconnectMCPClients(mcpContext);
    await disconnectFirecrawlClient(firecrawlClient);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
