"use client";

import { useRouter } from "next/navigation";
import { JobCard, type JobCardData } from "./job-card";

interface JobListProps {
  jobs: JobCardData[];
}

export function JobList({ jobs }: JobListProps) {
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No jobs yet</p>
        <p className="text-muted-foreground text-sm">
          Create a new job to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard
          job={job}
          key={job.id}
          onClick={() => router.push(`/agents/${job.id}`)}
        />
      ))}
    </div>
  );
}
