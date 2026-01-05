-- Seed DApp Templates for DApps Builder
-- Migration: 0015_seed-dapp-templates.sql

-- MNEE Staking DApp Template
INSERT INTO "Dapp_Template" ("id", "name", "description", "category", "defaultConfig")
VALUES (
  'd1a2b3c4-e5f6-7890-abcd-111111111111',
  'MNEE Staking DApp',
  'A complete staking interface for MNEE tokens. Users can stake tokens, view their staked balance, track earned rewards, and withdraw their stake.',
  'staking',
  '{
    "templateType": "staking",
    "theme": {
      "primaryColor": "#3b82f6",
      "accentColor": "#10b981",
      "backgroundColor": "#ffffff",
      "textColor": "#1f2937",
      "cardStyle": "default"
    },
    "branding": {
      "title": "MNEE Staking",
      "subtitle": "Stake your MNEE tokens to earn rewards"
    },
    "sections": {
      "stakeForm": { "enabled": true, "title": "Stake MNEE" },
      "stakedBalance": { "enabled": true, "title": "Your Staked Balance" },
      "rewards": { "enabled": true, "title": "Earned Rewards" },
      "withdrawForm": { "enabled": true, "title": "Withdraw" }
    },
    "features": {
      "showContractInfo": true,
      "showNetworkBadge": true,
      "showMneeApproval": true,
      "showWalletBalance": true
    }
  }'::json
);

-- MNEE DAO Voting DApp Template
INSERT INTO "Dapp_Template" ("id", "name", "description", "category", "defaultConfig")
VALUES (
  'd2b3c4d5-f6a7-8901-bcde-222222222222',
  'MNEE DAO Voting DApp',
  'A governance interface for MNEE token holders. Create proposals, vote on active proposals, and track governance statistics.',
  'dao-voting',
  '{
    "templateType": "dao-voting",
    "theme": {
      "primaryColor": "#8b5cf6",
      "accentColor": "#f59e0b",
      "backgroundColor": "#ffffff",
      "textColor": "#1f2937",
      "cardStyle": "default"
    },
    "branding": {
      "title": "MNEE DAO",
      "subtitle": "Participate in governance decisions"
    },
    "sections": {
      "proposalList": { "enabled": true, "title": "Active Proposals" },
      "createProposal": { "enabled": true, "title": "Create Proposal" },
      "votingStats": { "enabled": true, "title": "Governance Stats" }
    },
    "features": {
      "showContractInfo": true,
      "showNetworkBadge": true,
      "showMneeApproval": false,
      "showWalletBalance": true
    }
  }'::json
);

-- MNEE Payment DApp Template
INSERT INTO "Dapp_Template" ("id", "name", "description", "category", "defaultConfig")
VALUES (
  'd3c4d5e6-a7b8-9012-cdef-333333333333',
  'MNEE Payment DApp',
  'A payment interface for accepting MNEE tokens. Customers can make payments, view receipts, and see merchant information.',
  'payment',
  '{
    "templateType": "payment",
    "theme": {
      "primaryColor": "#10b981",
      "accentColor": "#3b82f6",
      "backgroundColor": "#ffffff",
      "textColor": "#1f2937",
      "cardStyle": "default"
    },
    "branding": {
      "title": "MNEE Payments",
      "subtitle": "Pay with MNEE tokens"
    },
    "sections": {
      "paymentForm": { "enabled": true, "title": "Make Payment" },
      "receiptHistory": { "enabled": true, "title": "Your Receipts" },
      "merchantInfo": { "enabled": true, "title": "Merchant Info" }
    },
    "features": {
      "showContractInfo": true,
      "showNetworkBadge": true,
      "showMneeApproval": true,
      "showWalletBalance": true
    }
  }'::json
);
