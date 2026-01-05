"use client";

import { useState, useEffect } from "react";
import { UserContractCard } from "./user-contract-card";
import { NetworkSelector } from "./network-selector";
import { Loader2 } from "lucide-react";
import type { UserContract, EthereumNetwork } from "@/lib/db/schema";

export function UserContractsList() {
  const [contracts, setContracts] = useState<UserContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkFilter, setNetworkFilter] = useState<EthereumNetwork | "all">("all");

  useEffect(() => {
    fetchContracts();
  }, [networkFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const url = networkFilter === "all"
        ? "/api/contracts/user-contracts"
        : `/api/contracts/user-contracts?network=${networkFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts);
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Deployed Contracts</h3>
        <select
          value={networkFilter}
          onChange={(e) => setNetworkFilter(e.target.value as EthereumNetwork | "all")}
          className="text-sm border rounded-md px-2 py-1"
        >
          <option value="all">All Networks</option>
          <option value="mainnet">Mainnet</option>
          <option value="sepolia">Sepolia</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No contracts deployed yet. Select a template above to get started.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map((contract) => (
            <UserContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  );
}
