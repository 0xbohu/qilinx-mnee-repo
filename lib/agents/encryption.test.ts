import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';

// Set up test encryption key before importing the module
beforeAll(() => {
  // 64 hex characters = 32 bytes for AES-256
  process.env.AGENT_KEYSTORE_SECRET = 'a'.repeat(64);
});

// Dynamic import to ensure env is set first
const getEncryption = async () => import('./encryption');

/**
 * Feature: account-dashboard, Property 1: Encryption Round-Trip
 * For any valid private key string, encrypting it with encryptPrivateKey
 * and then decrypting with decryptPrivateKey SHALL produce the original private key.
 * Validates: Requirements 3.2
 */
describe('Property 1: Encryption Round-Trip', () => {
  it('should return original value after encrypt then decrypt', async () => {
    const { encryptPrivateKey, decryptPrivateKey } = await getEncryption();
    
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (privateKey) => {
        const encrypted = encryptPrivateKey(privateKey);
        const decrypted = decryptPrivateKey(encrypted);
        return decrypted === privateKey;
      }),
      { numRuns: 100 }
    );
  });

  it('should handle hex strings (typical private keys)', async () => {
    const { encryptPrivateKey, decryptPrivateKey } = await getEncryption();
    
    // Generate hex strings using stringMatching with hex pattern
    const hexArb = fc.stringMatching(/^[0-9a-f]{64}$/);
    
    fc.assert(
      fc.property(hexArb, (privateKey) => {
        const encrypted = encryptPrivateKey(privateKey);
        const decrypted = decryptPrivateKey(encrypted);
        return decrypted === privateKey;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: account-dashboard, Property 7: Encryption Produces Unique IVs
 * For any two encryptions of the same private key, the resulting encrypted
 * strings SHALL have different IV prefixes (the part before the colon).
 * Validates: Requirements 7.2
 */
describe('Property 7: Encryption Produces Unique IVs', () => {
  it('should produce different IVs for same input', async () => {
    const { encryptPrivateKey } = await getEncryption();
    
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (privateKey) => {
        const encrypted1 = encryptPrivateKey(privateKey);
        const encrypted2 = encryptPrivateKey(privateKey);
        
        const iv1 = encrypted1.split(':')[0];
        const iv2 = encrypted2.split(':')[0];
        
        // IVs should be different (random)
        return iv1 !== iv2;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: account-dashboard, Property 8: Encrypted Format Validation
 * For any output from encryptPrivateKey, the string SHALL match the pattern
 * {32_hex_chars}:{hex_string} (IV:encrypted data).
 * Validates: Requirements 7.3
 */
describe('Property 8: Encrypted Format Validation', () => {
  it('should produce output in iv:encryptedData format', async () => {
    const { encryptPrivateKey } = await getEncryption();
    
    // Pattern: 32 hex chars (16 bytes IV) : hex string
    const formatPattern = /^[0-9a-f]{32}:[0-9a-f]+$/;
    
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (privateKey) => {
        const encrypted = encryptPrivateKey(privateKey);
        return formatPattern.test(encrypted);
      }),
      { numRuns: 100 }
    );
  });

  it('should have exactly one colon separator', async () => {
    const { encryptPrivateKey } = await getEncryption();
    
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (privateKey) => {
        const encrypted = encryptPrivateKey(privateKey);
        const parts = encrypted.split(':');
        return parts.length === 2;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: account-dashboard, Property 9: Decryption Rejects Malformed Input
 * For any string that does not match the iv:encryptedData format,
 * decryptPrivateKey SHALL throw an error.
 * Validates: Requirements 7.4
 */
describe('Property 9: Decryption Rejects Malformed Input', () => {
  it('should throw error for strings without colon', async () => {
    const { decryptPrivateKey } = await getEncryption();
    
    // Generate strings without colons
    const noColonArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes(':'));
    
    fc.assert(
      fc.property(noColonArb, (malformed) => {
        try {
          decryptPrivateKey(malformed);
          return false; // Should have thrown
        } catch (e) {
          return (e as Error).message === 'Invalid encrypted key format';
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should throw error for strings with multiple colons', async () => {
    const { decryptPrivateKey } = await getEncryption();
    
    // Generate strings with multiple colons
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (a, b, c) => {
          const malformed = `${a}:${b}:${c}`;
          try {
            decryptPrivateKey(malformed);
            return false; // Should have thrown
          } catch (e) {
            return (e as Error).message === 'Invalid encrypted key format';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw error for empty string', async () => {
    const { decryptPrivateKey } = await getEncryption();
    
    expect(() => decryptPrivateKey('')).toThrow('Invalid encrypted key format');
  });
});
