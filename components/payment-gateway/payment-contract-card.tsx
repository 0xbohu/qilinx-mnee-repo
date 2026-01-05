"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { PaymentContract } from "./payment-gateway-client";

interface PaymentContractCardProps {
  contract: PaymentContract;
  isSelected: boolean;
  onSelect: (contract: PaymentContract) => void;
}

export function PaymentContractCard({
  contract,
  isSelected,
  onSelect,
}: PaymentContractCardProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(contract.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "border-primary ring-1 ring-primary" : ""
      }`}
      onClick={() => onSelect(contract)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{contract.name}</CardTitle>
          <Badge
            variant={contract.network === "mainnet" ? "default" : "secondary"}
            className="text-xs"
          >
            {contract.network}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-muted-foreground">
            {truncateAddress(contract.contractAddress)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={copyAddress}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
