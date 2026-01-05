"use client";

import { JobActions } from "@/components/agents/job-actions";
import { StatusBadge, type JobStatus, type TaskStatus } from "@/components/agents/status-badge";
import { TaskQueue, type TaskData } from "@/components/agents/task-queue";
import { WorkflowCanvas, type WorkflowTask } from "@/components/agents/workflow-canvas";
import { Button } from "@/components/ui/button";
import { useJobStream } from "@/hooks/use-job-stream";
import type { ExecutionEvent } from "@/lib/agents/types";
import { ArrowLeftIcon, WifiIcon, WifiOffIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface TaskAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  thinking?: string;
  aiResponse?: string;
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    error?: string;
  }>;
  error?: string;
}

interface JobDetail {
  id: string;
  title: string;
  goal: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  agents: Array<{ id: string; name: string; description: string | null }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    order: number;
    agentId: string;
    attempts?: TaskAttempt[];
  }>;
}

const POLL_INTERVAL = 3000;

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/jobs/${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Job not found");
          return;
        }
        throw new Error("Failed to fetch job");
      }
      const data = await response.json();
      setJob(data.job);
      setLastUpdated(new Date());
    } catch (_error) {
      toast.error("Failed to load job");
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  // Handle SSE events
  const handleStreamEvent = useCallback((event: ExecutionEvent) => {
    switch (event.type) {
      case "job_started":
        setJob((prev) => prev ? { ...prev, status: "running" } : prev);
        break;
      case "job_paused":
        setJob((prev) => prev ? { ...prev, status: "paused" } : prev);
        break;
      case "job_resumed":
        setJob((prev) => prev ? { ...prev, status: "running" } : prev);
        break;
      case "job_completed":
        setJob((prev) => prev ? { ...prev, status: "completed" } : prev);
        toast.success("Job completed successfully!");
        fetchJob(); // Refresh to get final state
        break;
      case "job_failed":
        setJob((prev) => prev ? { ...prev, status: "failed" } : prev);
        toast.error(event.error || "Job failed");
        fetchJob(); // Refresh to get final state
        break;
      case "job_cancelled":
        setJob((prev) => prev ? { ...prev, status: "failed" } : prev);
        toast.info("Job cancelled");
        fetchJob();
        break;
      case "task_started":
        setJob((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === event.taskId ? { ...t, status: "running" as TaskStatus } : t
            ),
          };
        });
        break;
      case "task_completed":
        setJob((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === event.taskId ? { ...t, status: "completed" as TaskStatus } : t
            ),
          };
        });
        break;
      case "task_failed":
        setJob((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === event.taskId ? { ...t, status: "failed" as TaskStatus } : t
            ),
          };
        });
        break;
      case "analysis_started":
        setJob((prev) => prev ? { ...prev, status: "analyzing" } : prev);
        break;
      case "analysis_completed":
        setJob((prev) => prev ? { ...prev, status: "ready" } : prev);
        toast.success(`Analysis complete: ${event.taskCount} tasks generated`);
        fetchJob(); // Refresh to get tasks
        break;
      case "analysis_failed":
        setJob((prev) => prev ? { ...prev, status: "failed" } : prev);
        toast.error(event.error || "Analysis failed");
        break;
    }
  }, [fetchJob]);

  // SSE stream for real-time updates
  const shouldStream = job?.status === "running" || job?.status === "analyzing";
  const { isConnected } = useJobStream({
    jobId,
    enabled: shouldStream,
    onEvent: handleStreamEvent,
  });

  // Initial fetch
  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Polling for running jobs as fallback and for transitional states
  useEffect(() => {
    if (!job) return;

    // Poll when running (as SSE fallback) or in transitional states
    const shouldPoll = job.status === "running" || job.status === "analyzing" || 
                       job.status === "pending" || job.status === "paused";

    if (shouldPoll) {
      // Use 5 second interval for running jobs
      const interval = job.status === "running" || job.status === "analyzing" ? 5000 : POLL_INTERVAL;
      pollRef.current = setInterval(fetchJob, interval);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [job?.status, fetchJob]);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return;

    // Update local state immediately for responsiveness
    setJob((prev) => prev ? { ...prev, status: newStatus } : prev);
    setLastUpdated(new Date());

    // If status changed to ready, refetch to get tasks
    if (newStatus === "ready") {
      await fetchJob();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading job...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Job not found</p>
        <Button asChild variant="outline">
          <Link href="/agents">
            <ArrowLeftIcon className="mr-1 size-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  const isEditable = job.status === "ready";
  const tasks: TaskData[] = job.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    order: t.order,
    agentId: t.agentId,
    attempts: t.attempts,
  }));

  const workflowTasks: WorkflowTask[] = tasks;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link href="/agents">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-xl">{job.title}</h1>
              <StatusBadge status={job.status} />
              {shouldStream && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isConnected ? (
                    <>
                      <WifiIcon className="size-3 text-green-500" />
                      Live
                    </>
                  ) : (
                    <>
                      <WifiOffIcon className="size-3 text-yellow-500" />
                      Connecting...
                    </>
                  )}
                </span>
              )}
            </div>
            {lastUpdated && (
              <p className="text-muted-foreground text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <JobActions
          jobId={jobId}
          isUpdating={isUpdating}
          onStatusChange={handleStatusChange}
          status={job.status}
        />
      </header>

      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Goal Section */}
        <section>
          <h2 className="mb-2 font-medium text-lg">Goal</h2>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-muted-foreground">{job.goal}</p>
          </div>
        </section>

        {/* Assigned Agents */}
        <section>
          <h2 className="mb-2 font-medium text-lg">Assigned Agents</h2>
          <div className="flex flex-wrap gap-2">
            {job.agents.map((agent, index) => (
              <div
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                key={agent.id}
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-sm">{agent.name}</p>
                  {agent.description && (
                    <p className="text-muted-foreground text-xs">
                      {agent.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {job.agents.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No agents assigned
              </p>
            )}
          </div>
        </section>

        {/* Workflow Canvas */}
        <section>
          <h2 className="mb-2 font-medium text-lg">Workflow</h2>
          <WorkflowCanvas agents={job.agents} tasks={workflowTasks} />
        </section>

        {/* Task Queue */}
        <section>
          <h2 className="mb-2 font-medium text-lg">Tasks</h2>
          <TaskQueue agents={job.agents} editable={isEditable} tasks={tasks} />
        </section>
      </main>
    </div>
  );
}
