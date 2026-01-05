// SPDX-License-Identifier: MIT
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
}
