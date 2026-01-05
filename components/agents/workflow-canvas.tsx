"use client";

import { Canvas } from "@/components/ai-elements/canvas";
import { Controls } from "@/components/ai-elements/controls";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusBadge, type TaskStatus } from "./status-badge";
import type { Node as FlowNode, Edge as FlowEdge, NodeTypes, EdgeTypes, EdgeProps, InternalNode, Node } from "@xyflow/react";
import { Handle, Position, BaseEdge, getBezierPath, getSimpleBezierPath, useInternalNode, ReactFlowProvider } from "@xyflow/react";
import { Maximize2Icon, BotIcon, PlayIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export interface WorkflowTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  order: number;
  agentId: string;
}

// Temporary edge (dashed) for vertical flow - uses useInternalNode for accurate positions
function VerticalTemporaryEdge({
  id,
  source,
  target,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const [sx, sy] = getVerticalHandleCoords(sourceNode, Position.Bottom);
  const [tx, ty] = getVerticalHandleCoords(targetNode, Position.Top);

  const [edgePath] = getSimpleBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: Position.Bottom,
    targetX: tx,
    targetY: ty,
    targetPosition: Position.Top,
  });

  return (
    <BaseEdge
      className="stroke-1 stroke-ring"
      id={id}
      path={edgePath}
      style={{ strokeDasharray: "5, 5" }}
    />
  );
}

// Helper to get handle coordinates for vertical flow
const getVerticalHandleCoords = (
  node: InternalNode<Node>,
  handlePosition: Position
) => {
  const handleType = handlePosition === Position.Top ? "target" : "source";
  const handle = node.internals.handleBounds?.[handleType]?.find(
    (h) => h.position === handlePosition
  );

  if (!handle) {
    return [0, 0] as const;
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  switch (handlePosition) {
    case Position.Top:
      offsetY = 0;
      break;
    case Position.Bottom:
      offsetY = handle.height;
      break;
    default:
      break;
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

  return [x, y] as const;
};

// Animated edge for vertical flow - uses useInternalNode for accurate positions
function VerticalAnimatedEdge({ 
  id, 
  source,
  target,
  markerEnd, 
  style 
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const [sx, sy] = getVerticalHandleCoords(sourceNode, Position.Bottom);
  const [tx, ty] = getVerticalHandleCoords(targetNode, Position.Top);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: Position.Bottom,
    targetX: tx,
    targetY: ty,
    targetPosition: Position.Top,
  });

  return (
    <>
      <BaseEdge id={id} markerEnd={markerEnd} path={edgePath} style={style} />
      <circle fill="var(--primary)" r="4">
        <animateMotion dur="2s" path={edgePath} repeatCount="indefinite" />
      </circle>
    </>
  );
}

interface WorkflowCanvasProps {
  tasks: WorkflowTask[];
  agents: Array<{ id: string; name: string }>;
}

interface TaskNodeData {
  task: WorkflowTask;
  agentName: string;
  handles: { target: boolean; source: boolean };
  [key: string]: unknown;
}

interface AgentGroupData {
  agentName: string;
  agentIndex: number;
  taskCount: number;
  [key: string]: unknown;
}

interface StartGroupData {
  [key: string]: unknown;
}

interface StartNodeData {
  hasTarget: boolean;
  [key: string]: unknown;
}

// Layout constants - vertical layout within each agent panel
const NODE_WIDTH = 320;
const NODE_HEIGHT = 100;
const NODE_VERTICAL_GAP = 40;
const GROUP_HEADER_HEIGHT = 48;
const GROUP_PADDING = 24;
const GROUP_GAP = 120;
const START_NODE_SIZE = 60;

// Job Start group node component
function StartGroupNode({ data }: { data: StartGroupData }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 w-full h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dashed border-inherit">
        <PlayIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium text-sm">Job Start</span>
      </div>
    </div>
  );
}

