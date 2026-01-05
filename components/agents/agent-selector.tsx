"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export interface AgentOption {
  id: string;
  name: string;
  description: string | null;
}

type AgentSelectorProps = ComponentProps<"div"> & {
  agents: AgentOption[];
  selectedAgentIds: string[];
  onSelectionChange: (agentIds: string[]) => void;
};

export function AgentSelector({
  agents,
  selectedAgentIds,
  onSelectionChange,
  className,
  ...props
}: AgentSelectorProps) {
  const handleToggle = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      onSelectionChange(selectedAgentIds.filter((id) => id !== agentId));
    } else {
      onSelectionChange([...selectedAgentIds, agentId]);
    }
  };

  const getOrder = (agentId: string) => {
    const index = selectedAgentIds.indexOf(agentId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {agents.map((agent) => {
        const order = getOrder(agent.id);
        const isSelected = order !== null;

        return (
          <div
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 transition-colors",
              isSelected && "border-primary bg-primary/5"
            )}
            key={agent.id}
          >
            <Checkbox
              checked={isSelected}
              id={`agent-${agent.id}`}
              onCheckedChange={() => handleToggle(agent.id)}
            />
            <div className="flex-1 space-y-1">
              <Label
                className="flex cursor-pointer items-center gap-2 font-medium"
                htmlFor={`agent-${agent.id}`}
              >
                {agent.name}
                {order && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                    {order}
                  </span>
                )}
              </Label>
              {agent.description && (
                <p className="text-muted-foreground text-sm">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {agents.length === 0 && (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No agents available
        </p>
      )}
    </div>
  );
}
