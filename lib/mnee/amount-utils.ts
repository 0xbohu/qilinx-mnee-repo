/**
 * MNEE Amount Utilities
 * 
 * MNEE uses 5 decimal precision:
 * 1 MNEE = 100,000 atomic units
 */

const ATOMIC_UNITS_PER_MNEE = 100000;
const MNEE_DECIMALS = 5;

/**
 * Converts MNEE amount to atomic units
 * @param mneeAmount Amount in MNEE (decimal)
 * @returns Amount in atomic units (integer)
 */
export function toAtomicAmount(mneeAmount: number): number {
  return Math.round(mneeAmount * ATOMIC_UNITS_PER_MNEE);
}

/**
 * Converts atomic units to MNEE amount
 * @param atomicAmount Amount in atomic units (integer)
 * @returns Amount in MNEE (decimal)
 */
export function fromAtomicAmount(atomicAmount: number): number {
  return atomicAmount / ATOMIC_UNITS_PER_MNEE;
}

/**
 * Formats MNEE amount for display with 5 decimal precision
 * @param mneeAmount Amount in MNEE (decimal)
 * @returns Formatted string with exactly 5 decimal places
 */
export function formatMneeAmount(mneeAmount: number): string {
  return mneeAmount.toFixed(MNEE_DECIMALS);
}

/**
 * Formats MNEE amount with symbol for display
 * @param mneeAmount Amount in MNEE (decimal)
 * @returns Formatted string like "10.50000 MNEE"
 */
export function formatMneeWithSymbol(mneeAmount: number): string {
  return `${formatMneeAmount(mneeAmount)} MNEE`;
}

/**
 * Parses a string amount to MNEE number
 * @param amountStr String representation of amount
 * @returns Parsed MNEE amount or null if invalid
 */
export function parseMneeAmount(amountStr: string): number | null {
  const trimmed = amountStr.trim();
  if (!trimmed) return null;

  const validNumberRegex = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  if (!validNumberRegex.test(trimmed)) {
    return null;
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 0) {
    return null;
  }

  return num;
}

/**
 * Validates if an amount is valid for transfer
 * @param amount Amount in MNEE
 * @returns True if valid transfer amount
 */
export function isValidTransferAmount(amount: number): boolean {
  // Must be positive
  if (amount <= 0) return false;
  
  // Minimum transfer is 0.00001 MNEE (1 atomic unit)
  if (amount < 0.00001) return false;
  
  return true;
}

/**
 * Checks if balance is sufficient for transfer including fees
 * @param balance Current balance in MNEE
 * @param transferAmount Amount to transfer in MNEE
 * @param fee Fee amount in MNEE (default 0)
 * @returns True if balance is sufficient
 */
export function hasSufficientBalance(
  balance: number,
  transferAmount: number,
  fee: number = 0
): boolean {
  return balance >= (transferAmount + fee);
}
