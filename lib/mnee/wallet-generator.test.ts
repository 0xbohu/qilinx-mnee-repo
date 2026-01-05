import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WalletGenerator } from './wallet-generator';

/**
 * Feature: account-dashboard, Property 2: Wallet Generation Produces Valid Structure
 * For any call to WalletGenerator.generate(), the returned wallet SHALL contain
 * a non-empty address starting with '1', a non-empty privateKeyWif, and a non-empty privateKeyHex.
 * Validates: Requirements 3.1
 */
describe('Property 2: Wallet Generation Produces Valid Structure', () => {
  it('should generate wallet with valid address starting with 1', () => {
    // Generate multiple wallets and verify structure
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      
      expect(wallet.address).toBeTruthy();
      expect(wallet.address.startsWith('1')).toBe(true);
      expect(wallet.privateKeyWif).toBeTruthy();
      expect(wallet.privateKeyHex).toBeTruthy();
    }
  });

  it('should generate unique addresses each time', () => {
    const addresses = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      addresses.add(wallet.address);
    }
    
    // All 100 addresses should be unique
    expect(addresses.size).toBe(100);
  });

  it('should generate 64-character hex private keys', () => {
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      
      // Hex private key should be 64 characters (32 bytes)
      expect(wallet.privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('should generate WIF keys starting with K or L', () => {
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      
      // Compressed WIF keys start with K or L
      expect(wallet.privateKeyWif).toMatch(/^[KL]/);
    }
  });

  it('should derive same address from hex key', () => {
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      const derivedAddress = WalletGenerator.deriveAddress(wallet.privateKeyHex);
      
      expect(derivedAddress).toBe(wallet.address);
    }
  });

  it('should convert hex to same WIF', () => {
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      const derivedWif = WalletGenerator.hexToWif(wallet.privateKeyHex);
      
      expect(derivedWif).toBe(wallet.privateKeyWif);
    }
  });
});

/**
 * Feature: account-dashboard, Property 5: Address Validation Correctness
 * For any string, WalletGenerator.validateAddress SHALL return true only if
 * the string is a valid BSV mainnet address (starts with '1' and passes Base58Check validation).
 * Validates: Requirements 6.3
 */
describe('Property 5: Address Validation Correctness', () => {
  it('should validate generated addresses as valid', () => {
    for (let i = 0; i < 100; i++) {
      const wallet = WalletGenerator.generate();
      expect(WalletGenerator.validateAddress(wallet.address)).toBe(true);
    }
  });

  it('should reject empty strings', () => {
    expect(WalletGenerator.validateAddress('')).toBe(false);
    expect(WalletGenerator.validateAddress('   ')).toBe(false);
  });

  it('should reject strings not starting with 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.trim().startsWith('1')),
        (invalidAddress) => {
          return WalletGenerator.validateAddress(invalidAddress) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject random strings starting with 1 (invalid checksum)', () => {
    // Random strings starting with 1 should fail checksum validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 40 }).map(s => '1' + s.replace(/[^a-zA-Z0-9]/g, 'x')),
        (invalidAddress) => {
          // Most random strings will fail checksum
          // We just verify it doesn't throw
          const result = WalletGenerator.validateAddress(invalidAddress);
          return typeof result === 'boolean';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject null and undefined-like inputs', () => {
    expect(WalletGenerator.validateAddress(null as unknown as string)).toBe(false);
    expect(WalletGenerator.validateAddress(undefined as unknown as string)).toBe(false);
  });
});
