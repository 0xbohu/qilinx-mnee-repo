"use client";

import { useState, useEffect } from "react";
import { TemplateCard } from "@/components/contracts/template-card";
import { NetworkSelector } from "@/components/contracts/network-selector";
import { UserContractsList } from "@/components/contracts/user-contracts-list";
import { ContractCustomizer } from "@/components/contracts/contract-customizer";
import { Loader2, FileCode } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import type { ContractTemplate, EthereumNetwork } from "@/lib/db/schema";
import type { DeploymentResult } from "@/lib/contracts/web3-service";
import { getBlockExplorerUrl } from "@/lib/contracts/network-config";

export default function EthContractsLibraryPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<EthereumNetwork>("sepolia");
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/contracts/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploySuccess = async (
    result: DeploymentResult,
    sourceCode: string,
    abi: object[]
  ) => {
    if (!selectedTemplate || !result.contractAddress || !result.transactionHash) return;

    // Save to database
    try {
      const res = await fetch("/api/contracts/user-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          name: selectedTemplate.name,
          contractAddress: result.contractAddress,
          network,
          constructorArgs: {},
          deployedSourceCode: sourceCode,
          abi,
          transactionHash: result.transactionHash,
        }),
      });

      if (res.ok) {
        const explorerUrl = getBlockExplorerUrl(network, result.contractAddress);
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-medium">Contract deployed successfully!</span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              View on {network === "mainnet" ? "Etherscan" : "Sepolia Etherscan"}
            </a>
          </div>
        );
        setRefreshKey((k) => k + 1);
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error("Failed to save contract:", error);
      toast.error("Contract deployed but failed to save to database");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <PageHeader
        icon={FileCode}
        title="Ethereum Contracts Library"
        description="Select contract template, build and deploy MNEE token integrated smart contracts onchain."
        badge={{ text: "ETH Chain", variant: "outline" }}
        notice={{
          text: "Requires MetaMask wallet extension to deploy contracts.",
          link: {
            href: "https://metamask.io/download/",
            label: "Install MetaMask"
          }
        }}
      >
        <NetworkSelector value={network} onChange={setNetwork} />
      </PageHeader>

      {/* Templates Section */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Contract Templates</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No templates available. Check back later.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        )}
      </section>

      {/* User Contracts Section */}
      <section>
        <UserContractsList key={refreshKey} />
      </section>

      {/* Customizer Modal */}
      {selectedTemplate && (
        <ContractCustomizer
          template={selectedTemplate}
          network={network}
          onClose={() => setSelectedTemplate(null)}
          onDeploySuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
}
