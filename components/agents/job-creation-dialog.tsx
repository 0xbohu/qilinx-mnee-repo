"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AgentSelector, type AgentOption } from "./agent-selector";

interface JobCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jobId: string) => void;
}

interface FormState {
  title: string;
  goal: string;
  selectedAgentIds: string[];
}

interface FormErrors {
  title?: string;
  goal?: string;
  agents?: string;
}

export function JobCreationDialog({
  open,
  onOpenChange,
  onSuccess,
}: JobCreationDialogProps) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "",
    goal: "",
    selectedAgentIds: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchAgents = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.agents);
    } catch (_error) {
      toast.error("Failed to load agents");
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAgents();
      setForm({ title: "", goal: "", selectedAgentIds: [] });
      setErrors({});
    }
  }, [open, fetchAgents]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!form.goal.trim()) {
      newErrors.goal = "Goal is required";
    }

    if (form.selectedAgentIds.length === 0) {
      newErrors.agents = "At least one agent must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agents/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          goal: form.goal.trim(),
          agentIds: form.selectedAgentIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create job");
      }

      const data = await response.json();
      toast.success("Job created successfully");
      onOpenChange(false);
      onSuccess?.(data.job.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create job"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Define a goal and select agents to work on it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter job title"
              value={form.title}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Describe what you want to accomplish..."
              rows={4}
              value={form.goal}
            />
            {errors.goal && (
              <p className="text-destructive text-sm">{errors.goal}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Select Agents</Label>
            {isLoadingAgents ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                Loading agents...
              </p>
            ) : (
              <AgentSelector
                agents={agents}
                onSelectionChange={(ids) =>
                  setForm({ ...form, selectedAgentIds: ids })
                }
                selectedAgentIds={form.selectedAgentIds}
              />
            )}
            {errors.agents && (
              <p className="text-destructive text-sm">{errors.agents}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
