-- Seed Contract Templates for MNEE DeFi Contracts Library
-- Migration: 0013_seed-contract-templates.sql

-- MNEE Staking Contract Template
INSERT INTO "Contract_Template" ("id", "name", "description", "category", "soliditySourceCode", "constructorParamsSchema")
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'MNEE Staking',
  'Stake MNEE tokens to earn rewards over time. Users can deposit MNEE tokens and receive staking rewards based on the configured APY rate.',
  'staking',
  '// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MNEEStaking
 * @dev Stake MNEE tokens to earn rewards
 */
contract MNEEStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable mneeToken;
    uint256 public rewardRate; // Rewards per second per token staked (scaled by 1e18)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    mapping(address => uint256) public userStakedBalance;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    constructor(address _mneeToken, uint256 _rewardRate) Ownable(msg.sender) {
        mneeToken = IERC20(_mneeToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18 / totalStaked);
    }

    function earned(address account) public view returns (uint256) {
        return (userStakedBalance[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18) + rewards[account];
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalStaked += amount;
        userStakedBalance[msg.sender] += amount;
        mneeToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(userStakedBalance[msg.sender] >= amount, "Insufficient balance");
        totalStaked -= amount;
        userStakedBalance[msg.sender] -= amount;
        mneeToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            mneeToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _rewardRate;
        emit RewardRateUpdated(_rewardRate);
    }

    function depositRewards(uint256 amount) external onlyOwner {
        mneeToken.safeTransferFrom(msg.sender, address(this), amount);
    }
}',
  '[
    {"name": "_mneeToken", "type": "address", "description": "Address of the MNEE token contract", "required": true},
    {"name": "_rewardRate", "type": "uint256", "description": "Initial reward rate per second (scaled by 1e18)", "defaultValue": "1000000000000000", "required": true}
  ]'::json
);


-- MNEE DAO Voting Contract Template
INSERT INTO "Contract_Template" ("id", "name", "description", "category", "soliditySourceCode", "constructorParamsSchema")
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'MNEE DAO Voting',
  'Governance contract that allows MNEE token holders to create and vote on proposals. Voting power is proportional to MNEE token holdings.',
  'dao-voting',
  '// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MNEEGovernance
 * @dev DAO voting contract using MNEE tokens for governance
 */
contract MNEEGovernance is Ownable {
    IERC20 public immutable mneeToken;
    
    uint256 public proposalCount;
    uint256 public votingPeriod;
    uint256 public quorumPercentage; // Percentage scaled by 100 (e.g., 400 = 4%)

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _mneeToken, uint256 _votingPeriod, uint256 _quorumPercentage) Ownable(msg.sender) {
        mneeToken = IERC20(_mneeToken);
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
    }

    function createProposal(string calldata description) external returns (uint256) {
        require(mneeToken.balanceOf(msg.sender) > 0, "Must hold MNEE to propose");
        
        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.id = proposalCount;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;

        emit ProposalCreated(proposalCount, msg.sender, description);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = mneeToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;
        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalSupply = mneeToken.totalSupply();
        require(totalVotes * 10000 / totalSupply >= quorumPercentage, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.proposer, p.description, p.forVotes, p.againstVotes, p.startTime, p.endTime, p.executed);
    }

    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        votingPeriod = _votingPeriod;
    }

    function setQuorumPercentage(uint256 _quorumPercentage) external onlyOwner {
        quorumPercentage = _quorumPercentage;
    }
}',
  '[
    {"name": "_mneeToken", "type": "address", "description": "Address of the MNEE token contract", "required": true},
    {"name": "_votingPeriod", "type": "uint256", "description": "Duration of voting period in seconds", "defaultValue": "259200", "required": true},
    {"name": "_quorumPercentage", "type": "uint256", "description": "Minimum participation percentage (scaled by 100, e.g., 400 = 4%)", "defaultValue": "400", "required": true}
  ]'::json
);


-- MNEE Payment Receipt Contract Template
INSERT INTO "Contract_Template" ("id", "name", "description", "category", "soliditySourceCode", "constructorParamsSchema")
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'MNEE Payment Receipt',
  'Accept MNEE token payments for services and generate on-chain receipts. Merchants can receive payments and customers get verifiable proof of payment.',
  'payment',
  '// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MNEEPayment
 * @dev Accept MNEE payments and issue on-chain receipts
 */
contract MNEEPayment is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable mneeToken;
    string public merchantName;
    uint256 public receiptCount;

    struct Receipt {
        uint256 id;
        address payer;
        uint256 amount;
        string description;
        uint256 timestamp;
        bytes32 referenceId;
    }

    mapping(uint256 => Receipt) public receipts;
    mapping(address => uint256[]) public payerReceipts;

    event PaymentReceived(
        uint256 indexed receiptId,
        address indexed payer,
        uint256 amount,
        string description,
        bytes32 referenceId
    );
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address _mneeToken, string memory _merchantName) Ownable(msg.sender) {
        mneeToken = IERC20(_mneeToken);
        merchantName = _merchantName;
    }

    function pay(uint256 amount, string calldata description, bytes32 referenceId) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        
        mneeToken.safeTransferFrom(msg.sender, address(this), amount);
        
        receiptCount++;
        receipts[receiptCount] = Receipt({
            id: receiptCount,
            payer: msg.sender,
            amount: amount,
            description: description,
            timestamp: block.timestamp,
            referenceId: referenceId
        });
        
        payerReceipts[msg.sender].push(receiptCount);

        emit PaymentReceived(receiptCount, msg.sender, amount, description, referenceId);
        return receiptCount;
    }

    function getReceipt(uint256 receiptId) external view returns (
        address payer,
        uint256 amount,
        string memory description,
        uint256 timestamp,
        bytes32 referenceId
    ) {
        Receipt storage r = receipts[receiptId];
        require(r.id != 0, "Receipt does not exist");
        return (r.payer, r.amount, r.description, r.timestamp, r.referenceId);
    }

    function getPayerReceiptCount(address payer) external view returns (uint256) {
        return payerReceipts[payer].length;
    }

    function getPayerReceiptIds(address payer) external view returns (uint256[] memory) {
        return payerReceipts[payer];
    }

    function verifyPayment(bytes32 referenceId, address payer, uint256 minAmount) external view returns (bool, uint256) {
        uint256[] memory ids = payerReceipts[payer];
        for (uint256 i = 0; i < ids.length; i++) {
            Receipt storage r = receipts[ids[i]];
            if (r.referenceId == referenceId && r.amount >= minAmount) {
                return (true, r.id);
            }
        }
        return (false, 0);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= mneeToken.balanceOf(address(this)), "Insufficient balance");
        mneeToken.safeTransfer(msg.sender, amount);
        emit FundsWithdrawn(msg.sender, amount);
    }

    function withdrawAll() external onlyOwner nonReentrant {
        uint256 balance = mneeToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        mneeToken.safeTransfer(msg.sender, balance);
        emit FundsWithdrawn(msg.sender, balance);
    }

    function setMerchantName(string calldata _merchantName) external onlyOwner {
        merchantName = _merchantName;
    }

    function getContractBalance() external view returns (uint256) {
        return mneeToken.balanceOf(address(this));
    }
}',
  '[
    {"name": "_mneeToken", "type": "address", "description": "Address of the MNEE token contract", "required": true},
    {"name": "_merchantName", "type": "string", "description": "Name of the merchant or business", "defaultValue": "My Business", "required": true}
  ]'::json
);
