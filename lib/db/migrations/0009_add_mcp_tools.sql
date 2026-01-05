-- Migration: Add MCP Tools table and user config
-- This migration adds support for MCP (Model Context Protocol) tool integration

-- Create MCP_Tools table for storing external tool server configurations
CREATE TABLE IF NOT EXISTS "MCP_Tools" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(128) NOT NULL,
  "description" TEXT,
  "host" VARCHAR(512) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add mcpToolsConfig column to User table for storing tool preferences
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mcpToolsConfig" JSONB;

-- Seed initial MCP tool: MNEE Wallet Tools
INSERT INTO "MCP_Tools" ("name", "description", "host", "isActive")
VALUES (
  'MNEE Wallet Tools',
  'Wallet tools for checking balance, transferring tokens, and managing merchant wallets',
  'https://qilin-mcp-mnee.vercel.app/api/mcp',
  true
);
