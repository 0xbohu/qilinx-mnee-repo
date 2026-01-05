CREATE TABLE IF NOT EXISTS "Agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"instructions" text NOT NULL,
	"model" varchar(64) DEFAULT 'gemini-2.5-pro-preview-05-06' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Agent_Job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL REFERENCES "User"("id"),
	"title" varchar(256) NOT NULL,
	"goal" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Agent_Job_Agents" (
	"jobId" uuid NOT NULL REFERENCES "Agent_Job"("id") ON DELETE CASCADE,
	"agentId" uuid NOT NULL REFERENCES "Agent"("id"),
	"executionOrder" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "Agent_Job_Agents_jobId_agentId_pk" PRIMARY KEY("jobId","agentId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Agent_Job_Task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL REFERENCES "Agent_Job"("id") ON DELETE CASCADE,
	"agentId" uuid NOT NULL REFERENCES "Agent"("id"),
	"title" varchar(256) NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"attempts" json DEFAULT '[]'::json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Agent_MCP_Tools" (
	"agentId" uuid NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
	"mcpToolId" uuid NOT NULL REFERENCES "MCP_Tools"("id") ON DELETE CASCADE,
	CONSTRAINT "Agent_MCP_Tools_agentId_mcpToolId_pk" PRIMARY KEY("agentId","mcpToolId")
);
