import crypto from 'crypto';
import { PrivateKey, Utils } from '@bsv/sdk';

export interface GeneratedWallet {
  address: string;
  privateKeyWif: string;
  privateKeyHex: string;
}

/**
 * Generates BSV wallets for MNEE agents
 * Replicates the wallet creation logic from MNEE CLI
 */
export class WalletGenerator {
  /**
   * Generates a new BSV wallet with cryptographically secure random bytes
   * @returns Generated wallet with address and private keys
   */
  static generate(): GeneratedWallet {
    // Generate 32 bytes of cryptographically secure random entropy
    const entropy = crypto.randomBytes(32);
    
    // Create private key from entropy
    const privateKey = PrivateKey.fromString(entropy.toString('hex'));
    
    // Derive address from private key
    const address = privateKey.toAddress();
    
    // Get WIF format for transfers
    const privateKeyWif = privateKey.toWif();
    
    // Get hex format for storage
    const privateKeyHex = privateKey.toString();
    
    return {
      address,
      privateKeyWif,
      privateKeyHex,
    };
  }

  /**
   * Validates a BSV address format
   * BSV mainnet addresses start with '1' (P2PKH)
   * @param address The address to validate
   * @returns True if valid BSV address
   */
  static validateAddress(address: string): boolean {
    if (!address || address.trim() === '') {
      return false;
    }

    const trimmedAddress = address.trim();

    // BSV mainnet addresses start with '1' (P2PKH)
    if (!trimmedAddress.startsWith('1')) {
      return false;
    }

    try {
      // Use @bsv/sdk's fromBase58Check to validate the address format and checksum
      Utils.fromBase58Check(trimmedAddress);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts a hex private key to WIF format
   * @param privateKeyHex The private key in hex format
   * @returns The private key in WIF format
   */
  static hexToWif(privateKeyHex: string): string {
    const privateKey = PrivateKey.fromString(privateKeyHex);
    return privateKey.toWif();
  }

  /**
   * Derives address from a private key hex
   * @param privateKeyHex The private key in hex format
   * @returns The derived BSV address
   */
  static deriveAddress(privateKeyHex: string): string {
    const privateKey = PrivateKey.fromString(privateKeyHex);
    return privateKey.toAddress();
  }
}
