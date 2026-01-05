"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PauseIcon, PlayIcon, XIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import type { JobStatus } from "./status-badge";

interface JobActionsProps {
  jobId: string;
  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  isUpdating?: boolean;
}

export function JobActions({
  jobId,
  status,
  onStatusChange,
  isUpdating = false,
}: JobActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}/analyze`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }

      // Refresh job data - status will be updated to "ready"
      onStatusChange("ready");
    } catch (error) {
      console.error("Analysis failed:", error);
      onStatusChange("failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start job");
      }

      onStatusChange("running");
    } catch (error) {
      console.error("Failed to start job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}/pause`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to pause job");
      }

      onStatusChange("paused");
    } catch (error) {
      console.error("Failed to pause job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}/resume`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resume job");
      }

      onStatusChange("running");
    } catch (error) {
      console.error("Failed to resume job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel job");
      }

      onStatusChange("failed");
    } catch (error) {
      console.error("Failed to cancel job:", error);
    } finally {
      setIsLoading(false);
      setShowCancelDialog(false);
    }
  };

  const disabled = isUpdating || isLoading;

  // No actions for completed state
  if (status === "completed") {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {status === "failed" && (
          <Button
            disabled={disabled}
            onClick={handleAnalyze}
            size="sm"
          >
            {isLoading ? (
              <Loader2Icon className="mr-1 size-4 animate-spin" />
            ) : (
              <SparklesIcon className="mr-1 size-4" />
            )}
            Retry
          </Button>
        )}

        {status === "pending" && (
          <>
            <Button
              disabled={disabled}
              onClick={handleAnalyze}
              size="sm"
            >
              {isLoading ? (
                <Loader2Icon className="mr-1 size-4 animate-spin" />
              ) : (
                <SparklesIcon className="mr-1 size-4" />
              )}
              Analyze
            </Button>
            <Button
              disabled={disabled}
              onClick={() => setShowCancelDialog(true)}
              size="sm"
              variant="destructive"
            >
              <XIcon className="mr-1 size-4" />
              Cancel
            </Button>
          </>
        )}

        {status === "analyzing" && (
          <>
            <Button disabled size="sm">
              <Loader2Icon className="mr-1 size-4 animate-spin" />
              Analyzing...
            </Button>
            <Button
              disabled={disabled}
              onClick={() => setShowCancelDialog(true)}
              size="sm"
              variant="destructive"
            >
              <XIcon className="mr-1 size-4" />
              Cancel
            </Button>
          </>
        )}

        {status === "ready" && (
          <Button
            disabled={disabled}
            onClick={handleRun}
            size="sm"
          >
            {isLoading ? (
              <Loader2Icon className="mr-1 size-4 animate-spin" />
            ) : (
              <PlayIcon className="mr-1 size-4" />
            )}
            Run
          </Button>
        )}

        {status === "running" && (
          <>
            <Button
              disabled={disabled}
              onClick={handlePause}
              size="sm"
              variant="outline"
            >
              {isLoading ? (
                <Loader2Icon className="mr-1 size-4 animate-spin" />
              ) : (
                <PauseIcon className="mr-1 size-4" />
              )}
              Pause
            </Button>
            <Button
              disabled={disabled}
              onClick={() => setShowCancelDialog(true)}
              size="sm"
              variant="destructive"
            >
              <XIcon className="mr-1 size-4" />
              Cancel
            </Button>
          </>
        )}

        {status === "paused" && (
          <>
            <Button
              disabled={disabled}
              onClick={handleResume}
              size="sm"
            >
              {isLoading ? (
                <Loader2Icon className="mr-1 size-4 animate-spin" />
              ) : (
                <PlayIcon className="mr-1 size-4" />
              )}
              Resume
            </Button>
            <Button
              disabled={disabled}
              onClick={() => setShowCancelDialog(true)}
              size="sm"
              variant="destructive"
            >
              <XIcon className="mr-1 size-4" />
              Cancel
            </Button>
          </>
        )}
      </div>

      <AlertDialog onOpenChange={setShowCancelDialog} open={showCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the job and mark it as failed. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Running</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
