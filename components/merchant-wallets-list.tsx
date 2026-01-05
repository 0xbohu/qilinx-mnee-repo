"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MerchantWalletCard } from "./merchant-wallet-card";
import { QRCodeGenerator } from "./qr-code-generator";
import { LoaderIcon, PlusIcon, StoreIcon } from "./icons";
import { toast } from "./toast";

interface MerchantWallet {
  id: string;
  name: string;
  description: string;
  address: string;
  balance: string;
  createdAt: string;
}

export function MerchantWalletsList() {
  const [wallets, setWallets] = useState<MerchantWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletDescription, setNewWalletDescription] = useState("");
  const [qrWallet, setQrWallet] = useState<MerchantWallet | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/merchant");
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      }
    } catch (error) {
      console.error("Failed to fetch merchant wallets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!newWalletName.trim() || !newWalletDescription.trim()) {
      toast({
        type: "error",
        description: "Please fill in all fields",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWalletName.trim(),
          description: newWalletDescription.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create merchant wallet");
      }

      setWallets((prev) => [...prev, data.wallet]);
      setShowCreateDialog(false);
      setNewWalletName("");
      setNewWalletDescription("");

      toast({
        type: "success",
        description: `Merchant wallet "${data.wallet.name}" created successfully`,
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

  const handleRefreshBalance = async (walletId: string) => {
    try {
      const response = await fetch(`/api/merchant/${walletId}/balance`);
      if (response.ok) {
        const data = await response.json();
        setWallets((prev) =>
          prev.map((w) =>
            w.id === walletId ? { ...w, balance: data.balance } : w
          )
        );
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  const handleDelete = (walletId: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== walletId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <LoaderIcon size={24} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Create merchant wallets to receive payments from customers.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon />
            <span className="ml-2">Create Merchant</span>
          </Button>
        </div>

        {wallets.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <StoreIcon size={48} />
            <h3 className="mt-4 text-lg font-medium">No merchant wallets yet</h3>
            <p className="mt-2 text-muted-foreground">
              Create a merchant wallet to start receiving payments.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              Create your first merchant wallet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <MerchantWalletCard
                key={wallet.id}
                wallet={wallet}
                onRefreshBalance={handleRefreshBalance}
                onGenerateQR={setQrWallet}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Wallet Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Merchant Wallet</DialogTitle>
            <DialogDescription>
              Create a new merchant wallet to receive payments. Each wallet has its own address and can be used for different services.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Merchant Name</Label>
              <Input
                id="name"
                placeholder="e.g., Coffee Shop"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {newWalletName.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Payments for coffee and pastries"
                value={newWalletDescription}
                onChange={(e) => setNewWalletDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {newWalletDescription.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateWallet} disabled={isCreating}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {qrWallet && (
        <QRCodeGenerator
          address={qrWallet.address}
          merchantName={qrWallet.name}
          isOpen={!!qrWallet}
          onClose={() => setQrWallet(null)}
        />
      )}
    </>
  );
}
