"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, X, Save, Globe, Eye, Palette, Layout, Settings } from "lucide-react";
import type { UserContract, UserDapp, DappTemplate, DappUiConfig } from "@/lib/db/schema";
import { DappRenderer } from "./templates/dapp-renderer";
import { DappConfigEditor } from "./dapp-config-editor";

interface DappEditorProps {
  contract: UserContract;
  existingDapp?: UserDapp;
  template?: DappTemplate;
  onClose: () => void;
}

export function DappEditor({ contract, existingDapp, template, onClose }: DappEditorProps) {
  const defaultConfig = existingDapp?.uiConfig || template?.defaultConfig || getDefaultConfig(contract);
  
  const [name, setName] = useState(existingDapp?.name || `${contract.name} DApp`);
  const [description, setDescription] = useState(existingDapp?.description || "");
  const [config, setConfig] = useState<DappUiConfig>(defaultConfig as DappUiConfig);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDapp, setSavedDapp] = useState<UserDapp | null>(existingDapp || null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = savedDapp ? `/api/dapps/${savedDapp.id}` : "/api/dapps";
      const method = savedDapp ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          templateId: template?.id,
          name,
          description,
          uiConfig: config,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const dapp = await res.json();
      setSavedDapp(dapp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!savedDapp) {
      await handleSave();
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/dapps/${savedDapp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: true }),
      });

      if (!res.ok) throw new Error("Failed to publish");
      
      const dapp = await res.json();
      setSavedDapp(dapp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{existingDapp ? "Edit DApp" : "Create DApp"}</h2>
            <p className="text-xs text-muted-foreground">{contract.name}</p>
          </div>
          <Badge variant={contract.network === "mainnet" ? "default" : "secondary"}>
            {contract.network}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {savedDapp?.isPublished && (
            <a
              href={`/dapp/${savedDapp.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              /dapp/{savedDapp.slug}
            </a>
          )}
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button onClick={handlePublish} disabled={publishing || savedDapp?.isPublished}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            {savedDapp?.isPublished ? "Published" : "Publish"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm text-center">{error}</div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Config Panel */}
        <div className="w-[400px] border-r overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">DApp Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          <Tabs defaultValue="branding" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="branding"><Palette className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="sections"><Layout className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="features"><Settings className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <DappConfigEditor config={config} onChange={setConfig} section="branding" />
            </TabsContent>
            <TabsContent value="sections">
              <DappConfigEditor config={config} onChange={setConfig} section="sections" />
            </TabsContent>
            <TabsContent value="features">
              <DappConfigEditor config={config} onChange={setConfig} section="features" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-2 border-b bg-background flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
          <div className="min-h-full">
            <DappRenderer
              config={config}
              contract={{
                address: contract.contractAddress,
                abi: contract.abi as object[],
                network: contract.network,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultConfig(contract: UserContract): DappUiConfig {
  const name = contract.name.toLowerCase();
  
  if (name.includes("staking")) {
    return {
      templateType: "staking",
      theme: { primaryColor: "#3b82f6", accentColor: "#10b981", backgroundColor: "#ffffff", textColor: "#1f2937", cardStyle: "default" },
      branding: { title: contract.name, subtitle: "Stake your MNEE tokens" },
      sections: {
        stakeForm: { enabled: true, title: "Stake MNEE" },
        stakedBalance: { enabled: true, title: "Your Staked Balance" },
        rewards: { enabled: true, title: "Earned Rewards" },
        withdrawForm: { enabled: true, title: "Withdraw" },
      },
      features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: true, showWalletBalance: true },
    };
  }
  
  if (name.includes("dao") || name.includes("voting") || name.includes("governance")) {
    return {
      templateType: "dao-voting",
      theme: { primaryColor: "#8b5cf6", accentColor: "#f59e0b", backgroundColor: "#ffffff", textColor: "#1f2937", cardStyle: "default" },
      branding: { title: contract.name, subtitle: "Participate in governance" },
      sections: {
        proposalList: { enabled: true, title: "Active Proposals" },
        createProposal: { enabled: true, title: "Create Proposal" },
        votingStats: { enabled: true, title: "Governance Stats" },
      },
      features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: false, showWalletBalance: true },
    };
  }
  
  // Default to payment
  return {
    templateType: "payment",
    theme: { primaryColor: "#10b981", accentColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#1f2937", cardStyle: "default" },
    branding: { title: contract.name, subtitle: "Pay with MNEE tokens" },
    sections: {
      paymentForm: { enabled: true, title: "Make Payment" },
      receiptHistory: { enabled: true, title: "Your Receipts" },
      merchantInfo: { enabled: true, title: "Merchant Info" },
    },
    features: { showContractInfo: true, showNetworkBadge: true, showMneeApproval: true, showWalletBalance: true },
  };
}
