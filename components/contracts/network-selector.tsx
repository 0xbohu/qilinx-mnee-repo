"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EthereumNetwork } from "@/lib/db/schema";

interface NetworkSelectorProps {
  value: EthereumNetwork;
  onChange: (network: EthereumNetwork) => void;
  disabled?: boolean;
}

export function NetworkSelector({ value, onChange, disabled }: NetworkSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EthereumNetwork)} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select network" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="mainnet">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ethereum Mainnet
          </div>
        </SelectItem>
        <SelectItem value="sepolia">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Sepolia Testnet
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
