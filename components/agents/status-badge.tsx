"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type JobStatus =
  | "pending"
  | "analyzing"
  | "ready"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

type StatusBadgeProps = ComponentProps<typeof Badge> & {
  status: JobStatus | TaskStatus;
  size?: "sm" | "md";
};

const statusConfig: Record<
  JobStatus | TaskStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  analyzing: {
    label: "Analyzing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  ready: {
    label: "Ready",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  running: {
    label: "Running",
    className: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  },
  paused: {
    label: "Paused",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  skipped: {
    label: "Skipped",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export function StatusBadge({
  status,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      className={cn(
        config.className,
        size === "sm" && "px-1.5 py-0 text-[10px]",
        className
      )}
      variant="outline"
      {...props}
    >
      {config.label}
    </Badge>
  );
}
