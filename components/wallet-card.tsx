"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { toast } from "./toast";
import { LoaderIcon } from "./icons";
import { QRCodeGenerator } from "./qr-code-generator";

interface WalletCardProps {
  wallet: {
    address: string;
    balance: string;
    canRequestFaucet?: boolean;
    timeUntilFaucet?: string | null;
  } | null;
}

export function WalletCard({ wallet: initialWallet }: WalletCardProps) {
  const [wallet, setWallet] = useState(initialWallet);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<string>("");
  const [showQRModal, setShowQRModal] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate inline QR code when wallet address is available
  useEffect(() => {
    if (wallet?.address && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        wallet.address,
        {
          width: 120,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("QR code generation error:", err);
        }
      );
    }
  }, [wallet?.address]);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create wallet");
      }

      const data = await response.json();
      
      // Fetch full wallet info after creation
      const walletResponse = await fetch("/api/wallet");
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWallet(walletData.wallet);
      }

      toast({
        type: "success",
        description: `Wallet created: ${data.address.slice(0, 8)}...`,
      });
    } catch (error) {
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Failed to create wallet",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!wallet) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/wallet/balance");
      if (response.ok) {
        const data = await response.json();
        setWallet({
          ...wallet,
          balance: data.balance.toFixed(5),
        });
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const handleRequestFaucet = async () => {
    if (!wallet) return;
    
    setIsRequestingFaucet(true);
    setFaucetStatus("Initializing authentication...");
    
    try {
      // Step 1: Initialize OAuth flow
      const initResponse = await fetch("/api/wallet/faucet/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!initResponse.ok) {
        throw new Error("Failed to initialize authentication");
      }

      const { state, authUrl } = await initResponse.json();

      // Step 2: Open popup for MNEE authentication
      setFaucetStatus("Opening MNEE portal...");
      const popup = window.open(
        authUrl,
        "mnee-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Step 3: Poll for auth completion
      setFaucetStatus("Waiting for authorization...");
      
      const pollForAuth = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 120; // 2 minutes timeout

          pollIntervalRef.current = setInterval(async () => {
            attempts++;

            // Check if popup was closed
            if (popup.closed) {
              stopPolling();
              reject(new Error("Authentication cancelled"));
              return;
            }

            if (attempts >= maxAttempts) {
              stopPolling();
              popup.close();
              reject(new Error("Authentication timed out"));
              return;
            }

            try {
              const statusResponse = await fetch(`/api/wallet/faucet/auth/status/${state}`);
              const statusData = await statusResponse.json();

              if (statusData.status === "completed" && statusData.token) {
                stopPolling();
                popup.close();
                resolve(statusData.token);
              } else if (statusData.status === "error") {
                stopPolling();
                popup.close();
                reject(new Error(statusData.message || "Authentication failed"));
              }
            } catch (e) {
              // Continue polling on network errors
              console.error("Poll error:", e);
            }
          }, 1000);
        });
      };

      const token = await pollForAuth();

      // Step 4: Request faucet with OAuth token
      setFaucetStatus("Requesting faucet tokens...");
      const faucetResponse = await fetch("/api/wallet/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await faucetResponse.json();

      // Handle rate limiting - update UI to show cooldown
      if (data.rateLimited || faucetResponse.status === 429) {
        const timeRemaining = data.timeRemaining || "24 hours";
        setWallet({
          ...wallet,
          canRequestFaucet: false,
          timeUntilFaucet: timeRemaining,
        });
        toast({
          type: "error",
          description: data.message || `Faucet available in ${timeRemaining}`,
        });
        return;
      }

      if (!faucetResponse.ok || !data.success) {
        throw new Error(data.message || "Failed to request faucet");
      }

      toast({
        type: "success",
        description: data.message || `Received ${data.amount} MNEE tokens`,
      });

      // Update wallet state to reflect faucet cooldown
      setWallet({
        ...wallet,
        canRequestFaucet: false,
        timeUntilFaucet: "24h 0m",
      });

      // Refresh balance after faucet
      await handleRefreshBalance();
    } catch (error) {
      stopPolling();
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Failed to request faucet",
      });
    } finally {
      setIsRequestingFaucet(false);
      setFaucetStatus("");
    }
  };

  if (!wallet) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">MNEE Wallet</h3>
        <p className="text-muted-foreground mb-4">
          Create a sandbox MNEE wallet to enable token operations through the AI assistant.
        </p>
        <Button 
          onClick={handleCreateWallet} 
          disabled={isCreating}
          data-testid="create-wallet-button"
        >
          {isCreating ? (
            <>
              <span className="animate-spin mr-2">
                <LoaderIcon />
              </span>
              Creating...
            </>
          ) : (
            "Create Wallet"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">MNEE Wallet</h3>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          {/* QR Code */}
          <div className="flex-shrink-0">
            <canvas
              ref={qrCanvasRef}
              className="rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowQRModal(true)}
              title="Click to enlarge"
              data-testid="wallet-qr-code"
            />
            <p className="text-xs text-muted-foreground text-center mt-1">
              Click to enlarge
            </p>
          </div>

          {/* Address and Balance */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <p 
                className="font-mono text-xs break-all bg-muted p-2 rounded mt-1"
                data-testid="wallet-address"
              >
                {wallet.address}
              </p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Balance</label>
              <div className="flex items-center gap-2 mt-1">
                <p 
                  className="text-2xl font-bold"
                  data-testid="wallet-balance"
                >
                  {wallet.balance} MNEE
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <span className="animate-spin">
                      <LoaderIcon />
                    </span>
                  ) : (
                    "↻"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          This is a MNEE Sandbox wallet. Only send sandbox MNEE tokens to this address.
        </p>

        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRequestFaucet}
            disabled={isRequestingFaucet || wallet.canRequestFaucet === false}
            className="w-full"
            data-testid="request-faucet-button"
          >
            {isRequestingFaucet ? (
              <>
                <span className="animate-spin mr-2">
                  <LoaderIcon />
                </span>
                {faucetStatus || "Requesting..."}
              </>
            ) : wallet.canRequestFaucet === false ? (
              `Faucet available in ${wallet.timeUntilFaucet}`
            ) : (
              "Request Faucet Tokens"
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {wallet.canRequestFaucet === false 
              ? "Faucet can be requested once every 24 hours"
              : "Connect with MNEE developer account to automatically request faucet tokens"
            }
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeGenerator
        address={wallet.address}
        merchantName="My Wallet"
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
}
