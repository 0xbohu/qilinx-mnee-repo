"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  ShoppingCart,
  Store,
  CreditCard,
  Package,
  X,
} from "lucide-react";
import type { PaymentContract } from "./payment-gateway-client";
import type {
  PaymentSession,
  PaymentSessionStatus,
} from "@/lib/payment-gateway/payment-gateway-service";

const GATEWAY_URL = "https://mnee-payment-gateway.vercel.app";

interface TestPaymentModalProps {
  contract: PaymentContract;
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = "form" | "loading" | "payment" | "success" | "error";

// Mockup external website component
function MockExternalWebsite({
  children,
  amount,
  onClose,
}: {
  children: React.ReactNode;
  amount: string;
  onClose: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden">
      {/* Browser chrome mockup */}
      <div className="bg-slate-700 px-4 py-2 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-slate-600 rounded px-3 py-1 text-xs text-slate-300 font-mono">
          https://demo-store.example.com/checkout
        </div>
      </div>

      {/* External website content */}
      <div className="p-6">
        {/* Store header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-300">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-lg text-slate-800">Demo Store</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-4 w-4" />
              Cart (1)
            </span>
          </div>
        </div>

        {/* Checkout layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Order summary */}
          <div className="col-span-1 bg-white rounded-lg p-4 shadow-sm h-fit">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Premium Widget</span>
                <span>{amount} MNEE</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-slate-800">
                <span>Total</span>
                <span>{amount} MNEE</span>
              </div>
            </div>
          </div>

          {/* Payment section */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pay with MNEE
                </h3>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-1 bg-slate-100">
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
          This is a simulated external website checkout experience
        </div>
      </div>
    </div>
  );
}

export function TestPaymentModal({
  contract,
  isOpen,
  onClose,
}: TestPaymentModalProps) {
  const [state, setState] = useState<ModalState>("form");
  const [amount, setAmount] = useState("10.00");
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState("form");
      setAmount("10.00");
      setSession(null);
      setPaymentUrl(null);
      setError(null);
      setIframeError(false);
    }
  }, [isOpen]);

  // Poll session status
  useEffect(() => {
    if (state !== "payment" || !session) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/session/${session.id}/status`);
        if (res.ok) {
          const data = await res.json();
          setSession((prev) => (prev ? { ...prev, status: data.session.status } : null));

          if (data.isPaid) {
            setState("success");
          } else if (data.isFailed || data.isExpired) {
            setState("error");
            setError(data.isExpired ? "Payment session expired" : "Payment failed");
          }
        }
      } catch (err) {
        console.error("Failed to poll status:", err);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [state, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/payment-gateway/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: contract.contractAddress,
          network: contract.network,
          amount,
          orderId: `test-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create payment session");
      }

      setSession(data.session);
      setPaymentUrl(data.paymentUrl);
      setState("payment");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to create payment session");
    }
  };

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  const getStatusBadge = (status: PaymentSessionStatus) => {
    const config: Record<
      PaymentSessionStatus,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
    > = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      wallet_connected: { variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      approval_pending: { variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      approval_confirmed: { variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
      payment_pending: { variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      payment_confirmed: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      expired: { variant: "destructive", icon: <Clock className="h-3 w-3" /> },
    };

    const { variant, icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {state === "form" && (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Test Payment Integration</DialogTitle>
              <DialogDescription>
                Simulate how an external website would integrate the MNEE Payment Gateway for {contract.name} on {contract.network}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (MNEE)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Store className="h-4 w-4 mr-2" />
                  Open Demo Checkout
                </Button>
              </div>
            </form>
          </div>
        )}

        {state === "loading" && (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Creating payment session...</p>
            </div>
          </div>
        )}

        {state === "payment" && session && paymentUrl && (
          <MockExternalWebsite amount={amount} onClose={onClose}>
            <div className="space-y-3">
              {/* Status bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Session:</span>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    {session.id.slice(0, 8)}...
                  </code>
                </div>
                {getStatusBadge(session.status)}
              </div>

              {iframeError ? (
                <Alert className="mx-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Unable to load payment page in iframe.</span>
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Open in new tab <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              ) : (
                <iframe
                  src={paymentUrl}
                  className="w-full h-[550px] rounded bg-white"
                  title="MNEE Payment Gateway"
                  onError={handleIframeError}
                />
              )}

              {/* Footer actions */}
              <div className="flex justify-between items-center px-3 py-2 bg-white rounded">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Open payment page directly <ExternalLink className="h-3 w-3" />
                </a>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel Order
                </Button>
              </div>
            </div>
          </MockExternalWebsite>
        )}

        {state === "success" && session && (
          <MockExternalWebsite amount={amount} onClose={onClose}>
            <div className="flex flex-col items-center justify-center py-12 gap-4 bg-white rounded">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-800">Payment Successful!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {session.amount} MNEE has been received
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Order confirmation will be sent to your email
                </p>
              </div>
              <Button onClick={onClose} className="mt-4">
                Return to Store
              </Button>
            </div>
          </MockExternalWebsite>
        )}

        {state === "error" && (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Payment Failed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error || "An error occurred"}</AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setState("form")}>Try Again</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
