-- Update MNEE Staking DApp Template with improved default config
-- Migration: 0016_update-staking-template.sql

UPDATE "Dapp_Template"
SET "defaultConfig" = '{
  "templateType": "staking",
  "theme": {
    "primaryColor": "#6366f1",
    "accentColor": "#22c55e",
    "backgroundColor": "#fafafa",
    "textColor": "#1f2937",
    "cardStyle": "elevated"
  },
  "branding": {
    "title": "MNEE Staking Pool",
    "subtitle": "Stake your MNEE tokens and earn rewards"
  },
  "sections": {
    "stakeForm": { "enabled": true, "title": "Stake MNEE" },
    "stakedBalance": { "enabled": true, "title": "Your Staked Balance" },
    "rewards": { "enabled": true, "title": "Claimable Rewards" },
    "withdrawForm": { "enabled": true, "title": "Withdraw" }
  },
  "features": {
    "showContractInfo": true,
    "showNetworkBadge": true,
    "showMneeApproval": true,
    "showWalletBalance": true
  }
}'::json
WHERE "id" = 'd1a2b3c4-e5f6-7890-abcd-111111111111';
