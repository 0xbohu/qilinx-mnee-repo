import Mnee, { type SendMNEE, type TransferStatus, type TxHistory } from '@mnee/ts-sdk';
import { WalletGenerator } from './wallet-generator';
import { hasSufficientBalance, fromAtomicAmount } from './amount-utils';

export interface TransferRequest {
  recipients: Array<{ address: string; amount: number }>;
  webhookUrl?: string;
}

export interface TransferResult {
  ticketId?: string;
  rawtx?: string;
  status: 'broadcasting' | 'success' | 'failed';
}

export interface MneeBalance {
  address: string;
  amount: number;        // Atomic units
  decimalAmount: number; // MNEE (5 decimals)
}

type MneeEnvironment = 'sandbox' | 'production';

export class TransferService {
  private mnee: Mnee;
  private environment: MneeEnvironment;

  constructor(environment: MneeEnvironment = 'sandbox', apiKey?: string) {
    this.environment = environment;
    this.mnee = new Mnee({ environment, apiKey });
  }

  /**
   * Executes a transfer from an agent wallet
   */
  async transfer(
    privateKeyWif: string,
    request: TransferRequest
  ): Promise<TransferResult> {
    // Validate all recipient addresses
    for (const recipient of request.recipients) {
      if (!WalletGenerator.validateAddress(recipient.address)) {
        throw new Error(`Invalid recipient address: ${recipient.address}`);
      }
    }

    const recipients: SendMNEE[] = request.recipients.map(r => ({
      address: r.address,
      amount: r.amount,
    }));

    try {
      const response = await this.mnee.transfer(
        recipients,
        privateKeyWif,
        {
          broadcast: true,
          callbackUrl: request.webhookUrl,
        }
      );

      if (response.ticketId) {
        return {
          ticketId: response.ticketId,
          status: 'broadcasting',
        };
      }

      if (response.rawtx) {
        return {
          rawtx: response.rawtx,
          status: 'success',
        };
      }

      throw new Error('No ticket ID or raw transaction returned');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Insufficient')) {
          throw new Error('Insufficient MNEE balance for transfer');
        }
        throw error;
      }
      throw new Error('Transfer failed');
    }
  }

  /**
   * Gets the status of a transaction by ticket ID
   */
  async getTransactionStatus(ticketId: string): Promise<TransferStatus> {
    return await this.mnee.getTxStatus(ticketId);
  }

  /**
   * Polls for transaction status until it's no longer broadcasting
   */
  async pollTransactionStatus(
    ticketId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<TransferStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getTransactionStatus(ticketId);

      if (status.status !== 'BROADCASTING') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error('Transaction status polling timed out');
  }

  /**
   * Gets the balance for an address
   */
  async getBalance(address: string): Promise<MneeBalance> {
    const balance = await this.mnee.balance(address);
    return {
      address: balance.address,
      amount: balance.amount,
      decimalAmount: balance.decimalAmount,
    };
  }

  /**
   * Gets transaction history for an address
   */
  async getTransactionHistory(
    address: string,
    limit: number = 50
  ): Promise<TxHistory[]> {
    const { history } = await this.mnee.recentTxHistory(address, undefined, limit);
    return history;
  }

  /**
   * Validates if a transfer can be executed
   */
  async validateTransfer(
    senderAddress: string,
    recipients: Array<{ address: string; amount: number }>
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate recipient addresses
    for (const recipient of recipients) {
      if (!WalletGenerator.validateAddress(recipient.address)) {
        return { valid: false, error: `Invalid recipient address: ${recipient.address}` };
      }
    }

    // Calculate total amount
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);

    // Get sender balance
    const balance = await this.getBalance(senderAddress);

    // Check sufficient balance (with small buffer for fees)
    const estimatedFee = 0.001; // Estimate fee
    if (!hasSufficientBalance(balance.decimalAmount, totalAmount, estimatedFee)) {
      return { 
        valid: false, 
        error: `Insufficient balance. Have: ${balance.decimalAmount} MNEE, Need: ${totalAmount + estimatedFee} MNEE` 
      };
    }

    return { valid: true };
  }

  /**
   * Converts atomic units to MNEE
   */
  fromAtomicAmount(atomic: number): number {
    return fromAtomicAmount(atomic);
  }
}

// Factory function to create transfer service
export function createTransferService(
  environment: MneeEnvironment = 'sandbox',
  apiKey?: string
): TransferService {
  return new TransferService(environment, apiKey);
}
