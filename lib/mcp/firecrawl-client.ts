/**
 * Firecrawl MCP Client
 * 
 * Provides web scraping capabilities via Firecrawl MCP server
 * for the voice agent to fetch news and web content.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tool, type Tool } from "ai";
import { z } from "zod";

export interface FirecrawlClientInstance {
  scrape: (url: string) => Promise<string>;
  close: () => Promise<void>;
}

// biome-ignore lint/suspicious/noExplicitAny: MCP tools have dynamic schemas
export type FirecrawlToolRecord = Record<string, Tool<any, any>>;

let firecrawlClient: Client | null = null;
let firecrawlTransport: StreamableHTTPClientTransport | null = null;

/**
 * Get Firecrawl MCP URL from environment
 */
function getFirecrawlUrl(): string | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not configured");
    return null;
  }
  // Use StreamableHTTP endpoint format as per Firecrawl docs
  return `https://mcp.firecrawl.dev/${apiKey}/v2/mcp`;
}

/**
 * Create Firecrawl MCP client
 */
export async function createFirecrawlClient(): Promise<FirecrawlClientInstance | null> {
  const url = getFirecrawlUrl();
  if (!url) {
    return null;
  }

  console.log("Attempting to connect to Firecrawl MCP at:", url);

  try {
    firecrawlTransport = new StreamableHTTPClientTransport(new URL(url));
    firecrawlClient = new Client({
      name: "qilinx-voice-agent",
      version: "1.0.0",
    });

    await firecrawlClient.connect(firecrawlTransport);
    console.log("Successfully connected to Firecrawl MCP");

    return {
      scrape: async (targetUrl: string) => {
        if (!firecrawlClient) {
          throw new Error("Firecrawl client not connected");
        }

        console.log("Calling firecrawl_scrape for URL:", targetUrl);
        const response = await firecrawlClient.callTool({
          name: "firecrawl_scrape",
          arguments: {
            url: targetUrl,
            formats: ["markdown"],
          },
        });

        // Extract text content from response
        if (response.content && Array.isArray(response.content)) {
          const textContent = response.content
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join("\n");
          
          return textContent || "No content retrieved";
        }

        return "No content retrieved";
      },
      close: async () => {
        if (firecrawlClient) {
          await firecrawlClient.close();
          firecrawlClient = null;
          firecrawlTransport = null;
        }
      },
    };
  } catch (error) {
    console.error("Failed to create Firecrawl client:", error);
    return null;
  }
}

/**
 * Create AI SDK tools for Firecrawl
 */
export async function loadFirecrawlTools(): Promise<{
  tools: FirecrawlToolRecord;
  client: FirecrawlClientInstance | null;
}> {
  const tools: FirecrawlToolRecord = {};
  
  const client = await createFirecrawlClient();
  if (!client) {
    return { tools, client: null };
  }

  // Create scrape tool for fetching web content
  tools.firecrawl_scrape = tool({
    description: "Scrape and extract content from a webpage. Use this to get news from mnee.io or posts from X/Twitter.",
    inputSchema: z.object({
      url: z.string().describe("The URL to scrape content from"),
    }),
    execute: async ({ url }) => {
      try {
        const content = await client.scrape(url);
        // Truncate very long content for voice responses
        if (content.length > 3000) {
          return content.substring(0, 3000) + "... [content truncated]";
        }
        return content;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to scrape URL",
        };
      }
    },
  });

  return { tools, client };
}

/**
 * Disconnect Firecrawl client
 */
export async function disconnectFirecrawlClient(client: FirecrawlClientInstance | null): Promise<void> {
  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.error("Failed to disconnect Firecrawl client:", error);
    }
  }
}
