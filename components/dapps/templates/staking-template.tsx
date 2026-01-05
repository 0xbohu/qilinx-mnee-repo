"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, ExternalLink, ArrowRightLeft, TrendingUp, Gift } from "lucide-react";
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

export function StakingDappTemplate({ config, contract }: TemplateProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mneeBalance, setMneeBalance] = useState<bigint>(0n);
  const [stakedBalance, setStakedBalance] = useState<bigint>(0n);
  const [earnedRewards, setEarnedRewards] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const mneeAddress = getMneeAddress(contract.network);
  const { theme, branding, features } = config;
  const networkName = contract.network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet";

  useEffect(() => {
    checkWallet();
    
    // Listen for account changes in MetaMask
    const cleanupAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setMneeBalance(0n);
        setStakedBalance(0n);
        setEarnedRewards(0n);
      } else {
        setWalletAddress(accounts[0]);
        getCurrentNetwork().then((network) => {
          if (network !== contract.network) {
            setWrongNetwork(true);
          } else {
            setWrongNetwork(false);
            loadBalances(accounts[0]);
          }
        });
      }
    });
    
    // Listen for chain changes in MetaMask
    const cleanupChain = onChainChanged(() => {
      // Reload the page on chain change for simplicity
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
        await loadBalances(addr);
      }
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
      await loadBalances(addr);
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
        if (walletAddress) await loadBalances(walletAddress);
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
        await loadBalances(addr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch wallet");
    } finally {
      setLoading(null);
    }
  };

  const loadBalances = async (addr: string) => {
    try {
      const [balance, staked, rewards, allow] = await Promise.all([
        readContract(mneeAddress, ERC20_ABI, "balanceOf", [addr], contract.network),
        readContract(contract.address, contract.abi, "userStakedBalance", [addr], contract.network),
        readContract(contract.address, contract.abi, "earned", [addr], contract.network),
        readContract(mneeAddress, ERC20_ABI, "allowance", [addr, contract.address], contract.network),
      ]);
      setMneeBalance(BigInt(String(balance)));
      setStakedBalance(BigInt(String(staked)));
      setEarnedRewards(BigInt(String(rewards)));
      setAllowance(BigInt(String(allow)));
    } catch (err) {
      console.error("Failed to load balances:", err);
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

  const handleStake = async () => {
    const rawAmount = toRawUnits(stakeAmount);
    if (rawAmount <= 0n) return;
    setLoading("stake");
    setError(null);
    setTxHash(null);
    try {
      if (allowance < rawAmount) {
        setTxStatus("Approving MNEE...");
        const approveResult = await writeContract(mneeAddress, ERC20_ABI, "approve", [contract.address, rawAmount.toString()]);
        if (!approveResult.success) throw new Error(approveResult.error || "Approval failed");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setTxStatus("Staking...");
      const result = await writeContract(contract.address, contract.abi, "stake", [rawAmount.toString()]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        setStakeAmount("");
        if (walletAddress) await loadBalances(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stake failed");
    } finally {
      setLoading(null);
      setTxStatus(null);
    }
  };

  const handleWithdraw = async () => {
    const rawAmount = toRawUnits(withdrawAmount);
    if (rawAmount <= 0n) return;
    setLoading("withdraw");
    setError(null);
    setTxHash(null);
    try {
      const result = await writeContract(contract.address, contract.abi, "withdraw", [rawAmount.toString()]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        setWithdrawAmount("");
        if (walletAddress) await loadBalances(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setLoading(null);
    }
  };

  const handleClaimRewards = async () => {
    setLoading("claim");
    setError(null);
    try {
      const result = await writeContract(contract.address, contract.abi, "claimReward", []);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        if (walletAddress) await loadBalances(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.primaryColor }}>
            {branding.title}
          </h1>
          {branding.subtitle && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{branding.subtitle}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Stats */}
          <div className="space-y-4">
            {/* Staked Balance Card */}
            <Card className="overflow-hidden">
              <div className="p-6" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, transparent 100%)` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                    <TrendingUp className="h-5 w-5" style={{ color: theme.primaryColor }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Your Staked MNEE</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                  {walletAddress ? formatMnee(stakedBalance) : "—"}
                </p>
              </div>
            </Card>

            {/* Rewards Summary Card */}
            <Card className="overflow-hidden">
              <div className="p-6" style={{ background: `linear-gradient(135deg, ${theme.accentColor}15 0%, transparent 100%)` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.accentColor}20` }}>
                    <Gift className="h-5 w-5" style={{ color: theme.accentColor }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Earned Rewards</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: theme.accentColor }}>
                  {walletAddress ? formatMnee(earnedRewards) : "—"}
                </p>
              </div>
            </Card>

            {/* Wallet Balance */}
            {walletAddress && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Available MNEE</p>
                  <p className="text-xl font-semibold">{formatMnee(mneeBalance)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stake/Withdraw Form */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full rounded-none border-b bg-transparent h-14">
                  <TabsTrigger value="stake" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:shadow-none" style={{ borderColor: activeTab === "stake" ? theme.primaryColor : "transparent" }}>
                    Stake
                  </TabsTrigger>
                  <TabsTrigger value="withdraw" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:shadow-none" style={{ borderColor: activeTab === "withdraw" ? theme.primaryColor : "transparent" }}>
                    Withdraw
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:shadow-none" style={{ borderColor: activeTab === "rewards" ? theme.accentColor : "transparent" }}>
                    Rewards
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="stake" className="mt-0 space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Amount to stake</label>
                        {walletAddress && (
                          <button 
                            onClick={() => setStakeAmount(formatMnee(mneeBalance).replace(/,/g, ""))}
                            className="text-sm font-medium hover:underline"
                            style={{ color: theme.primaryColor }}
                          >
                            Max: {formatMnee(mneeBalance)}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="h-16 text-2xl font-semibold pr-20"
                          step="0.01"
                          disabled={!walletAddress || wrongNetwork}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          MNEE
                        </span>
                      </div>
                    </div>

                    {!walletAddress ? (
                      <Button onClick={handleConnect} disabled={loading === "connect"} className="w-full h-14 text-lg" style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "connect" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
                        Connect Wallet
                      </Button>
                    ) : wrongNetwork ? (
                      <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} className="w-full h-14 text-lg" variant="destructive">
                        {loading === "switch" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRightLeft className="mr-2 h-5 w-5" />}
                        Switch to {networkName}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStake}
                        disabled={loading === "stake" || !stakeAmount || toRawUnits(stakeAmount) <= 0n}
                        className="w-full h-14 text-lg"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {loading === "stake" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {txStatus || "Processing..."}
                          </>
                        ) : (
                          "Stake"
                        )}
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="withdraw" className="mt-0 space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Amount to withdraw</label>
                        {walletAddress && (
                          <button 
                            onClick={() => setWithdrawAmount(formatMnee(stakedBalance).replace(/,/g, ""))}
                            className="text-sm font-medium hover:underline"
                            style={{ color: theme.primaryColor }}
                          >
                            Max: {formatMnee(stakedBalance)}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="h-16 text-2xl font-semibold pr-20"
                          step="0.01"
                          disabled={!walletAddress || wrongNetwork}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          MNEE
                        </span>
                      </div>
                    </div>

                    {!walletAddress ? (
                      <Button onClick={handleConnect} disabled={loading === "connect"} className="w-full h-14 text-lg" style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "connect" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
                        Connect Wallet
                      </Button>
                    ) : wrongNetwork ? (
                      <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} className="w-full h-14 text-lg" variant="destructive">
                        {loading === "switch" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRightLeft className="mr-2 h-5 w-5" />}
                        Switch to {networkName}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleWithdraw}
                        disabled={loading === "withdraw" || !withdrawAmount || toRawUnits(withdrawAmount) <= 0n}
                        className="w-full h-14 text-lg"
                        variant="outline"
                      >
                        {loading === "withdraw" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Withdraw
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="rewards" className="mt-0 space-y-6">
                    <div className="text-center py-4" style={{ background: `linear-gradient(135deg, ${theme.accentColor}10 0%, transparent 100%)`, borderRadius: "0.5rem" }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gift className="h-6 w-6" style={{ color: theme.accentColor }} />
                        <span className="text-sm text-muted-foreground">Earned Rewards</span>
                      </div>
                      <p className="text-4xl font-bold" style={{ color: theme.accentColor }}>
                        {walletAddress ? formatMnee(earnedRewards) : "—"} <span className="text-xl">MNEE</span>
                      </p>
                    </div>

                    {!walletAddress ? (
                      <Button onClick={handleConnect} disabled={loading === "connect"} className="w-full h-14 text-lg" style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "connect" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
                        Connect Wallet
                      </Button>
                    ) : wrongNetwork ? (
                      <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} className="w-full h-14 text-lg" variant="destructive">
                        {loading === "switch" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRightLeft className="mr-2 h-5 w-5" />}
                        Switch to {networkName}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleClaimRewards}
                        disabled={loading === "claim" || earnedRewards <= 0n}
                        className="w-full h-14 text-lg"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        {loading === "claim" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Gift className="mr-2 h-5 w-5" />}
                        {earnedRewards > 0n ? "Claim Rewards" : "No Rewards Yet"}
                      </Button>
                    )}

                    <p className="text-sm text-muted-foreground text-center">
                      Rewards are earned based on your staked MNEE and the pool's reward rate.
                    </p>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>

            {/* Transaction Status */}
            {(txHash || error) && (
              <Card className={`mt-4 ${error ? "border-destructive" : "border-green-500"}`}>
                <CardContent className="p-4">
                  {txHash && (
                    <div className="flex items-center justify-between text-green-600">
                      <span className="font-medium">Transaction submitted</span>
                      <a
                        href={`${getBlockExplorerUrl(contract.network, txHash).replace("/address/", "/tx/")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {error && <p className="text-destructive">{error}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        {features.showContractInfo && (
          <div className="text-center mt-12 pt-8 border-t">
            <a
              href={getBlockExplorerUrl(contract.network, contract.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
            >
              Contract: {contract.address} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