// Job Start node component
function StartNode({ data }: { data: StartNodeData }) {
  return (
    <div className="flex items-center justify-center size-full">
      <div className="relative flex items-center justify-center size-[60px] rounded-full bg-emerald-500 text-white shadow-md">
        <PlayIcon className="size-6 ml-1" />
        {data.hasTarget && <Handle position={Position.Bottom} type="source" />}
      </div>
    </div>
  );
}

// Agent group node component
function AgentGroupNode({ data }: { data: AgentGroupData }) {
  const { agentName, agentIndex, taskCount } = data;
  
  // Generate a color based on agent index
  const colors = [
    "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
    "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
    "border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30",
    "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30",
    "border-pink-300 bg-pink-50/50 dark:border-pink-800 dark:bg-pink-950/30",
    "border-cyan-300 bg-cyan-50/50 dark:border-cyan-800 dark:bg-cyan-950/30",
  ];
  const colorClass = colors[agentIndex % colors.length];

  return (
    <div className={`rounded-lg border-2 border-dashed ${colorClass} w-full h-full`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dashed border-inherit">
        <BotIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{agentName}</span>
        <span className="text-xs text-muted-foreground">
          ({taskCount} task{taskCount !== 1 ? "s" : ""})
        </span>
      </div>
    </div>
  );
}

// Custom TaskNode with top/bottom handles for vertical flow
function TaskNode({ data }: { data: TaskNodeData }) {
  const { task, handles } = data;

  return (
    <Card className={cn(
      "node-container relative size-full h-auto gap-0 rounded-md p-0",
    )}>
      {/* Top handle for incoming edge */}
      {handles.target && <Handle position={Position.Top} type="target" />}
      {/* Bottom handle for outgoing edge */}
      {handles.source && <Handle position={Position.Bottom} type="source" />}
      
      <CardHeader className="gap-0.5 rounded-t-md border-b bg-secondary p-3!">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="line-clamp-1 text-sm">{task.title}</CardTitle>
          <StatusBadge size="sm" status={task.status} />
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="p-3">
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

const nodeTypes: NodeTypes = {
  task: TaskNode,
  agentGroup: AgentGroupNode,
  startGroup: StartGroupNode,
  start: StartNode,
};

const edgeTypes: EdgeTypes = {
  animated: VerticalAnimatedEdge,
  temporary: VerticalTemporaryEdge,
};

export function WorkflowCanvas({ tasks, agents }: WorkflowCanvasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const getAgentName = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      return agent?.name || "Unknown Agent";
    },
    [agents]
  );

  const { nodes, edges } = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
    
    // Group tasks by agent while preserving order
    const agentTaskGroups = new Map<string, WorkflowTask[]>();
    const agentOrder: string[] = [];
    
    for (const task of sortedTasks) {
      if (!agentTaskGroups.has(task.agentId)) {
        agentTaskGroups.set(task.agentId, []);
        agentOrder.push(task.agentId);
      }
      agentTaskGroups.get(task.agentId)!.push(task);
    }

    const flowNodes: FlowNode[] = [];
    const flowEdges: FlowEdge[] = [];
    
    // Calculate start group dimensions
    const startGroupWidth = START_NODE_SIZE + GROUP_PADDING * 2;
    const startGroupHeight = GROUP_HEADER_HEIGHT + GROUP_PADDING * 2 + START_NODE_SIZE;
    
    // Create Job Start group node
    flowNodes.push({
      id: "group-start",
      type: "startGroup",
      position: { x: 0, y: 0 },
      data: {},
      style: { width: startGroupWidth, height: startGroupHeight },
      selectable: false,
      draggable: false,
    });
    
    // Create Job Start node inside the group
    flowNodes.push({
      id: "start-node",
      type: "start",
      position: { 
        x: GROUP_PADDING, 
        y: GROUP_HEADER_HEIGHT + GROUP_PADDING 
      },
      parentId: "group-start",
      extent: "parent" as const,
      style: { width: START_NODE_SIZE, height: START_NODE_SIZE },
      data: {
        hasTarget: sortedTasks.length > 0,
      },
    });

    let currentX = startGroupWidth + GROUP_GAP;

    // Create agent group nodes and task nodes
    agentOrder.forEach((agentId, agentIndex) => {
      const agentTasks = agentTaskGroups.get(agentId)!;
      const agentName = getAgentName(agentId);
      
      // Calculate group dimensions - vertical layout
      const groupWidth = NODE_WIDTH + GROUP_PADDING * 2;
      const groupHeight = GROUP_HEADER_HEIGHT + GROUP_PADDING * 2 + 
        agentTasks.length * NODE_HEIGHT + (agentTasks.length - 1) * NODE_VERTICAL_GAP;
      
      // Create agent group node
      const groupId = `group-${agentId}`;
      flowNodes.push({
        id: groupId,
        type: "agentGroup",
        position: { x: currentX, y: 0 },
        data: {
          agentName,
          agentIndex,
          taskCount: agentTasks.length,
        },
        style: { width: groupWidth, height: groupHeight },
        selectable: false,
        draggable: false,
      });

      // Create task nodes inside the group - stacked vertically
      agentTasks.forEach((task, taskIndex) => {
        const globalIndex = sortedTasks.findIndex(t => t.id === task.id);
        
        flowNodes.push({
          id: task.id,
          type: "task",
          position: { 
            x: GROUP_PADDING, 
            y: GROUP_HEADER_HEIGHT + GROUP_PADDING + taskIndex * (NODE_HEIGHT + NODE_VERTICAL_GAP)
          },
          parentId: groupId,
          extent: "parent" as const,
          style: { width: NODE_WIDTH },
          data: {
            task,
            agentName,
            handles: {
              target: true, // All tasks have target handle (first one connects from start)
              source: globalIndex < sortedTasks.length - 1,
            },
          },
        });
      });

      currentX += groupWidth + GROUP_GAP;
    });

    // Create edge from start node to first task
    if (sortedTasks.length > 0) {
      flowEdges.push({
        id: `start-${sortedTasks[0].id}`,
        source: "start-node",
        target: sortedTasks[0].id,
        sourceHandle: null,
        targetHandle: null,
        type: "animated", // Always animated from start
      });
    }

    // Create edges between tasks (in order) - using top/bottom handles
    sortedTasks.slice(0, -1).forEach((task, index) => {
      const nextTask = sortedTasks[index + 1];
      
      const isSourceCompleted = task.status === "completed";
      const isSourceRunning = task.status === "running";
      const useAnimated = isSourceCompleted || isSourceRunning;

      flowEdges.push({
        id: `${task.id}-${nextTask.id}`,
        source: task.id,
        target: nextTask.id,
        sourceHandle: null,
        targetHandle: null,
        type: useAnimated ? "animated" : "temporary",
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [tasks, getAgentName]);

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/20">
        <p className="text-muted-foreground text-sm">
          No tasks to visualize yet
        </p>
      </div>
    );
  }

  const CanvasContent = ({ height = "h-full" }: { height?: string }) => (
    <div className={height}>
      <ReactFlowProvider>
        <Canvas
          edges={edges}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodes={nodes}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Controls showInteractive={false} />
        </Canvas>
      </ReactFlowProvider>
    </div>
  );

  return (
    <>
      <div className="relative rounded-lg border">
        {/* Header with expand button */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-7 gap-1.5 text-xs"
          >
            <Maximize2Icon className="size-3.5" />
            Expand
          </Button>
        </div>
        
        {/* Canvas */}
        <div className="h-80">
          <CanvasContent />
        </div>
      </div>

      {/* Full-size Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Workflow Canvas</DialogTitle>
          </DialogHeader>
          <div className="flex-1">
            {isModalOpen && <CanvasContent />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
