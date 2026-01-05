"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, ExternalLink, Pencil, Trash2, Globe, GlobeLock, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import type { UserContract, UserDapp, DappTemplate } from "@/lib/db/schema";
import { DappEditor } from "./dapp-editor";

interface DappWithContract {
  dapp: UserDapp;
  contract: UserContract;
}

export function DappBuilderClient() {
  const [contracts, setContracts] = useState<UserContract[]>([]);
  const [dapps, setDapps] = useState<DappWithContract[]>([]);
  const [templates, setTemplates] = useState<DappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<UserContract | null>(null);
  const [editingDapp, setEditingDapp] = useState<DappWithContract | null>(null);
  const [networkFilter, setNetworkFilter] = useState<"all" | "mainnet" | "sepolia">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, dappsRes, templatesRes] = await Promise.all([
        fetch("/api/contracts/user-contracts"),
        fetch("/api/dapps"),
        fetch("/api/dapps/templates"),
      ]);
      
      if (contractsRes.ok) {
        const data = await contractsRes.json();
        setContracts(data.contracts || []);
      }
      if (dappsRes.ok) {
        const data = await dappsRes.json();
        setDapps(Array.isArray(data) ? data : []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDapp = (contract: UserContract) => {
    setSelectedContract(contract);
    setEditingDapp(null);
  };

  const handleEditDapp = (dappWithContract: DappWithContract) => {
    setEditingDapp(dappWithContract);
    setSelectedContract(null);
  };

  const handleDeleteDapp = async (id: string) => {
    if (!confirm("Are you sure you want to delete this DApp?")) return;
    
    try {
      const res = await fetch(`/api/dapps/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDapps(dapps.filter((d) => d.dapp.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete DApp:", error);
    }
  };

  const handleTogglePublish = async (dapp: UserDapp) => {
    try {
      const res = await fetch(`/api/dapps/${dapp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !dapp.isPublished }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Failed to toggle publish:", error);
    }
  };

  const handleClose = () => {
    setSelectedContract(null);
    setEditingDapp(null);
    loadData();
  };

  const getTemplateForContract = (contract: UserContract): DappTemplate | undefined => {
    // Find template matching contract category based on contract name
    const name = contract.name.toLowerCase();
    if (name.includes("staking")) return templates.find((t) => t.category === "staking");
    if (name.includes("dao") || name.includes("voting") || name.includes("governance")) return templates.find((t) => t.category === "dao-voting");
    if (name.includes("payment")) return templates.find((t) => t.category === "payment");
    return templates[0];
  };

  const filteredContracts = contracts.filter(
    (c) => networkFilter === "all" || c.network === networkFilter
  );

  const filteredDapps = dapps.filter(
    (d) => networkFilter === "all" || d.contract.network === networkFilter
  );

  // Show editor if creating or editing
  if (selectedContract || editingDapp) {
    const contract = selectedContract || editingDapp?.contract;
    const template = selectedContract ? getTemplateForContract(selectedContract) : undefined;
    
    return (
      <DappEditor
        contract={contract!}
        existingDapp={editingDapp?.dapp}
        template={template}
        onClose={handleClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="DApps Builder"
        description="Create public facing dapps interface for your deployed smart contracts using AI guided tool. Customize themes, branding, and features to build production-ready decentralized applications."
        badge={{ text: "ETH Chain", variant: "outline" }}
        notice={{
          text: "Requires MetaMask wallet extension to interact with deployed contracts.",
          link: {
            href: "https://metamask.io/download/",
            label: "Install MetaMask"
          }
        }}
      />

      <Tabs defaultValue="dapps" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="dapps">My DApps ({dapps.length})</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button
              variant={networkFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setNetworkFilter("all")}
            >
              All
            </Button>
            <Button
              variant={networkFilter === "mainnet" ? "default" : "outline"}
              size="sm"
              onClick={() => setNetworkFilter("mainnet")}
            >
              Mainnet
            </Button>
            <Button
              variant={networkFilter === "sepolia" ? "default" : "outline"}
              size="sm"
              onClick={() => setNetworkFilter("sepolia")}
            >
              Sepolia
            </Button>
          </div>
        </div>

        <TabsContent value="dapps" className="space-y-4">
          {filteredDapps.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No DApps created yet. Select a contract to create your first DApp.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDapps.map(({ dapp, contract }) => (
                <Card key={dapp.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{dapp.name}</CardTitle>
                        <CardDescription className="text-xs">{contract.name}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={contract.network === "mainnet" ? "default" : "secondary"} className="text-xs">
                          {contract.network}
                        </Badge>
                        {dapp.isPublished ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            <Globe className="h-3 w-3 mr-1" /> Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <GlobeLock className="h-3 w-3 mr-1" /> Draft
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dapp.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{dapp.description}</p>
                    )}
                    {dapp.isPublished && (
                      <a
                        href={`/dapp/${dapp.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        /dapp/{dapp.slug} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditDapp({ dapp, contract })}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTogglePublish(dapp)}>
                        {dapp.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteDapp(dapp.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No deployed contracts. Deploy a contract first from the Contracts Library.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContracts.map((contract) => {
                const dappCount = dapps.filter((d) => d.contract.id === contract.id).length;
                return (
                  <Card key={contract.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{contract.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          {dappCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {dappCount} DApp{dappCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                          <Badge variant={contract.network === "mainnet" ? "default" : "secondary"} className="text-xs">
                            {contract.network}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs font-mono text-muted-foreground">
                        {contract.contractAddress.slice(0, 10)}...{contract.contractAddress.slice(-8)}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleCreateDapp(contract)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create DApp
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
