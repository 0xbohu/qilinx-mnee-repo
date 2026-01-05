// Web3 service for MetaMask integration using ethers v6
// Task 6.1: Web3 service (client-side)
"use client";

import { BrowserProvider, ContractFactory, Contract, JsonRpcProvider } from "ethers";
import type { EthereumNetwork } from "@/lib/db/schema";
import { CHAIN_IDS, CHAIN_HEX_IDS, RPC_URLS } from "./network-config";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }

  const provider = new BrowserProvider(window.ethereum!);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

export async function switchWallet(): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }

  // Use wallet_requestPermissions to force MetaMask to show account selector
  await window.ethereum!.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });

  const provider = new BrowserProvider(window.ethereum!);
  const accounts = await provider.send("eth_accounts", []);
  return accounts[0];
}

export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  if (!isMetaMaskInstalled()) return () => {};
  
  const handler = (accounts: unknown) => {
    callback(accounts as string[]);
  };
  
  window.ethereum!.on("accountsChanged", handler);
  
  // Return cleanup function
  return () => {
    window.ethereum!.removeListener("accountsChanged", handler);
  };
}

export function onChainChanged(callback: (chainId: string) => void): () => void {
  if (!isMetaMaskInstalled()) return () => {};
  
  const handler = (chainId: unknown) => {
    callback(chainId as string);
  };
  
  window.ethereum!.on("chainChanged", handler);
  
  // Return cleanup function
  return () => {
    window.ethereum!.removeListener("chainChanged", handler);
  };
}

export async function getCurrentNetwork(): Promise<EthereumNetwork | null> {
  if (!isMetaMaskInstalled()) return null;

  const provider = new BrowserProvider(window.ethereum!);
  const network = await provider.getNetwork();

  if (network.chainId === CHAIN_IDS.mainnet) return "mainnet";
  if (network.chainId === CHAIN_IDS.sepolia) return "sepolia";
  return null;
}

export async function switchNetwork(network: EthereumNetwork): Promise<boolean> {
  if (!isMetaMaskInstalled()) return false;

  const chainId = CHAIN_HEX_IDS[network];
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
    return true;
  } catch (error: unknown) {
    // If chain not added, try to add it (for Sepolia)
    if ((error as { code?: number })?.code === 4902 && network === "sepolia") {
      try {
        await window.ethereum!.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.infura.io/v3/"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function deployContract(
  abi: object[],
  bytecode: string,
  constructorArgs: unknown[]
): Promise<DeploymentResult> {
  if (!isMetaMaskInstalled()) {
    return { success: false, error: "MetaMask is not installed" };
  }

  try {
    const provider = new BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const factory = new ContractFactory(abi, bytecode, signer);
    
    const contract = await factory.deploy(...constructorArgs);
    const receipt = await contract.deploymentTransaction()?.wait();

    return {
      success: true,
      contractAddress: await contract.getAddress(),
      transactionHash: receipt?.hash,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Deployment failed";
    // Handle user rejection
    if (message.includes("user rejected") || message.includes("User denied")) {
      return { success: false, error: "Transaction was rejected by user" };
    }
    return { success: false, error: message };
  }
}

export async function getWalletAddress(): Promise<string | null> {
  if (!isMetaMaskInstalled()) return null;

  try {
    const provider = new BrowserProvider(window.ethereum!);
    const accounts = await provider.send("eth_accounts", []);
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export interface WriteResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export async function readContract(
  contractAddress: string,
  abi: object[],
  functionName: string,
  args: unknown[],
  network: EthereumNetwork
): Promise<unknown> {
  // Prefer MetaMask provider if available and on correct network
  if (isMetaMaskInstalled()) {
    try {
      const currentNetwork = await getCurrentNetwork();
      if (currentNetwork === network) {
        const provider = new BrowserProvider(window.ethereum!);
        const contract = new Contract(contractAddress, abi, provider);
        return await contract[functionName](...args);
      }
    } catch (e) {
      console.warn("MetaMask read failed, falling back to public RPC:", e);
    }
  }

  // Fallback to public RPC with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const provider = new JsonRpcProvider(RPC_URLS[network], undefined, {
      staticNetwork: true,
    });
    const contract = new Contract(contractAddress, abi, provider);
    const result = await contract[functionName](...args);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function writeContract(
  contractAddress: string,
  abi: object[],
  functionName: string,
  args: unknown[]
): Promise<WriteResult> {
  if (!isMetaMaskInstalled()) {
    return { success: false, error: "MetaMask is not installed" };
  }

  try {
    const provider = new BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, abi, signer);
    
    const tx = await contract[functionName](...args);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt?.hash || tx.hash,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transaction failed";
    if (message.includes("user rejected") || message.includes("User denied")) {
      return { success: false, error: "Transaction was rejected by user" };
    }
    return { success: false, error: message };
  }
}
