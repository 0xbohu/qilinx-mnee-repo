import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { WalletConfig } from "./wallet-types";

// MCP Tools Configuration stored per user
export interface MCPToolsConfig {
  disabledToolIds: string[]; // Array of mcp_tools.id that user has disabled
}

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  walletConfig: json("walletConfig").$type<WalletConfig>(),
  apiToken: uuid("apiToken").defaultRandom(),
  mcpToolsConfig: json("mcpToolsConfig").$type<MCPToolsConfig>(),
});

export type User = InferSelectModel<typeof user>;

// MCP Tools table for storing external tool server configurations
export const mcpTools = pgTable("MCP_Tools", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  host: varchar("host", { length: 512 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type MCPTool = InferSelectModel<typeof mcpTools>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;


// ============================================================================
// AGI Agents Schema
// ============================================================================

// Agent table for storing AGI agent configurations
export const agent = pgTable("Agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(),
  model: varchar("model", { length: 64 }).notNull().default("gemini-2.5-pro-preview-05-06"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Agent = InferSelectModel<typeof agent>;

// Status enums for AGI Agent jobs and tasks
export const agentJobStatusValues = ["pending", "analyzing", "ready", "running", "paused", "completed", "failed"] as const;
export type AgentJobStatus = typeof agentJobStatusValues[number];

export const agentJobTaskStatusValues = ["pending", "running", "completed", "failed", "skipped"] as const;
export type AgentJobTaskStatus = typeof agentJobTaskStatusValues[number];

// Task attempt interface for storing execution attempts as JSON
export interface TaskAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  thinking?: string;        // AI model's reasoning/thinking output
  aiResponse?: string;      // Final response text
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    error?: string;         // Individual tool call errors
  }>;
  error?: string;
}


// Junction table for Agent to MCP Tools many-to-many relationship
export const agentMcpTools = pgTable(
  "Agent_MCP_Tools",
  {
    agentId: uuid("agentId")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    mcpToolId: uuid("mcpToolId")
      .notNull()
      .references(() => mcpTools.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.agentId, table.mcpToolId] }),
  })
);

export type AgentMcpTool = InferSelectModel<typeof agentMcpTools>;


// Agent Job table for storing user-created jobs
export const agentJob = pgTable("Agent_Job", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  title: varchar("title", { length: 256 }).notNull(),
  goal: text("goal").notNull(),
  status: varchar("status", { enum: agentJobStatusValues }).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AgentJob = InferSelectModel<typeof agentJob>;


// Junction table for Agent Job to Agents many-to-many relationship with execution order
export const agentJobAgents = pgTable(
  "Agent_Job_Agents",
  {
    jobId: uuid("jobId")
      .notNull()
      .references(() => agentJob.id, { onDelete: "cascade" }),
    agentId: uuid("agentId")
      .notNull()
      .references(() => agent.id),
    executionOrder: integer("executionOrder").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobId, table.agentId] }),
  })
);

export type AgentJobAgent = InferSelectModel<typeof agentJobAgents>;


// Agent Job Task table for storing tasks identified by agents
export const agentJobTask = pgTable("Agent_Job_Task", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  jobId: uuid("jobId")
    .notNull()
    .references(() => agentJob.id, { onDelete: "cascade" }),
  agentId: uuid("agentId")
    .notNull()
    .references(() => agent.id),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: varchar("status", { enum: agentJobTaskStatusValues }).notNull().default("pending"),
  order: integer("order").notNull().default(0),
  attempts: json("attempts").$type<TaskAttempt[]>().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AgentJobTask = InferSelectModel<typeof agentJobTask>;


// ============================================================================
// MNEE DeFi Contracts Library Schema
// ============================================================================

// Contract template categories
export const contractCategoryValues = ["staking", "dao-voting", "payment"] as const;
export type ContractCategory = typeof contractCategoryValues[number];

// Ethereum network types
export const ethereumNetworkValues = ["mainnet", "sepolia"] as const;
export type EthereumNetwork = typeof ethereumNetworkValues[number];

// Constructor parameter schema for AI customization
export interface ConstructorParam {
  name: string;
  type: string;           // Solidity type: address, uint256, string, etc.
  description: string;
  defaultValue?: string;
  required: boolean;
}

// Contract template table for storing DeFi contract templates
export const contractTemplate = pgTable("Contract_Template", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { enum: contractCategoryValues }).notNull(),
  soliditySourceCode: text("soliditySourceCode").notNull(),
  abi: json("abi").$type<object[]>(),
  constructorParamsSchema: json("constructorParamsSchema").$type<ConstructorParam[]>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type ContractTemplate = InferSelectModel<typeof contractTemplate>;

// User deployed contracts table
export const userContract = pgTable("User_Contract", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  templateId: uuid("templateId")
    .references(() => contractTemplate.id),
  name: varchar("name", { length: 128 }).notNull(),
  contractAddress: varchar("contractAddress", { length: 42 }).notNull(),
  network: varchar("network", { enum: ethereumNetworkValues }).notNull(),
  constructorArgs: json("constructorArgs").$type<Record<string, unknown>>(),
  deployedSourceCode: text("deployedSourceCode").notNull(),
  abi: json("abi").$type<object[]>().notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }).notNull(),
  deployedAt: timestamp("deployedAt").notNull().defaultNow(),
});

