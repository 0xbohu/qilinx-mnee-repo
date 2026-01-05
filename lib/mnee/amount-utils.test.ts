import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatMneeAmount,
  formatMneeWithSymbol,
  hasSufficientBalance,
  toAtomicAmount,
  fromAtomicAmount,
} from './amount-utils';

/**
 * Feature: account-dashboard, Property 4: Balance Formatting
 * For any numeric balance value, formatMneeWithSymbol SHALL return a string
 * with exactly 5 decimal places followed by " MNEE".
 * Validates: Requirements 5.2
 */
describe('Property 4: Balance Formatting', () => {
  it('should format with exactly 5 decimal places and MNEE suffix', () => {
    // Pattern: digits, dot, exactly 5 digits, space, MNEE
    const formatPattern = /^-?\d+\.\d{5} MNEE$/;
    
    fc.assert(
      fc.property(fc.double({ min: -1000000, max: 1000000, noNaN: true }), (amount) => {
        const formatted = formatMneeWithSymbol(amount);
        return formatPattern.test(formatted);
      }),
      { numRuns: 100 }
    );
  });

  it('should format positive numbers correctly', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000000, noNaN: true }), (amount) => {
        const formatted = formatMneeWithSymbol(amount);
        return formatted.endsWith(' MNEE') && formatted.includes('.');
      }),
      { numRuns: 100 }
    );
  });

  it('should format zero as 0.00000 MNEE', () => {
    expect(formatMneeWithSymbol(0)).toBe('0.00000 MNEE');
  });

  it('formatMneeAmount should return exactly 5 decimal places', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000000, noNaN: true }), (amount) => {
        const formatted = formatMneeAmount(amount);
        const parts = formatted.split('.');
        return parts.length === 2 && parts[1].length === 5;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: account-dashboard, Property 6: Sufficient Balance Check
 * For any balance, transfer amount, and fee, hasSufficientBalance(balance, amount, fee)
 * SHALL return true if and only if balance >= amount + fee.
 * Validates: Requirements 6.4
 */
describe('Property 6: Sufficient Balance Check', () => {
  it('should return true when balance >= amount + fee', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance, amount, fee) => {
          const result = hasSufficientBalance(balance, amount, fee);
          const expected = balance >= (amount + fee);
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return true when balance equals amount + fee exactly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (amount, fee) => {
          const balance = amount + fee;
          return hasSufficientBalance(balance, amount, fee) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false when balance is less than amount + fee', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (amount, fee) => {
          const balance = amount + fee - 0.00001; // Slightly less
          return hasSufficientBalance(balance, amount, fee) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should default fee to 0 when not provided', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        (balance, amount) => {
          const result = hasSufficientBalance(balance, amount);
          const expected = balance >= amount;
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Additional unit tests for atomic conversion
describe('Atomic Amount Conversion', () => {
  it('should convert to atomic and back correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }),
        (atomicAmount) => {
          const mnee = fromAtomicAmount(atomicAmount);
          const backToAtomic = toAtomicAmount(mnee);
          return backToAtomic === atomicAmount;
        }
      ),
      { numRuns: 100 }
    );
  });
});
