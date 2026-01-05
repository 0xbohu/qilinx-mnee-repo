"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, Bot } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { JobCreationDialog } from "@/components/agents/job-creation-dialog";
import { JobList } from "@/components/agents/job-list";
import type { JobCardData } from "@/components/agents/job-card";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default function AgentsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/agents/jobs");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      // Sort by createdAt descending
      const sortedJobs = data.jobs.sort(
        (a: JobCardData, b: JobCardData) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJobs(sortedJobs);
    } catch (_error) {
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobCreated = (jobId: string) => {
    router.push(`/agents/${jobId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        icon={Bot}
        title="AGI Agents"
        description="Create and manage autonomous AI agents that can analyse and implement tasks with goal-driven workflows."
        badge={{ text: "AI", variant: "default" }}
      >
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <PlusIcon className="mr-1 size-4" />
          New Job
        </Button>
      </PageHeader>

      <main>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : (
          <JobList jobs={jobs} />
        )}
      </main>

      <JobCreationDialog
        onOpenChange={setDialogOpen}
        onSuccess={handleJobCreated}
        open={dialogOpen}
      />
    </div>
  );
}
