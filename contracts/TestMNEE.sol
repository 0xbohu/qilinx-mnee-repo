// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestMNEE
 * @dev A test ERC20 token mimicking the MNEE USD Stablecoin for Sepolia testnet.
 * This is for testing purposes only and has no real value.
 * 
 * Mainnet MNEE: 0x8ccedbae4916b79da7f3f612efb2eb93a2bfd6cf
 * 
 * Features:
 * - Same decimals as mainnet MNEE (2 decimals for cent precision)
 * - Owner can mint additional tokens for testing
 * - Owner can burn tokens
 */
contract TestMNEE is ERC20, Ownable {
    uint8 private constant TOKEN_DECIMALS = 2;

    constructor(uint256 initialSupply) ERC20("MNEE USD Stablecoin", "MNEE") Ownable(msg.sender) {
        // Mint initial supply to deployer
        // Example: 1_000_000_00 = 1,000,000 MNEE (with 2 decimals)
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Returns the number of decimals used for token amounts.
     * MNEE uses 2 decimals (like cents in USD).
     */
    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    /**
     * @dev Mint new tokens. Only owner can call this.
     * @param to Address to receive the minted tokens
     * @param amount Amount to mint (remember: 2 decimals, so 100 = 1.00 MNEE)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance.
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance).
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
}
