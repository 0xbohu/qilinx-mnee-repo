"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CreditCard, Receipt, Store, ExternalLink, ArrowRightLeft } from "lucide-react";
import type { TemplateProps } from "./types";
import { getMneeAddress, getBlockExplorerUrl } from "@/lib/contracts/network-config";
import {
  readContract,
  writeContract,
  connectWallet,
  switchWallet,
  getCurrentNetwork,
  switchNetwork,
  getWalletAddress,
  isMetaMaskInstalled,
  onAccountsChanged,
  onChainChanged,
} from "@/lib/contracts/web3-service";

const MNEE_DECIMALS = 2;

const ERC20_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
];

interface PaymentReceipt {
  id: number;
  amount: string;
  description: string;
  timestamp: number;
}

export function PaymentDappTemplate({ config, contract }: TemplateProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mneeBalance, setMneeBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [merchantName, setMerchantName] = useState<string>("");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const mneeAddress = getMneeAddress(contract.network);
  const { theme, branding, sections, features } = config;
  const cardStyle = theme.cardStyle === "bordered" ? "border-2" : theme.cardStyle === "elevated" ? "shadow-lg" : "";
  const networkName = contract.network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet";

  useEffect(() => {
    loadMerchantInfo();
    checkWallet();
    
    // Listen for account changes in MetaMask
    const cleanupAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setMneeBalance(0n);
        setReceipts([]);
      } else {
        setWalletAddress(accounts[0]);
        getCurrentNetwork().then((network) => {
          if (network !== contract.network) {
            setWrongNetwork(true);
          } else {
            setWrongNetwork(false);
            loadData(accounts[0]);
          }
        });
      }
    });
    
    // Listen for chain changes in MetaMask
    const cleanupChain = onChainChanged(() => {
      window.location.reload();
    });
    
    return () => {
      cleanupAccounts();
      cleanupChain();
    };
  }, []);

  const checkWallet = async () => {
    const addr = await getWalletAddress();
    if (addr) {
      setWalletAddress(addr);
      const currentNetwork = await getCurrentNetwork();
      if (currentNetwork !== contract.network) {
        setWrongNetwork(true);
      } else {
        setWrongNetwork(false);
        await loadData(addr);
      }
    }
  };

  const loadMerchantInfo = async () => {
    try {
      const name = await readContract(contract.address, contract.abi, "merchantName", [], contract.network);
      setMerchantName(String(name));
    } catch (err) {
      console.error("Failed to load merchant info:", err);
    }
  };

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      setError("Please install MetaMask to continue");
      return;
    }
    setLoading("connect");
    setError(null);
    try {
      const currentNetwork = await getCurrentNetwork();
      if (currentNetwork !== contract.network) {
        const switched = await switchNetwork(contract.network);
        if (!switched) {
          setWrongNetwork(true);
          throw new Error(`Please switch to ${networkName} in MetaMask`);
        }
      }
      setWrongNetwork(false);
      const addr = await connectWallet();
      setWalletAddress(addr);
      await loadData(addr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(null);
    }
  };

  const handleSwitchNetwork = async () => {
    setLoading("switch");
    try {
      const switched = await switchNetwork(contract.network);
      if (switched) {
        setWrongNetwork(false);
        if (walletAddress) await loadData(walletAddress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch network");
    } finally {
      setLoading(null);
    }
  };

  const handleSwitchWallet = async () => {
    setLoading("switchWallet");
    setError(null);
    try {
      const addr = await switchWallet();
      setWalletAddress(addr);
      const currentNetwork = await getCurrentNetwork();
      if (currentNetwork !== contract.network) {
        setWrongNetwork(true);
      } else {
        setWrongNetwork(false);
        await loadData(addr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch wallet");
    } finally {
      setLoading(null);
    }
  };

  const loadData = async (addr: string) => {
    try {
      const [balance, allow, receiptIds] = await Promise.all([
        readContract(mneeAddress, ERC20_ABI, "balanceOf", [addr], contract.network),
        readContract(mneeAddress, ERC20_ABI, "allowance", [addr, contract.address], contract.network),
        readContract(contract.address, contract.abi, "getPayerReceiptIds", [addr], contract.network),
      ]);
      setMneeBalance(BigInt(String(balance)));
      setAllowance(BigInt(String(allow)));

      const ids = receiptIds as bigint[];
      const recentIds = ids.slice(-5).reverse();
      const receiptPromises = recentIds.map((id) => loadReceipt(Number(id)));
      const loadedReceipts = await Promise.all(receiptPromises);
      setReceipts(loadedReceipts.filter((r): r is PaymentReceipt => r !== null));
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const loadReceipt = async (id: number): Promise<PaymentReceipt | null> => {
    try {
      const result = await readContract(contract.address, contract.abi, "getReceipt", [id], contract.network);
      const [, amount, description, timestamp] = result as [string, bigint, string, bigint, string];
      return { id, amount: formatMnee(BigInt(String(amount))), description, timestamp: Number(timestamp) };
    } catch {
      return null;
    }
  };

  const toRawUnits = (amount: string): bigint => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return 0n;
    return BigInt(Math.floor(num * 10 ** MNEE_DECIMALS));
  };

  const formatMnee = (raw: bigint): string => {
    const divisor = BigInt(10 ** MNEE_DECIMALS);
    const whole = raw / divisor;
    const fraction = raw % divisor;
    return `${whole.toLocaleString()}.${fraction.toString().padStart(MNEE_DECIMALS, "0")}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const handlePay = async () => {
    const rawAmount = toRawUnits(payAmount);
    if (rawAmount <= 0n) return;
    setLoading("pay");
    setError(null);
    setTxHash(null);
    try {
      if (allowance < rawAmount) {
        setTxStatus("Approving MNEE...");
        const approveResult = await writeContract(mneeAddress, ERC20_ABI, "approve", [contract.address, rawAmount.toString()]);
        if (!approveResult.success) throw new Error(approveResult.error || "Approval failed");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setTxStatus("Processing payment...");
      const referenceId = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const result = await writeContract(contract.address, contract.abi, "pay", [rawAmount.toString(), payDescription || "Payment", referenceId]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        setPayAmount("");
        setPayDescription("");
        if (walletAddress) await loadData(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(null);
      setTxStatus(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-8" />}
            <span className="font-bold text-xl" style={{ color: theme.primaryColor }}>{branding.title}</span>
            {features.showNetworkBadge && (
              <Badge variant={contract.network === "mainnet" ? "default" : "secondary"} className="hidden sm:inline-flex">
                {contract.network === "mainnet" ? "Mainnet" : "Sepolia"}
              </Badge>
            )}
          </div>
          
          {!walletAddress ? (
            <Button onClick={handleConnect} disabled={loading === "connect"} style={{ backgroundColor: theme.primaryColor }}>
              {loading === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Connect to {contract.network === "mainnet" ? "Mainnet" : "Sepolia"}
            </Button>
          ) : wrongNetwork ? (
            <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} variant="destructive">
              {loading === "switch" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
              Switch to {networkName}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleSwitchWallet} disabled={loading === "switchWallet"} className="font-mono">
              {loading === "switchWallet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: theme.primaryColor }}>{branding.title}</h1>
          {branding.subtitle && <p className="text-lg text-muted-foreground">{branding.subtitle}</p>}
        </div>

        {/* Merchant Info */}
        {sections.merchantInfo?.enabled && merchantName && (
          <Card className={`mb-6 overflow-hidden ${cardStyle}`}>
            <div className="p-5" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, transparent 100%)` }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                  <Store className="h-5 w-5" style={{ color: theme.primaryColor }} />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{sections.merchantInfo.title}</span>
                  <p className="text-xl font-semibold" style={{ color: theme.primaryColor }}>{merchantName}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Payment Form */}
          <div>
            {sections.paymentForm?.enabled && (
              <Card className={cardStyle}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> {sections.paymentForm.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!walletAddress ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">Connect your wallet to make a payment</p>
                      <Button onClick={handleConnect} disabled={loading === "connect"} style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                        Connect to {contract.network === "mainnet" ? "Mainnet" : "Sepolia"}
                      </Button>
                    </div>
                  ) : wrongNetwork ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">Please switch to the correct network</p>
                      <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} variant="destructive">
                        {loading === "switch" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                        Switch to {networkName}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Amount</label>
                          <button onClick={() => setPayAmount(formatMnee(mneeBalance).replace(/,/g, ""))} className="text-sm font-medium hover:underline" style={{ color: theme.primaryColor }}>
                            Balance: {formatMnee(mneeBalance)}
                          </button>
                        </div>
                        <div className="relative">
                          <Input type="number" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-14 text-xl font-semibold pr-20" step="0.01" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">MNEE</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                        <Input placeholder="Payment for..." value={payDescription} onChange={(e) => setPayDescription(e.target.value)} />
                      </div>
                      <Button onClick={handlePay} disabled={loading === "pay" || !payAmount || toRawUnits(payAmount) <= 0n} className="w-full h-12 text-lg" style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "pay" ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />{txStatus || "Processing..."}</>) : "Pay"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Receipt History */}
          <div>
            {sections.receiptHistory?.enabled && (
              <Card className={cardStyle}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" /> {sections.receiptHistory.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!walletAddress || wrongNetwork ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Connect wallet to view receipts</p>
                  ) : receipts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
                  ) : (
                    receipts.map((receipt) => (
                      <div key={receipt.id} className="p-3 border rounded-lg space-y-1 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-muted-foreground">Receipt #{receipt.id}</span>
                          <span className="font-semibold" style={{ color: theme.primaryColor }}>{receipt.amount} MNEE</span>
                        </div>
                        <p className="text-sm">{receipt.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(receipt.timestamp)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Transaction Status */}
        {(txHash || error) && (
          <Card className={`mt-6 ${error ? "border-destructive" : "border-green-500"}`}>
            <CardContent className="p-4">
              {txHash && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="font-medium">Transaction submitted</span>
                  <a href={`${getBlockExplorerUrl(contract.network, txHash).replace("/address/", "/tx/")}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm hover:underline flex items-center gap-1">
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {error && <p className="text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        {features.showContractInfo && (
          <div className="text-center mt-10 pt-6 border-t">
            <a href={getBlockExplorerUrl(contract.network, contract.address)} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
              Contract: {contract.address} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
