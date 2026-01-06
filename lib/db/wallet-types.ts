/**
 * Wallet Configuration Types
 * Flexible JSON structure to support multiple blockchain wallets
 */

// Base wallet interface for any blockchain
export interface BaseWallet {
  address: string;
  encryptedPrivateKey: string;
  createdAt: string;
  lastFaucetRequest?: string;
}

// MNEE/BSV specific wallet
export interface MneeWallet extends BaseWallet {
  type: 'mnee';
  network: 'sandbox' | 'mainnet';
}

// Future: Ethereum wallet
export interface EthWallet extends BaseWallet {
  type: 'ethereum';
  network: 'mainnet' | 'sepolia' | 'goerli';
  chainId: number;
}

// Future: Solana wallet
export interface SolanaWallet extends BaseWallet {
  type: 'solana';
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

// Merchant wallet for receiving payments
export interface MerchantWallet {
  id: string;
  name: string;
  description: string;
  address: string;
  encryptedPrivateKey: string;
  createdAt: string;
  network: 'sandbox' | 'mainnet';
}

// Union type for all supported wallets
export type Wallet = MneeWallet | EthWallet | SolanaWallet;

// Wallet type identifiers
export type WalletType = 'mnee' | 'ethereum' | 'solana';

// Main wallet config structure
export interface WalletConfig {
  version: number; // Schema version for migrations
  wallets: {
    mnee?: MneeWallet;
    mneeProduction?: MneeWallet;
    ethereum?: EthWallet;
    solana?: SolanaWallet;
  };
  merchantWallets?: MerchantWallet[];
  defaultWallet?: WalletType;
}

// Helper to create empty wallet config
export function createEmptyWalletConfig(): WalletConfig {
  return {
    version: 1,
    wallets: {},
  };
}

// Helper to check if user has a specific wallet type
export function hasWallet(config: WalletConfig | null, type: WalletType): boolean {
  if (!config) return false;
  return !!config.wallets[type];
}

// Helper to get MNEE wallet from config (sandbox)
export function getMneeWallet(config: WalletConfig | null): MneeWallet | null {
  if (!config) return null;
  return config.wallets.mnee || null;
}

// Helper to get MNEE production wallet from config
export function getMneeProductionWallet(config: WalletConfig | null): MneeWallet | null {
  if (!config) return null;
  return config.wallets.mneeProduction || null;
}

// Helper to check if faucet can be requested (24 hour cooldown)
export function canRequestFaucet(config: WalletConfig | null): boolean {
  const mneeWallet = getMneeWallet(config);
  if (!mneeWallet?.lastFaucetRequest) return true;
  
  const lastRequest = new Date(mneeWallet.lastFaucetRequest);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastRequest < oneDayAgo;
}

// Helper to get time until faucet is available
export function getTimeUntilFaucet(config: WalletConfig | null): string | null {
  const mneeWallet = getMneeWallet(config);
  if (!mneeWallet?.lastFaucetRequest) return null;
  
  const lastRequest = new Date(mneeWallet.lastFaucetRequest);
  const nextAvailable = new Date(lastRequest.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  
  if (nextAvailable <= now) return null;
  
  const diffMs = nextAvailable.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}


// Helper to get merchant wallets from config
export function getMerchantWallets(config: WalletConfig | null): MerchantWallet[] {
  if (!config) return [];
  return config.merchantWallets || [];
}

// Helper to get a specific merchant wallet by ID
export function getMerchantWalletById(config: WalletConfig | null, id: string): MerchantWallet | null {
  const wallets = getMerchantWallets(config);
  return wallets.find(w => w.id === id) || null;
}

// Helper to add a merchant wallet to config
export function addMerchantWallet(config: WalletConfig, wallet: MerchantWallet): WalletConfig {
  const existingWallets = config.merchantWallets || [];
  return {
    ...config,
    merchantWallets: [...existingWallets, wallet],
  };
}

// Helper to remove a merchant wallet from config
export function removeMerchantWallet(config: WalletConfig, walletId: string): WalletConfig {
  const existingWallets = config.merchantWallets || [];
  return {
    ...config,
    merchantWallets: existingWallets.filter(w => w.id !== walletId),
  };
}

// Validation constants for merchant wallets
export const MERCHANT_NAME_MIN_LENGTH = 1;
export const MERCHANT_NAME_MAX_LENGTH = 100;
export const MERCHANT_DESCRIPTION_MIN_LENGTH = 1;
export const MERCHANT_DESCRIPTION_MAX_LENGTH = 500;

// Helper to validate merchant wallet name
export function isValidMerchantName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= MERCHANT_NAME_MIN_LENGTH && trimmed.length <= MERCHANT_NAME_MAX_LENGTH;
}

// Helper to validate merchant wallet description
export function isValidMerchantDescription(description: string): boolean {
  const trimmed = description.trim();
  return trimmed.length >= MERCHANT_DESCRIPTION_MIN_LENGTH && trimmed.length <= MERCHANT_DESCRIPTION_MAX_LENGTH;
}
