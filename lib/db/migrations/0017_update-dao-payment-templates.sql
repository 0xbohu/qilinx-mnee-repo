-- Update MNEE DAO Voting and Payment DApp Templates with improved default configs
-- Migration: 0017_update-dao-payment-templates.sql

-- Update DAO Voting Template
UPDATE "Dapp_Template"
SET "defaultConfig" = '{
  "templateType": "dao-voting",
  "theme": {
    "primaryColor": "#8b5cf6",
    "accentColor": "#f59e0b",
    "backgroundColor": "#fafafa",
    "textColor": "#1f2937",
    "cardStyle": "elevated"
  },
  "branding": {
    "title": "MNEE DAO Governance",
    "subtitle": "Participate in governance decisions with your MNEE tokens"
  },
  "sections": {
    "proposalList": { "enabled": true, "title": "Proposals" },
    "createProposal": { "enabled": true, "title": "New Proposal" },
    "votingStats": { "enabled": true, "title": "Governance Stats" }
  },
  "features": {
    "showContractInfo": true,
    "showNetworkBadge": true,
    "showMneeApproval": false,
    "showWalletBalance": true
  }
}'::json
WHERE "id" = 'd2b3c4d5-f6a7-8901-bcde-222222222222';

-- Update Payment Template
UPDATE "Dapp_Template"
SET "defaultConfig" = '{
  "templateType": "payment",
  "theme": {
    "primaryColor": "#10b981",
    "accentColor": "#3b82f6",
    "backgroundColor": "#fafafa",
    "textColor": "#1f2937",
    "cardStyle": "elevated"
  },
  "branding": {
    "title": "MNEE Payments",
    "subtitle": "Fast and secure payments with MNEE tokens"
  },
  "sections": {
    "paymentForm": { "enabled": true, "title": "Make Payment" },
    "receiptHistory": { "enabled": true, "title": "Payment History" },
    "merchantInfo": { "enabled": true, "title": "Merchant" }
  },
  "features": {
    "showContractInfo": true,
    "showNetworkBadge": true,
    "showMneeApproval": true,
    "showWalletBalance": true
  }
}'::json
WHERE "id" = 'd3c4d5e6-a7b8-9012-cdef-333333333333';
