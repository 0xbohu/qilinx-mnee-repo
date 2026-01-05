"use client";

import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2Icon, 
  CircleIcon, 
  PlayCircleIcon, 
  XCircleIcon, 
  SkipForwardIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  Maximize2Icon,
} from "lucide-react";
import { useState } from "react";
import type { TaskStatus } from "./status-badge";

export interface TaskAttemptData {
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

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  order: number;
  agentId: string;
  attempts?: TaskAttemptData[];
}

interface TaskQueueProps {
  tasks: TaskData[];
  agents: Array<{ id: string; name: string }>;
  editable?: boolean;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <CircleIcon className="size-4 text-muted-foreground" />,
  running: <PlayCircleIcon className="size-4 text-blue-500 animate-pulse" />,
  completed: <CheckCircle2Icon className="size-4 text-green-500" />,
  failed: <XCircleIcon className="size-4 text-red-500" />,
  skipped: <SkipForwardIcon className="size-4 text-gray-400" />,
};

export function TaskQueue({ tasks, agents, editable = false }: TaskQueueProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || "Unknown Agent";
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const runningTasks = tasks.filter((t) => t.status === "running");
  const completedTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "failed" || t.status === "skipped"
  );

  if (tasks.length === 0) {
    return (
      <Queue>
        <div className="py-4 text-center text-muted-foreground text-sm">
          No tasks yet. Tasks will be generated when the job is analyzed.
        </div>
      </Queue>
    );
  }

  const TaskSections = ({ inModal = false }: { inModal?: boolean }) => (
    <>
      {runningTasks.length > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={runningTasks.length}
              icon={<PlayCircleIcon className="size-4 text-blue-500" />}
              label="Running"
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <TaskList tasks={runningTasks} getAgentName={getAgentName} editable={editable} defaultExpanded={inModal} />
          </QueueSectionContent>
        </QueueSection>
      )}

      {pendingTasks.length > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={pendingTasks.length}
              icon={<CircleIcon className="size-4 text-muted-foreground" />}
              label="Pending"
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <TaskList tasks={pendingTasks} getAgentName={getAgentName} editable={editable} defaultExpanded={inModal} />
          </QueueSectionContent>
        </QueueSection>
      )}

      {completedTasks.length > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={completedTasks.length}
              icon={<CheckCircle2Icon className="size-4 text-green-500" />}
              label="Completed"
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <TaskList tasks={completedTasks} getAgentName={getAgentName} editable={false} defaultExpanded={inModal} />
          </QueueSectionContent>
        </QueueSection>
      )}
    </>
  );

  return (
    <>
      <div className="relative rounded-lg border bg-card">
        {/* Header with Details button */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-7 gap-1.5 text-xs"
          >
            <Maximize2Icon className="size-3.5" />
            Details
          </Button>
        </div>
        
        {/* Task Queue Content */}
        <Queue className="max-h-[600px] overflow-y-auto">
          <TaskSections />
        </Queue>
      </div>

      {/* Full-size Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Queue>
              <TaskSections inModal />
            </Queue>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Custom TaskList without the max-height restriction
function TaskList({ 
  tasks, 
  getAgentName, 
  editable,
  defaultExpanded = false,
}: { 
  tasks: TaskData[]; 
  getAgentName: (agentId: string) => string; 
  editable: boolean;
  defaultExpanded?: boolean;
}) {
  return (
    <div className="mt-2 space-y-1">
      {tasks.map((task) => (
        <TaskItem
          agentName={getAgentName(task.agentId)}
          editable={editable}
          key={task.id}
          task={task}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

interface TaskItemProps {
  task: TaskData;
  agentName: string;
  editable: boolean;
  defaultExpanded?: boolean;
}

function TaskItem({ task, agentName, editable, defaultExpanded = false }: TaskItemProps) {
  const hasDetails = task.attempts && task.attempts.length > 0;
  const [isOpen, setIsOpen] = useState(defaultExpanded && hasDetails);
  const isCompleted = task.status === "completed" || task.status === "skipped";
  const isFailed = task.status === "failed";
  const latestAttempt = hasDetails ? task.attempts![task.attempts!.length - 1] : null;
  
  // Count tool calls for badge display
  const toolCallCount = latestAttempt?.toolCalls?.length || 0;

  return (
    <QueueItem className={cn(editable && "cursor-pointer")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-2">
          <QueueItemIndicator completed={isCompleted}>
            {statusIcons[task.status]}
          </QueueItemIndicator>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QueueItemContent completed={isCompleted}>
                  {task.title}
                </QueueItemContent>
                {/* Show badge with tool call count if available */}
                {hasDetails && toolCallCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {toolCallCount} tool{toolCallCount > 1 ? "s" : ""}
                  </span>
                )}
                {/* Show error badge if failed */}
                {isFailed && latestAttempt?.error && (
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                    Error
                  </span>
                )}
              </div>
              {hasDetails && (
                <CollapsibleTrigger asChild>
                  <button 
                    type="button"
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <ChevronDownIcon 
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )} 
                    />
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
            {task.description && (
              <QueueItemDescription completed={isCompleted}>
                {task.description}
              </QueueItemDescription>
            )}
            <div className="mt-1 text-muted-foreground text-xs">
              Agent: {agentName}
            </div>
          </div>
        </div>

        {hasDetails && latestAttempt && (
          <CollapsibleContent className="mt-3 ml-6 space-y-3">
            {/* Thinking/Reasoning using AI Element Reasoning component */}
            {latestAttempt.thinking && (
              <Reasoning isStreaming={false}>
                <ReasoningTrigger />
                <ReasoningContent>{latestAttempt.thinking}</ReasoningContent>
              </Reasoning>
            )}

            {/* Tool Calls using AI Element Tool component */}
            {latestAttempt.toolCalls && latestAttempt.toolCalls.length > 0 && (
              <div className="space-y-2">
                {latestAttempt.toolCalls.map((toolCall, index) => (
                  <Tool key={`${toolCall.toolName}-${index}`} defaultOpen={index === 0}>
                    <ToolHeader
                      state={toolCall.error ? "output-error" : "output-available"}
                      title={toolCall.toolName}
                      type={`tool-${toolCall.toolName}` as `tool-${string}`}
                    />
                    <ToolContent>
                      <ToolInput input={toolCall.arguments} />
                      <ToolOutput
                        errorText={toolCall.error}
                        output={toolCall.result}
                      />
                    </ToolContent>
                  </Tool>
                ))}
              </div>
            )}

            {/* AI Response */}
            {latestAttempt.aiResponse && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MessageSquareIcon className="size-3" />
                  Response
                </div>
                <div className="rounded-md border bg-muted/50 p-2 text-xs text-foreground whitespace-pre-wrap">
                  {latestAttempt.aiResponse}
                </div>
              </div>
            )}

            {/* Error */}
            {latestAttempt.error && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-2 text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">Error:</span> {latestAttempt.error}
              </div>
            )}
          </CollapsibleContent>
        )}
      </Collapsible>
    </QueueItem>
  );
}
