import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, type User } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptPrivateKey, decryptPrivateKey } from '@/lib/agents/encryption';
import { WalletGenerator } from './wallet-generator';
import { createTransferService } from './transfer-service';
import { formatMneeAmount } from './amount-utils';
import type { WalletConfig, MneeWallet } from '@/lib/db/wallet-types';
import { getMneeWallet, getMneeProductionWallet, createEmptyWalletConfig, canRequestFaucet, getTimeUntilFaucet } from '@/lib/db/wallet-types';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface UserWalletInfo {
  address: string;
  balance: string;
  canRequestFaucet: boolean;
  timeUntilFaucet: string | null;
}

export interface UserWalletWithKey {
  address: string;
  privateKeyWif: string;
}

export class UserWalletService {
  /**
   * Creates a new MNEE sandbox wallet for a user
   */
  async createWallet(userId: string): Promise<{ address: string }> {
    // Check if user already has a wallet
    const existingUser = await this.getUser(userId);
    const existingWallet = getMneeWallet(existingUser?.walletConfig || null);
    
    if (existingWallet) {
      throw new Error('User already has an MNEE sandbox wallet');
    }

    // Generate new BSV wallet
    const wallet = WalletGenerator.generate();
    
    // Encrypt the private key for storage
    const encryptedKey = encryptPrivateKey(wallet.privateKeyHex);

    // Create wallet config
    const walletConfig: WalletConfig = existingUser?.walletConfig || createEmptyWalletConfig();
    
    const mneeWallet: MneeWallet = {
      type: 'mnee',
      network: 'sandbox',
      address: wallet.address,
      encryptedPrivateKey: encryptedKey,
      createdAt: new Date().toISOString(),
    };
    
    walletConfig.wallets.mnee = mneeWallet;
    walletConfig.defaultWallet = 'mnee';

    await db
      .update(user)
      .set({ walletConfig })
      .where(eq(user.id, userId));

    return { address: wallet.address };
  }

  /**
   * Creates a new MNEE production wallet for a user
   */
  async createProductionWallet(userId: string): Promise<{ address: string }> {
    // Check if user already has a production wallet
    const existingUser = await this.getUser(userId);
    const existingWallet = getMneeProductionWallet(existingUser?.walletConfig || null);
    
    if (existingWallet) {
      throw new Error('User already has an MNEE production wallet');
    }

    // Generate new BSV wallet
    const wallet = WalletGenerator.generate();
    
    // Encrypt the private key for storage
    const encryptedKey = encryptPrivateKey(wallet.privateKeyHex);

    // Create wallet config
    const walletConfig: WalletConfig = existingUser?.walletConfig || createEmptyWalletConfig();
    
    const mneeWallet: MneeWallet = {
      type: 'mnee',
      network: 'mainnet',
      address: wallet.address,
      encryptedPrivateKey: encryptedKey,
      createdAt: new Date().toISOString(),
    };
    
    walletConfig.wallets.mneeProduction = mneeWallet;

    await db
      .update(user)
      .set({ walletConfig })
      .where(eq(user.id, userId));

    return { address: wallet.address };
  }

  /**
   * Gets user wallet info
   */
  async getWalletInfo(userId: string): Promise<UserWalletInfo | null> {
    const foundUser = await this.getUser(userId);
    const mneeWallet = getMneeWallet(foundUser?.walletConfig || null);
    
    if (!mneeWallet) {
      return null;
    }

    // Get balance from MNEE API
    let balance = '0.00000';
    try {
      const transferService = createTransferService('sandbox');
      const balanceInfo = await transferService.getBalance(mneeWallet.address);
      balance = formatMneeAmount(balanceInfo.decimalAmount);
    } catch (e) {
      console.error('Failed to fetch user wallet balance:', e);
    }

    return {
      address: mneeWallet.address,
      balance,
      canRequestFaucet: canRequestFaucet(foundUser?.walletConfig || null),
      timeUntilFaucet: getTimeUntilFaucet(foundUser?.walletConfig || null),
    };
  }

  /**
   * Gets user production wallet info
   */
  async getProductionWalletInfo(userId: string): Promise<Omit<UserWalletInfo, 'canRequestFaucet' | 'timeUntilFaucet'> | null> {
    const foundUser = await this.getUser(userId);
    const mneeWallet = getMneeProductionWallet(foundUser?.walletConfig || null);
    
    if (!mneeWallet) {
      return null;
    }

    // Get balance from MNEE API (mainnet)
    let balance = '0.00000';
    try {
      const transferService = createTransferService('production');
      const balanceInfo = await transferService.getBalance(mneeWallet.address);
      balance = formatMneeAmount(balanceInfo.decimalAmount);
    } catch (e) {
      console.error('Failed to fetch user production wallet balance:', e);
    }

    return {
      address: mneeWallet.address,
      balance,
    };
  }

  /**
   * Gets user wallet with decrypted private key
   */
  async getWalletWithKey(userId: string): Promise<UserWalletWithKey | null> {
    const foundUser = await this.getUser(userId);
    const mneeWallet = getMneeWallet(foundUser?.walletConfig || null);
    
    if (!mneeWallet) {
      return null;
    }

    const decryptedKey = decryptPrivateKey(mneeWallet.encryptedPrivateKey);
    const privateKeyWif = WalletGenerator.hexToWif(decryptedKey);

    return {
      address: mneeWallet.address,
      privateKeyWif,
    };
  }

  /**
   * Transfers MNEE from user wallet to an address
   */
  async transferFromWallet(
    userId: string,
    recipientAddress: string,
    amount: number
  ): Promise<{ ticketId?: string; error?: string }> {
    const wallet = await this.getWalletWithKey(userId);
    
    if (!wallet) {
      return { error: 'User wallet not found' };
    }

    const transferService = createTransferService('sandbox');

    // Validate transfer
    const validation = await transferService.validateTransfer(
      wallet.address,
      [{ address: recipientAddress, amount }]
    );

    if (!validation.valid) {
      return { error: validation.error };
    }

    try {
      const result = await transferService.transfer(wallet.privateKeyWif, {
        recipients: [{ address: recipientAddress, amount }],
      });

      return { ticketId: result.ticketId };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Transfer failed' };
    }
  }

  /**
   * Checks if user has a wallet
   */
  async hasWallet(userId: string): Promise<boolean> {
    const foundUser = await this.getUser(userId);
    return !!getMneeWallet(foundUser?.walletConfig || null);
  }

  /**
   * Records faucet request timestamp
   */
  async recordFaucetRequest(userId: string): Promise<void> {
    const foundUser = await this.getUser(userId);
    if (!foundUser?.walletConfig?.wallets.mnee) return;

    const walletConfig = { ...foundUser.walletConfig };
    const existingMnee = walletConfig.wallets.mnee;
    if (existingMnee) {
      walletConfig.wallets.mnee = {
        ...existingMnee,
        lastFaucetRequest: new Date().toISOString(),
      };
    }

    await db
      .update(user)
      .set({ walletConfig })
      .where(eq(user.id, userId));
  }

  /**
   * Checks if user can request faucet
   */
  async canRequestFaucet(userId: string): Promise<{ canRequest: boolean; timeUntil: string | null }> {
    const foundUser = await this.getUser(userId);
    return {
      canRequest: canRequestFaucet(foundUser?.walletConfig || null),
      timeUntil: getTimeUntilFaucet(foundUser?.walletConfig || null),
    };
  }

  private async getUser(userId: string): Promise<User | null> {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return foundUser || null;
  }
}

// Export singleton instance
export const userWalletService = new UserWalletService();
