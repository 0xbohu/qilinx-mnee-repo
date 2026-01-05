// Network configuration for MNEE token addresses
// Task 3.1: Network configuration service

import type { EthereumNetwork } from "@/lib/db/schema";

export const MNEE_ADDRESSES: Record<EthereumNetwork, string> = {
  mainnet: "0x8ccedbae4916b79da7f3f612efb2eb93a2bfd6cf",
  sepolia: "0x772DDa9B82c99Dd9F4d47ACBe2405F89A1440509",
} as const;

export const CHAIN_IDS: Record<EthereumNetwork, bigint> = {
  mainnet: 1n,
  sepolia: 11155111n,
} as const;

export const CHAIN_HEX_IDS: Record<EthereumNetwork, string> = {
  mainnet: "0x1",
  sepolia: "0xaa36a7",
} as const;

export const BLOCK_EXPLORERS: Record<EthereumNetwork, string> = {
  mainnet: "https://etherscan.io",
  sepolia: "https://sepolia.etherscan.io",
} as const;

export const RPC_URLS: Record<EthereumNetwork, string> = {
  mainnet: "https://ethereum-rpc.publicnode.com",
  sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
} as const;

export function getMneeAddress(network: EthereumNetwork): string {
  return MNEE_ADDRESSES[network];
}

export function getChainId(network: EthereumNetwork): bigint {
  return CHAIN_IDS[network];
}

export function getBlockExplorerUrl(network: EthereumNetwork, address: string): string {
  return `${BLOCK_EXPLORERS[network]}/address/${address}`;
}

export function getBlockExplorerTxUrl(network: EthereumNetwork, txHash: string): string {
  return `${BLOCK_EXPLORERS[network]}/tx/${txHash}`;
}
