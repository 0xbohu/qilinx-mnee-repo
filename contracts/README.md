# MNEE Smart Contracts

This folder contains the Solidity smart contract templates used by the Qilin | MNEE platform for DeFi applications.

## Contract Templates

### MNEEStaking.sol

Stake MNEE tokens to earn rewards over time.

**Features:**
- Stake MNEE tokens
- Earn rewards based on configurable APY rate
- Withdraw staked tokens
- Claim accumulated rewards
- Owner can adjust reward rate and deposit rewards

**Constructor Parameters:**
- `_mneeToken` (address) - Address of the MNEE token contract
- `_rewardRate` (uint256) - Initial reward rate per second (scaled by 1e18)

### MNEEGovernance.sol

DAO voting contract using MNEE tokens for governance.

**Features:**
- Create governance proposals
- Vote on active proposals (for/against)
- Token-weighted voting power
- Configurable voting period and quorum
- Execute passed proposals

**Constructor Parameters:**
- `_mneeToken` (address) - Address of the MNEE token contract
- `_votingPeriod` (uint256) - Duration of voting period in seconds (default: 259200 = 3 days)
- `_quorumPercentage` (uint256) - Minimum participation percentage (scaled by 100, e.g., 400 = 4%)

### MNEEPayment.sol

Accept MNEE payments and issue on-chain receipts.

**Features:**
- Accept MNEE token payments
- Generate on-chain receipts with reference IDs
- Track payment history per payer
- Verify payments by reference ID
- Merchant can withdraw funds

**Constructor Parameters:**
- `_mneeToken` (address) - Address of the MNEE token contract
- `_merchantName` (string) - Name of the merchant or business

## MNEE Token Addresses

| Network | Address |
|---------|---------|
| Ethereum Mainnet | `0x8ccedbae4916b79da7f3f612efb2eb93a2bfd6cf` |
| Sepolia Testnet | `0x772DDa9B82c99Dd9F4d47ACBe2405F89A1440509` |

## Dependencies

These contracts use OpenZeppelin v5.x:

```
@openzeppelin/contracts/token/ERC20/IERC20.sol
@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol
@openzeppelin/contracts/access/Ownable.sol
@openzeppelin/contracts/utils/ReentrancyGuard.sol
```

## Deployment

These contracts can be deployed through the Qilin platform's **Contracts Builder** feature, which provides:

- AI-assisted customization
- Automatic compilation
- One-click deployment via MetaMask
- Contract tracking and management

## License

MIT License
