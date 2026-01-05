-- Migration: Add walletConfig column to User table
-- This column stores flexible JSON wallet configuration supporting multiple blockchain types

ALTER TABLE "User" ADD COLUMN "walletConfig" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "User"."walletConfig" IS 'JSON configuration for user wallets (MNEE, Ethereum, Solana, etc.)';
