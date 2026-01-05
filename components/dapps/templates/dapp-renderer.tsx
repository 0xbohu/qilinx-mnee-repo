"use client";

import type { TemplateProps } from "./types";
import { StakingDappTemplate } from "./staking-template";
import { DaoVotingDappTemplate } from "./dao-voting-template";
import { PaymentDappTemplate } from "./payment-template";

export function DappRenderer({ config, contract }: TemplateProps) {
  switch (config.templateType) {
    case "staking":
      return <StakingDappTemplate config={config} contract={contract} />;
    case "dao-voting":
      return <DaoVotingDappTemplate config={config} contract={contract} />;
    case "payment":
      return <PaymentDappTemplate config={config} contract={contract} />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Unsupported Template</h1>
            <p className="text-muted-foreground">
              Template type &quot;{(config as { templateType: string }).templateType}&quot; is not supported.
            </p>
          </div>
        </div>
      );
  }
}
