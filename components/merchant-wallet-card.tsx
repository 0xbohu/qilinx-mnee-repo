"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderIcon, TrashIcon } from "./icons";
import { toast } from "./toast";

interface MerchantWallet {
  id: string;
  name: string;
  description: string;
  address: string;
  balance: string;
  createdAt: string;
}

interface MerchantWalletCardProps {
  wallet: MerchantWallet;
  onRefreshBalance: (walletId: string) => Promise<void>;
  onGenerateQR: (wallet: MerchantWallet) => void;
  onDelete: (walletId: string) => void;
}

export function MerchantWalletCard({
  wallet,
  onRefreshBalance,
  onGenerateQR,
  onDelete,
}: MerchantWalletCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshBalance(wallet.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${wallet.name}"?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/merchant/${wallet.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete merchant wallet");
      }

      onDelete(wallet.id);
      toast({
        type: "success",
        description: "Merchant wallet deleted successfully",
      });
    } catch (error) {
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Failed to delete wallet",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" data-testid="merchant-name">
            {wallet.name}
          </h3>
          <p className="text-sm text-muted-foreground" data-testid="merchant-description">
            {wallet.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? (
            <span className="animate-spin">
              <LoaderIcon />
            </span>
          ) : (
            <TrashIcon size={16} />
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Address</label>
          <p
            className="font-mono text-sm break-all bg-muted p-2 rounded mt-1"
            data-testid="merchant-address"
          >
            {wallet.address}
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Balance</label>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold" data-testid="merchant-balance">
              {wallet.balance} MNEE
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
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

        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateQR(wallet)}
            className="w-full"
            data-testid="generate-qr-button"
          >
            Generate QR Code
          </Button>
        </div>
      </div>
    </div>
  );
}