export type UserContract = InferSelectModel<typeof userContract>;

// ============================================================================
// DApps Builder Schema
// ============================================================================

// DApp UI configuration - JSON schema for configuring pre-built templates
export interface DappUiConfig {
  // Template type determines which React component to render
  templateType: "staking" | "dao-voting" | "payment";
  
  // Theme customization
  theme: {
    primaryColor: string;      // e.g., "#3b82f6"
    accentColor: string;       // e.g., "#10b981"
    backgroundColor: string;   // e.g., "#ffffff"
    textColor: string;         // e.g., "#1f2937"
    cardStyle: "default" | "bordered" | "elevated";
  };
  
  // Branding
  branding: {
    title: string;             // DApp title displayed in header
    subtitle?: string;         // Optional subtitle
    logoUrl?: string;          // Optional logo URL
  };
  
  // Section visibility and labels (varies by template type)
  sections: {
    // Staking template sections
    stakeForm?: { enabled: boolean; title: string };
    stakedBalance?: { enabled: boolean; title: string };
    rewards?: { enabled: boolean; title: string };
    withdrawForm?: { enabled: boolean; title: string };
    
    // DAO Voting template sections
    proposalList?: { enabled: boolean; title: string };
    createProposal?: { enabled: boolean; title: string };
    votingStats?: { enabled: boolean; title: string };
    
    // Payment template sections
    paymentForm?: { enabled: boolean; title: string };
    receiptHistory?: { enabled: boolean; title: string };
    merchantInfo?: { enabled: boolean; title: string };
  };
  
  // Feature toggles
  features: {
    showContractInfo: boolean;
    showNetworkBadge: boolean;
    showMneeApproval: boolean;
    showWalletBalance: boolean;
  };
}

// Default configurations for each template type
export const DEFAULT_STAKING_CONFIG: DappUiConfig = {
  templateType: "staking",
  theme: {
    primaryColor: "#3b82f6",
    accentColor: "#10b981",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    cardStyle: "default",
  },
  branding: { title: "MNEE Staking", subtitle: "Stake your MNEE tokens to earn rewards" },
  sections: {
    stakeForm: { enabled: true, title: "Stake MNEE" },
    stakedBalance: { enabled: true, title: "Your Staked Balance" },
    rewards: { enabled: true, title: "Earned Rewards" },
    withdrawForm: { enabled: true, title: "Withdraw" },
  },
  features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: true, showWalletBalance: true },
};

export const DEFAULT_DAO_VOTING_CONFIG: DappUiConfig = {
  templateType: "dao-voting",
  theme: {
    primaryColor: "#8b5cf6",
    accentColor: "#f59e0b",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    cardStyle: "default",
  },
  branding: { title: "MNEE DAO", subtitle: "Participate in governance decisions" },
  sections: {
    proposalList: { enabled: true, title: "Active Proposals" },
    createProposal: { enabled: true, title: "Create Proposal" },
    votingStats: { enabled: true, title: "Governance Stats" },
  },
  features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: false, showWalletBalance: true },
};

export const DEFAULT_PAYMENT_CONFIG: DappUiConfig = {
  templateType: "payment",
  theme: {
    primaryColor: "#10b981",
    accentColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    cardStyle: "default",
  },
  branding: { title: "MNEE Payments", subtitle: "Pay with MNEE tokens" },
  sections: {
    paymentForm: { enabled: true, title: "Make Payment" },
    receiptHistory: { enabled: true, title: "Your Receipts" },
    merchantInfo: { enabled: true, title: "Merchant Info" },
  },
  features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: true, showWalletBalance: true },
};

// DApp template table for storing pre-built DApp UI templates
export const dappTemplate = pgTable("Dapp_Template", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { enum: contractCategoryValues }).notNull(),
  defaultConfig: json("defaultConfig").$type<DappUiConfig>().notNull(),
  previewImageUrl: varchar("previewImageUrl", { length: 512 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type DappTemplate = InferSelectModel<typeof dappTemplate>;

// User DApp table for storing user-created DApps
export const userDapp = pgTable("User_Dapp", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  contractId: uuid("contractId")
    .notNull()
    .references(() => userContract.id),
  templateId: uuid("templateId")
    .references(() => dappTemplate.id),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  uiConfig: json("uiConfig").$type<DappUiConfig>().notNull(),
  isPublished: boolean("isPublished").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserDapp = InferSelectModel<typeof userDapp>;
