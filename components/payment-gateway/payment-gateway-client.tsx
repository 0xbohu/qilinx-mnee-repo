"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, CreditCard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentContractCard } from "./payment-contract-card";
import { IntegrationDetailsPanel } from "./integration-details-panel";
import { TestPaymentModal } from "./test-payment-modal";

export interface PaymentContract {
  id: string;
  name: string;
  contractAddress: string;
  network: "mainnet" | "sepolia";
  deployedAt: Date;
}

export function PaymentGatewayClient() {
  const [contracts, setContracts] = useState<PaymentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<PaymentContract | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment-gateway/contracts");
      if (!res.ok) {
        throw new Error("Failed to fetch payment contracts");
      }
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContract = (contract: PaymentContract) => {
    setSelectedContract(contract);
  };

  const handleTestPayment = () => {
    setShowTestModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadContracts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Payment Gateway"
        description="Integrate your payment contracts with external systems using the MNEE Payment Gateway. Select a contract to view API endpoints, code examples, and test the payment flow."
        badge={{ text: "ETH Chain", variant: "outline" }}
        notice={{
          text: "Requires MetaMask wallet extension to process payments.",
          link: {
            href: "https://metamask.io/download/",
            label: "Install MetaMask"
          }
        }}
      />

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p className="mb-2">No payment contracts deployed yet.</p>
            <p className="text-sm">
              Deploy a payment contract from the Contracts Builder to get started with payment integration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Your Payment Contracts</h2>
            <div className="space-y-3">
              {contracts.map((contract) => (
                <PaymentContractCard
                  key={contract.id}
                  contract={contract}
                  isSelected={selectedContract?.id === contract.id}
                  onSelect={handleSelectContract}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedContract ? (
              <IntegrationDetailsPanel
                contract={selectedContract}
                onTestPayment={handleTestPayment}
              />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Select a payment contract to view integration details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {selectedContract && (
        <TestPaymentModal
          contract={selectedContract}
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}
