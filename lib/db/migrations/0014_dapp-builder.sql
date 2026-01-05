-- DApps Builder Schema (JSON-based configuration approach)
-- Migration: 0014_dapp-builder.sql

-- DApp Template table for storing pre-built DApp UI templates
-- Templates define default JSON configurations for each contract category
CREATE TABLE IF NOT EXISTS "Dapp_Template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(128) NOT NULL,
  "description" text,
  "category" varchar NOT NULL,
  "defaultConfig" json NOT NULL,
  "previewImageUrl" varchar(512),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- User DApp table for storing user-created DApps
-- uiConfig stores JSON configuration that controls pre-built React template components
CREATE TABLE IF NOT EXISTS "User_Dapp" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "contractId" uuid NOT NULL REFERENCES "User_Contract"("id"),
  "templateId" uuid REFERENCES "Dapp_Template"("id"),
  "name" varchar(128) NOT NULL,
  "slug" varchar(128) NOT NULL UNIQUE,
  "description" text,
  "uiConfig" json NOT NULL,
  "isPublished" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Create index on slug for fast public page lookups
CREATE INDEX IF NOT EXISTS "idx_user_dapp_slug" ON "User_Dapp"("slug");

-- Create index on userId for user's DApps listing
CREATE INDEX IF NOT EXISTS "idx_user_dapp_user_id" ON "User_Dapp"("userId");

-- Create index on isPublished for public DApp queries
CREATE INDEX IF NOT EXISTS "idx_user_dapp_published" ON "User_Dapp"("isPublished");
