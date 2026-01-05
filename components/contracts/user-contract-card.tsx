"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";
import type { UserContract } from "@/lib/db/schema";
import { getBlockExplorerUrl, getBlockExplorerTxUrl } from "@/lib/contracts/network-config";
import { ContractInteractor } from "./contract-interactor";

interface UserContractCardProps {
  contract: UserContract;
}

export function UserContractCard({ contract }: UserContractCardProps) {
  const [showInteractor, setShowInteractor] = useState(false);
  const explorerUrl = getBlockExplorerUrl(contract.network, contract.contractAddress);
  const txUrl = getBlockExplorerTxUrl(contract.network, contract.transactionHash);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{contract.name}</CardTitle>
            <Badge variant={contract.network === "mainnet" ? "default" : "secondary"}>
              {contract.network === "mainnet" ? "Mainnet" : "Sepolia"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Address: </span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs hover:underline inline-flex items-center gap-1"
            >
              {contract.contractAddress.slice(0, 10)}...{contract.contractAddress.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">TX: </span>
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs hover:underline inline-flex items-center gap-1"
            >
              {contract.transactionHash.slice(0, 10)}...{contract.transactionHash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            Deployed: {new Date(contract.deployedAt).toLocaleDateString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowInteractor(true)}
          >
            <Play className="h-3 w-3 mr-2" />
            Interact
          </Button>
        </CardContent>
      </Card>
      {showInteractor && (
        <ContractInteractor contract={contract} onClose={() => setShowInteractor(false)} />
      )}
    </>
  );
}
