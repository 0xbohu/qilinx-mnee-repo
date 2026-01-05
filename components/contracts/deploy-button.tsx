"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import type { EthereumNetwork } from "@/lib/db/schema";
import {
  isMetaMaskInstalled,
  connectWallet,
  getCurrentNetwork,
  switchNetwork,
  deployContract,
  getWalletAddress,
  type DeploymentResult,
} from "@/lib/contracts/web3-service";

interface DeployButtonProps {
  abi: object[] | null;
  bytecode: string | null;
  constructorArgs: unknown[];
  targetNetwork: EthereumNetwork;
  onDeploySuccess: (result: DeploymentResult) => void;
  onDeployError: (error: string) => void;
  disabled?: boolean;
}

type DeployState = "idle" | "connecting" | "switching" | "deploying";

export function DeployButton({
  abi,
  bytecode,
  constructorArgs,
  targetNetwork,
  onDeploySuccess,
  onDeployError,
  disabled,
}: DeployButtonProps) {
  const [state, setState] = useState<DeployState>("idle");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      const address = await getWalletAddress();
      setWalletAddress(address);
    };
    checkConnection();
  }, []);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      onDeployError("MetaMask is not installed.");
      return;
    }
    setState("connecting");
    try {
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      onDeployError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setState("idle");
    }
  };

  const handleDeploy = async () => {
    if (!abi || !bytecode) {
      onDeployError("Contract must be compiled before deployment");
      return;
    }

    if (!isMetaMaskInstalled()) {
      onDeployError("MetaMask is not installed. Please install MetaMask to deploy contracts.");
      return;
    }

    try {
      // Connect wallet if not connected
      if (!walletAddress) {
        setState("connecting");
        const address = await connectWallet();
        setWalletAddress(address);
      }

      // Check network
      const currentNetwork = await getCurrentNetwork();
      if (currentNetwork !== targetNetwork) {
        setState("switching");
        const switched = await switchNetwork(targetNetwork);
        if (!switched) {
          onDeployError(`Please switch to ${targetNetwork === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet"} in MetaMask`);
          setState("idle");
          return;
        }
      }

      // Deploy
      setState("deploying");
      const result = await deployContract(abi, bytecode, constructorArgs);

      if (result.success) {
        onDeploySuccess(result);
      } else {
        onDeployError(result.error || "Deployment failed");
      }
    } catch (error) {
      onDeployError(error instanceof Error ? error.message : "Deployment failed");
    } finally {
      setState("idle");
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case "connecting":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting Wallet...
          </>
        );
      case "switching":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Switching Network...
          </>
        );
      case "deploying":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deploying...
          </>
        );
      default:
        return (
          <>
            <Rocket className="mr-2 h-4 w-4" />
            Deploy to {targetNetwork === "mainnet" ? "Mainnet" : "Sepolia"}
          </>
        );
    }
  };

  const isDisabled = disabled || state !== "idle" || !abi || !bytecode;

  return (
    <div className="space-y-2">
      {walletAddress ? (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={state !== "idle"}
            title="Change account"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          variant="outline"
          className="w-full"
          disabled={state !== "idle"}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      )}
      
      <Button
        onClick={handleDeploy}
        disabled={isDisabled}
        className="w-full"
        size="lg"
      >
        {getButtonContent()}
      </Button>
      
      {!abi && !bytecode && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Compile the contract first
        </p>
      )}
    </div>
  );
}
