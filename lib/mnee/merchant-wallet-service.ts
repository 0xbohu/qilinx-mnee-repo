import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, type User } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptPrivateKey } from '@/lib/agents/encryption';
import { WalletGenerator } from './wallet-generator';
import { createTransferService } from './transfer-service';
import { formatMneeAmount } from './amount-utils';
import type { WalletConfig, MerchantWallet } from '@/lib/db/wallet-types';
import {
  getMerchantWallets,
  getMerchantWalletById,
  addMerchantWallet,
  removeMerchantWallet,
  createEmptyWalletConfig,
  isValidMerchantName,
  isValidMerchantDescription,
  MERCHANT_NAME_MAX_LENGTH,
  MERCHANT_DESCRIPTION_MAX_LENGTH,
} from '@/lib/db/wallet-types';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface MerchantWalletInfo {
  id: string;
  name: string;
  description: string;
  address: string;
  balance: string;
  createdAt: string;
}

export interface CreateMerchantWalletResult {
  success: boolean;
  wallet?: MerchantWalletInfo;
  error?: string;
}

export class MerchantWalletService {
  /**
   * Creates a new merchant wallet for a user
   */
  async createMerchantWallet(
    userId: string,
    name: string,
    description: string
  ): Promise<CreateMerchantWalletResult> {
    // Validate inputs
    if (!isValidMerchantName(name)) {
      return {
        success: false,
        error: `Name must be 1-${MERCHANT_NAME_MAX_LENGTH} characters`,
      };
    }

    if (!isValidMerchantDescription(description)) {
      return {
        success: false,
        error: `Description must be 1-${MERCHANT_DESCRIPTION_MAX_LENGTH} characters`,
      };
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    // Get existing user config
    const existingUser = await this.getUser(userId);
    let walletConfig: WalletConfig = existingUser?.walletConfig || createEmptyWalletConfig();

    // Generate new BSV wallet
    const wallet = WalletGenerator.generate();

    // Encrypt the private key for storage
    const encryptedKey = encryptPrivateKey(wallet.privateKeyHex);

    // Create merchant wallet
    const merchantWallet: MerchantWallet = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: trimmedDescription,
      address: wallet.address,
      encryptedPrivateKey: encryptedKey,
      createdAt: new Date().toISOString(),
      network: 'sandbox',
    };

    // Add to config
    walletConfig = addMerchantWallet(walletConfig, merchantWallet);

    // Save to database
    await db
      .update(user)
      .set({ walletConfig })
      .where(eq(user.id, userId));

    return {
      success: true,
      wallet: {
        id: merchantWallet.id,
        name: merchantWallet.name,
        description: merchantWallet.description,
        address: merchantWallet.address,
        balance: '0.00000',
        createdAt: merchantWallet.createdAt,
      },
    };
  }

  /**
   * Gets all merchant wallets for a user
   */
  async getMerchantWallets(userId: string): Promise<MerchantWalletInfo[]> {
    const foundUser = await this.getUser(userId);
    const wallets = getMerchantWallets(foundUser?.walletConfig || null);

    // Fetch balances for all wallets
    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet) => {
        let balance = '0.00000';
        try {
          const transferService = createTransferService('sandbox');
          const balanceInfo = await transferService.getBalance(wallet.address);
          balance = formatMneeAmount(balanceInfo.decimalAmount);
        } catch (e) {
          console.error(`Failed to fetch balance for merchant wallet ${wallet.id}:`, e);
        }

        return {
          id: wallet.id,
          name: wallet.name,
          description: wallet.description,
          address: wallet.address,
          balance,
          createdAt: wallet.createdAt,
        };
      })
    );

    return walletsWithBalances;
  }

  /**
   * Gets a specific merchant wallet by ID
   */
  async getMerchantWalletById(userId: string, walletId: string): Promise<MerchantWalletInfo | null> {
    const foundUser = await this.getUser(userId);
    const wallet = getMerchantWalletById(foundUser?.walletConfig || null, walletId);

    if (!wallet) {
      return null;
    }

    // Fetch balance
    let balance = '0.00000';
    try {
      const transferService = createTransferService('sandbox');
      const balanceInfo = await transferService.getBalance(wallet.address);
      balance = formatMneeAmount(balanceInfo.decimalAmount);
    } catch (e) {
      console.error(`Failed to fetch balance for merchant wallet ${wallet.id}:`, e);
    }

    return {
      id: wallet.id,
      name: wallet.name,
      description: wallet.description,
      address: wallet.address,
      balance,
      createdAt: wallet.createdAt,
    };
  }

  /**
   * Gets balance for a specific merchant wallet
   */
  async getMerchantWalletBalance(address: string): Promise<{ balance: string; error?: string }> {
    try {
      const transferService = createTransferService('sandbox');
      const balanceInfo = await transferService.getBalance(address);
      return { balance: formatMneeAmount(balanceInfo.decimalAmount) };
    } catch (e) {
      console.error(`Failed to fetch balance for address ${address}:`, e);
      return { balance: '0.00000', error: 'Failed to fetch balance' };
    }
  }

  /**
   * Deletes a merchant wallet
   */
  async deleteMerchantWallet(userId: string, walletId: string): Promise<{ success: boolean; error?: string }> {
    const foundUser = await this.getUser(userId);
    
    if (!foundUser?.walletConfig) {
      return { success: false, error: 'User wallet config not found' };
    }

    const wallet = getMerchantWalletById(foundUser.walletConfig, walletId);
    if (!wallet) {
      return { success: false, error: 'Merchant wallet not found' };
    }

    // Remove from config
    const updatedConfig = removeMerchantWallet(foundUser.walletConfig, walletId);

    // Save to database
    await db
      .update(user)
      .set({ walletConfig: updatedConfig })
      .where(eq(user.id, userId));

    return { success: true };
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
export const merchantWalletService = new MerchantWalletService();
