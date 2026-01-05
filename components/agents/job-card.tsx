"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ComponentProps } from "react";
import { StatusBadge, type JobStatus } from "./status-badge";

export interface JobCardData {
  id: string;
  title: string;
  goal: string;
  status: JobStatus;
  createdAt: string;
  agents: Array<{ name: string }>;
}

type JobCardProps = ComponentProps<typeof Card> & {
  job: JobCardData;
  onClick?: () => void;
};

export function JobCard({ job, onClick, className, ...props }: JobCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">{job.title}</CardTitle>
          <StatusBadge size="sm" status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="line-clamp-2 text-muted-foreground text-sm">{job.goal}</p>
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>
            {job.agents.length > 0
              ? job.agents.map((a) => a.name).join(", ")
              : "No agents"}
          </span>
          <span>{formatDistanceToNow(new Date(job.createdAt))} ago</span>
        </div>
      </CardContent>
    </Card>
  );
}
