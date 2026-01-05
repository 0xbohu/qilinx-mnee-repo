"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeViewer } from "./code-viewer";
import { DeployButton } from "./deploy-button";
import { Loader2, Send, X, Sparkles, AlertCircle, CheckCircle, CheckIcon } from "lucide-react";
import type { ContractTemplate, EthereumNetwork } from "@/lib/db/schema";
import { getMneeAddress } from "@/lib/contracts/network-config";
import type { DeploymentResult } from "@/lib/contracts/web3-service";
import { chatModels, modelsByProvider, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ContractCustomizerProps {
  template: ContractTemplate;
  network: EthereumNetwork;
  onClose: () => void;
  onDeploySuccess: (result: DeploymentResult, sourceCode: string, abi: object[]) => void;
}

export function ContractCustomizer({ template, network, onClose, onDeploySuccess }: ContractCustomizerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState(template.soliditySourceCode);
  const [compiledAbi, setCompiledAbi] = useState<object[] | null>(null);
  const [compiledBytecode, setCompiledBytecode] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_CHAT_MODEL);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/contracts/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id, network, messages: newMessages, modelId: selectedModelId }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
      }

      // Extract code block if present
      const codeMatch = assistantContent.match(/```solidity\n([\s\S]*?)```/);
      if (codeMatch) {
        setCurrentCode(codeMatch[1]);
        setCompiledAbi(null);
        setCompiledBytecode(null);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompileError(null);
    setCompiledAbi(null);
    setCompiledBytecode(null);

    try {
      // Extract contract name from code
      const nameMatch = currentCode.match(/contract\s+(\w+)/);
      const contractName = nameMatch?.[1] || "Contract";

      const res = await fetch("/api/contracts/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: currentCode, contractName }),
      });

      const result = await res.json();
      if (result.success) {
        setCompiledAbi(result.abi);
        setCompiledBytecode(result.bytecode);
      } else {
        setCompileError(result.errors?.join("\n") || "Compilation failed");
      }
    } catch (error) {
      setCompileError("Failed to compile contract");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploySuccess = (result: DeploymentResult) => {
    setDeployError(null);
    onDeploySuccess(result, currentCode, compiledAbi!);
  };

  const mneeAddress = getMneeAddress(network);
  const constructorArgs = template.constructorParamsSchema?.map(p => {
    if (p.name === "_mneeToken") return mneeAddress;
    return p.defaultValue || "";
  }) || [];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-4 bg-background border rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">
              Network: {network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-2 border-b">
              <ContractModelSelector
                selectedModelId={selectedModelId}
                onModelChange={setSelectedModelId}
              />
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2" />
                  <p>Ask me to customize this contract for your needs.</p>
                  <p className="text-sm mt-2">
                    For example: "Change the reward rate" or "Add a minimum stake amount"
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <Message key={i} from={msg.role === "user" ? "user" : "assistant"}>
                  <MessageContent>
                    {msg.role === "assistant" ? (
                      <MessageResponse>{msg.content}</MessageResponse>
                    ) : (
                      msg.content
                    )}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask to customize the contract..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Code & Deploy Panel */}
          <div className="w-1/2 flex flex-col">
            <Tabs defaultValue="code" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="code">Source Code</TabsTrigger>
                <TabsTrigger value="deploy">Deploy</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="flex-1 overflow-auto p-4">
                <CodeViewer code={currentCode} maxHeight="calc(100vh - 280px)" />
              </TabsContent>
              <TabsContent value="deploy" className="flex-1 overflow-auto p-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">1. Compile Contract</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={handleCompile} disabled={isCompiling} className="w-full">
                      {isCompiling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Compiling...
                        </>
                      ) : (
                        "Compile Solidity"
                      )}
                    </Button>
                    {compileError && (
                      <div className="text-sm text-destructive flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <pre className="whitespace-pre-wrap">{compileError}</pre>
                      </div>
                    )}
                    {compiledAbi && (
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Compiled successfully
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">2. Deploy to {network === "mainnet" ? "Mainnet" : "Sepolia"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {template.constructorParamsSchema && (
                      <div className="text-sm space-y-1 mb-4">
                        <p className="font-medium">Constructor Arguments:</p>
                        {template.constructorParamsSchema.map((p, i) => (
                          <div key={p.name} className="text-muted-foreground">
                            {p.name}: <span className="font-mono">{constructorArgs[i]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <DeployButton
                      abi={compiledAbi}
                      bytecode={compiledBytecode}
                      constructorArgs={constructorArgs}
                      targetNetwork={network}
                      onDeploySuccess={handleDeploySuccess}
                      onDeployError={setDeployError}
                    />
                    {deployError && (
                      <div className="text-sm text-destructive flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {deployError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}


const providerNames: Record<string, string> = {
  google: "Google",
};

function PureContractModelSelector({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedModel = chatModels.find((m) => m.id === selectedModelId) || chatModels[0];
  const provider = selectedModel.id.split("/")[0];

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button className="h-8 w-full justify-between px-2" variant="ghost">
          {provider && <ModelSelectorLogo provider={provider} />}
          <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          {Object.entries(modelsByProvider).map(
            ([providerKey, providerModels]) => (
              <ModelSelectorGroup
                heading={providerNames[providerKey] ?? providerKey}
                key={providerKey}
              >
                {providerModels.map((model) => {
                  const logoProvider = model.id.split("/")[0];
                  return (
                    <ModelSelectorItem
                      key={model.id}
                      onSelect={() => {
                        onModelChange(model.id);
                        setOpen(false);
                      }}
                      value={model.id}
                    >
                      <ModelSelectorLogo provider={logoProvider} />
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      {model.id === selectedModel.id && (
                        <CheckIcon className="ml-auto size-4" />
                      )}
                    </ModelSelectorItem>
                  );
                })}
              </ModelSelectorGroup>
            )
          )}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

const ContractModelSelector = memo(PureContractModelSelector);
