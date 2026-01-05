"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Vote, Plus, CheckCircle, XCircle, ExternalLink, ArrowRightLeft, Users } from "lucide-react";
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

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
];

interface Proposal {
  id: number;
  proposer: string;
  description: string;
  forVotes: string;
  againstVotes: string;
  startTime: number;
  endTime: number;
  executed: boolean;
}

export function DaoVotingDappTemplate({ config, contract }: TemplateProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mneeBalance, setMneeBalance] = useState<string | null>(null);
  const [proposalCount, setProposalCount] = useState<number>(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [newProposalDesc, setNewProposalDesc] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const mneeAddress = getMneeAddress(contract.network);
  const { theme, branding, sections, features } = config;
  const cardStyle = theme.cardStyle === "bordered" ? "border-2" : theme.cardStyle === "elevated" ? "shadow-lg" : "";
  const networkName = contract.network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet";

  useEffect(() => {
    checkWallet();
    
    // Listen for account changes in MetaMask
    const cleanupAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setMneeBalance(null);
        setProposals([]);
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
      const [balance, count] = await Promise.all([
        readContract(mneeAddress, ERC20_ABI, "balanceOf", [addr], contract.network),
        readContract(contract.address, contract.abi, "proposalCount", [], contract.network),
      ]);
      setMneeBalance(formatAmount(balance));
      const countNum = Number(count);
      setProposalCount(countNum);

      const proposalPromises = [];
      for (let i = Math.max(1, countNum - 4); i <= countNum; i++) {
        proposalPromises.push(loadProposal(i));
      }
      const loadedProposals = await Promise.all(proposalPromises);
      setProposals(loadedProposals.filter((p): p is Proposal => p !== null).reverse());
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const loadProposal = async (id: number): Promise<Proposal | null> => {
    try {
      const result = await readContract(contract.address, contract.abi, "getProposal", [id], contract.network);
      const [proposer, description, forVotes, againstVotes, startTime, endTime, executed] = result as [string, string, bigint, bigint, bigint, bigint, boolean];
      return { id, proposer, description, forVotes: formatAmount(forVotes), againstVotes: formatAmount(againstVotes), startTime: Number(startTime), endTime: Number(endTime), executed };
    } catch {
      return null;
    }
  };

  const handleCreateProposal = async () => {
    if (!newProposalDesc.trim()) return;
    setLoading("create");
    setError(null);
    setTxHash(null);
    try {
      const result = await writeContract(contract.address, contract.abi, "createProposal", [newProposalDesc]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        setNewProposalDesc("");
        if (walletAddress) await loadData(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setLoading(null);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    setLoading(`vote-${proposalId}-${support}`);
    setError(null);
    setTxHash(null);
    try {
      const result = await writeContract(contract.address, contract.abi, "vote", [proposalId, support]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        if (walletAddress) await loadData(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setLoading(null);
    }
  };

  const handleExecute = async (proposalId: number) => {
    setLoading(`execute-${proposalId}`);
    setError(null);
    setTxHash(null);
    try {
      const result = await writeContract(contract.address, contract.abi, "executeProposal", [proposalId]);
      if (result.success) {
        setTxHash(result.transactionHash || null);
        if (walletAddress) await loadData(walletAddress);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setLoading(null);
    }
  };

  const formatAmount = (value: unknown): string => {
    if (value === null || value === undefined) return "0";
    const num = BigInt(String(value));
    const decimals = 2;
    const divisor = BigInt(10 ** decimals);
    const whole = num / divisor;
    const fraction = num % divisor;
    return `${whole}.${fraction.toString().padStart(decimals, "0")}`;
  };

  const isVotingActive = (proposal: Proposal) => {
    const now = Math.floor(Date.now() / 1000);
    return now >= proposal.startTime && now <= proposal.endTime;
  };

  const isVotingEnded = (proposal: Proposal) => {
    const now = Math.floor(Date.now() / 1000);
    return now > proposal.endTime;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: theme.primaryColor }}>{branding.title}</h1>
          {branding.subtitle && <p className="text-lg text-muted-foreground">{branding.subtitle}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Stats & Create */}
          <div className="space-y-4">
            {/* Voting Power Card */}
            {walletAddress && !wrongNetwork && features.showWalletBalance && (
              <Card className={`overflow-hidden ${cardStyle}`}>
                <div className="p-5" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, transparent 100%)` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                      <Wallet className="h-5 w-5" style={{ color: theme.primaryColor }} />
                    </div>
                    <span className="text-sm text-muted-foreground">Your Voting Power</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>{mneeBalance} MNEE</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}</p>
                </div>
              </Card>
            )}

            {/* Governance Stats */}
            {sections.votingStats?.enabled && (
              <Card className={`overflow-hidden ${cardStyle}`}>
                <div className="p-5" style={{ background: `linear-gradient(135deg, ${theme.accentColor}15 0%, transparent 100%)` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.accentColor}20` }}>
                      <Users className="h-5 w-5" style={{ color: theme.accentColor }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{sections.votingStats.title}</span>
                  </div>
                  <p className="text-2xl font-bold">{proposalCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Proposals</p>
                </div>
              </Card>
            )}

            {/* Create Proposal */}
            {walletAddress && !wrongNetwork && sections.createProposal?.enabled && (
              <Card className={cardStyle}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" /> {sections.createProposal.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea placeholder="Describe your proposal..." value={newProposalDesc} onChange={(e) => setNewProposalDesc(e.target.value)} rows={3} />
                  <Button onClick={handleCreateProposal} disabled={loading === "create" || !newProposalDesc.trim()} className="w-full" style={{ backgroundColor: theme.primaryColor }}>
                    {loading === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Proposal"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Proposals List */}
          <div className="md:col-span-2">
            {sections.proposalList?.enabled && (
              <Card className={cardStyle}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Vote className="h-5 w-5" /> {sections.proposalList.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!walletAddress ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Connect your wallet to view and vote on proposals</p>
                      <Button onClick={handleConnect} disabled={loading === "connect"} style={{ backgroundColor: theme.primaryColor }}>
                        {loading === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                        Connect to {contract.network === "mainnet" ? "Mainnet" : "Sepolia"}
                      </Button>
                    </div>
                  ) : wrongNetwork ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Please switch to the correct network</p>
                      <Button onClick={handleSwitchNetwork} disabled={loading === "switch"} variant="destructive">
                        {loading === "switch" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                        Switch to {networkName}
                      </Button>
                    </div>
                  ) : proposals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No proposals yet. Be the first to create one!</p>
                  ) : (
                    proposals.map((proposal) => (
                      <div key={proposal.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="text-xs text-muted-foreground">Proposal #{proposal.id}</span>
                            <p className="font-medium mt-1">{proposal.description}</p>
                          </div>
                          {proposal.executed ? (
                            <Badge variant="secondary">Executed</Badge>
                          ) : isVotingActive(proposal) ? (
                            <Badge style={{ backgroundColor: theme.accentColor }}>Active</Badge>
                          ) : isVotingEnded(proposal) ? (
                            <Badge variant="outline">Ended</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                        <div className="flex gap-6 text-sm">
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> For: {proposal.forVotes}
                          </span>
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> Against: {proposal.againstVotes}
                          </span>
                        </div>
                        {isVotingActive(proposal) && !proposal.executed && (
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => handleVote(proposal.id, true)} disabled={loading === `vote-${proposal.id}-true`} className="flex-1" style={{ backgroundColor: theme.accentColor }}>
                              {loading === `vote-${proposal.id}-true` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vote For"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleVote(proposal.id, false)} disabled={loading === `vote-${proposal.id}-false`} className="flex-1">
                              {loading === `vote-${proposal.id}-false` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vote Against"}
                            </Button>
                          </div>
                        )}
                        {isVotingEnded(proposal) && !proposal.executed && (
                          <Button size="sm" onClick={() => handleExecute(proposal.id)} disabled={loading === `execute-${proposal.id}`} variant="outline" className="w-full">
                            {loading === `execute-${proposal.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Execute Proposal"}
                          </Button>
                        )}
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
