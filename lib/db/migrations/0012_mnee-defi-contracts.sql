-- MNEE DeFi Contracts Library Tables
-- Migration: 0012_mnee-defi-contracts.sql

-- Contract Template table for storing DeFi contract templates
CREATE TABLE IF NOT EXISTS "Contract_Template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(128) NOT NULL,
  "description" text NOT NULL,
  "category" varchar NOT NULL,
  "soliditySourceCode" text NOT NULL,
  "abi" json,
  "constructorParamsSchema" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contract_template_category_check" CHECK ("category" IN ('staking', 'dao-voting', 'payment'))
);

-- User Contract table for storing user deployed contracts
CREATE TABLE IF NOT EXISTS "User_Contract" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "templateId" uuid REFERENCES "Contract_Template"("id"),
  "name" varchar(128) NOT NULL,
  "contractAddress" varchar(42) NOT NULL,
  "network" varchar NOT NULL,
  "constructorArgs" json,
  "deployedSourceCode" text NOT NULL,
  "abi" json NOT NULL,
  "transactionHash" varchar(66) NOT NULL,
  "deployedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_contract_network_check" CHECK ("network" IN ('mainnet', 'sepolia'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "user_contract_user_id_idx" ON "User_Contract"("userId");
CREATE INDEX IF NOT EXISTS "user_contract_network_idx" ON "User_Contract"("network");
CREATE INDEX IF NOT EXISTS "contract_template_category_idx" ON "Contract_Template"("category");
