"use client";

import { Canvas } from "@/components/ai-elements/canvas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Node as FlowNode, Edge as FlowEdge, NodeTypes, EdgeTypes, EdgeProps, InternalNode, Node } from "@xyflow/react";
import { Handle, Position, BaseEdge, getBezierPath, useInternalNode, ReactFlowProvider } from "@xyflow/react";
import { 
  MessageSquareIcon, 
  BotIcon, 
  WalletIcon, 
  FileCodeIcon, 
  BlocksIcon, 
  CreditCardIcon,
  StarIcon,
  DollarSignIcon,
} from "lucide-react";
import Link from "next/link";

// Node data interface
interface PromoNodeData {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  href: string;
  chain: "bsv" | "eth" | "core" | "mnee";
  handles: { target: boolean; source: boolean };
  [key: string]: unknown;
}

// Layout constants
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 60;

// Helper to get handle coordinates
const getHandleCoordsByPosition = (
  node: InternalNode<Node>,
  handlePosition: Position
) => {
  const handleType = handlePosition === Position.Left ? "target" : "source";
  const handle = node.internals.handleBounds?.[handleType]?.find(
    (h) => h.position === handlePosition
  );

  if (!handle) {
    return [0, 0] as const;
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  switch (handlePosition) {
    case Position.Left:
      offsetX = 0;
      break;
    case Position.Right:
      offsetX = handle.width;
      break;
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

// Animated edge with flowing dot
function AnimatedEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  // Determine handle positions based on node positions
  const sourcePos = sourceNode.internals.positionAbsolute;
  const targetPos = targetNode.internals.positionAbsolute;
  
  let sourcePosition = Position.Right;
  let targetPosition = Position.Left;
  
  // If target is below source, use bottom/top handles
  if (Math.abs(targetPos.y - sourcePos.y) > 50 && Math.abs(targetPos.x - sourcePos.x) < 100) {
    sourcePosition = Position.Bottom;
    targetPosition = Position.Top;
  }

  const [sx, sy] = getHandleCoordsByPosition(sourceNode, sourcePosition);
  const [tx, ty] = getHandleCoordsByPosition(targetNode, targetPosition);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} markerEnd={markerEnd} path={edgePath} style={style} />
      <circle fill="var(--primary)" r="3">
        <animateMotion dur="2s" path={edgePath} repeatCount="indefinite" />
      </circle>
    </>
  );
}

// Promo node component
function PromoNode({ data }: { data: PromoNodeData }) {
  const { title, description, icon: Icon, iconSrc, href, chain, handles } = data;
  
  const chainColors = {
    core: "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30",
    bsv: "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30",
    eth: "border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/30",
    mnee: "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30",
  };

  const badgeColors = {
    core: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    bsv: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    eth: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    mnee: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  };

  const chainLabels = {
    core: "Core",
    bsv: "BSV",
    eth: "ETH",
    mnee: "MNEE",
  };

  return (
    <Link href={href}>
      <Card className={`relative size-full cursor-pointer border-2 transition-all hover:scale-105 hover:shadow-lg ${chainColors[chain]}`}>
        {handles.target && <Handle position={Position.Left} type="target" className="!bg-primary" />}
        {handles.source && <Handle position={Position.Right} type="source" className="!bg-primary" />}
        {handles.target && <Handle id="top" position={Position.Top} type="target" className="!bg-primary" />}
        {handles.source && <Handle id="bottom" position={Position.Bottom} type="source" className="!bg-primary" />}
        
        <CardHeader className="p-2 pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="rounded-md bg-primary/10 p-1">
                {iconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconSrc} alt={title} className="size-3.5" />
                ) : Icon ? (
                  <Icon className="size-3.5 text-primary" />
                ) : null}
              </div>
              <CardTitle className="text-xs font-semibold">{title}</CardTitle>
            </div>
            <Badge variant="secondary" className={`text-[8px] px-1 py-0 ${badgeColors[chain]}`}>
              {chainLabels[chain]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-[10px] text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// Start node (Qilinx center) with Star icon
function StartNode({ data }: { data: { handles: { target: boolean; source: boolean } } }) {
  return (
    <div className="flex items-center justify-center size-full">
      <div className="relative flex items-center justify-center size-14 rounded-full bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg">
        <StarIcon className="size-7" />
        {data.handles.source && <Handle position={Position.Right} type="source" className="!bg-white" />}
      </div>
    </div>
  );
}

// MNEE Ecosystem end node with Dollar icon - only incoming connections, no outgoing
function MneeNode({ data }: { data: { handles: { target: boolean; source: boolean } } }) {
  return (
    <div className="flex items-center justify-center size-full">
      <div className="relative flex flex-col items-center justify-center size-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
        <DollarSignIcon className="size-7" />
        {data.handles.target && <Handle position={Position.Left} type="target" className="!bg-white" />}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  promo: PromoNode,
  start: StartNode,
  mnee: MneeNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

// Calculate positions
const startX = 0;
const row1Y = 0;
const row2Y = NODE_HEIGHT + VERTICAL_GAP;
const col1X = 100;
const col2X = col1X + NODE_WIDTH + HORIZONTAL_GAP;
const col3X = col2X + NODE_WIDTH + HORIZONTAL_GAP;
const endX = col3X + NODE_WIDTH + HORIZONTAL_GAP;

// Define nodes and edges
const promoNodes: FlowNode[] = [
  // Start node (Qilinx)
  {
    id: "start",
    type: "start",
    position: { x: startX, y: (row1Y + row2Y) / 2 + NODE_HEIGHT / 2 - 28 },
    data: { handles: { target: false, source: true } },
    style: { width: 56, height: 56 },
  },
  // Top row - BSV Chain
  {
    id: "chat",
    type: "promo",
    position: { x: col1X, y: row1Y },
    data: {
      title: "AI Chat",
      description: "Chat with AI to manage MNEE",
      icon: MessageSquareIcon,
      href: "/chat",
      chain: "bsv",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  {
    id: "agents",
    type: "promo",
    position: { x: col2X, y: row1Y },
    data: {
      title: "AGI Agents",
      description: "Autonomous task execution",
      icon: BotIcon,
      href: "/agents",
      chain: "bsv",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  {
    id: "wallets",
    type: "promo",
    position: { x: col3X, y: row1Y },
    data: {
      title: "Wallets",
      description: "User & merchant wallets",
      icon: WalletIcon,
      href: "/account",
      chain: "bsv",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  // Bottom row - ETH Chain
  {
    id: "contracts",
    type: "promo",
    position: { x: col1X, y: row2Y },
    data: {
      title: "Smart Contracts",
      description: "Build & deploy contracts",
      icon: FileCodeIcon,
      href: "/eth-contracts-library",
      chain: "eth",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  {
    id: "dapps",
    type: "promo",
    position: { x: col2X, y: row2Y },
    data: {
      title: "DApps Builder",
      description: "No-code DApp creation",
      icon: BlocksIcon,
      href: "/eth-dapp-builder",
      chain: "eth",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  {
    id: "payment",
    type: "promo",
    position: { x: col3X, y: row2Y },
    data: {
      title: "Payment Gateway",
      description: "Accept MNEE payments",
      icon: CreditCardIcon,
      href: "/payment-gateway",
      chain: "eth",
      handles: { target: true, source: true },
    },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  },
  // End node (MNEE Ecosystem)
  {
    id: "mnee",
    type: "mnee",
    position: { x: endX, y: (row1Y + row2Y) / 2 + NODE_HEIGHT / 2 - 28 },
    data: { handles: { target: true, source: false } },
    style: { width: 56, height: 56 },
  },
];

const promoEdges: FlowEdge[] = [
  // From start to first nodes
  { id: "start-chat", source: "start", target: "chat", type: "animated" },
  { id: "start-contracts", source: "start", target: "contracts", type: "animated" },
  // Top row connections (BSV)
  { id: "chat-agents", source: "chat", target: "agents", type: "animated" },
  { id: "agents-wallets", source: "agents", target: "wallets", type: "animated" },
  { id: "wallets-mnee", source: "wallets", target: "mnee", type: "animated" },
  // Bottom row connections (ETH)
  { id: "contracts-dapps", source: "contracts", target: "dapps", type: "animated" },
  { id: "dapps-payment", source: "dapps", target: "payment", type: "animated" },
  { id: "payment-mnee", source: "payment", target: "mnee", type: "animated" },
];

export function PromoCanvas() {
  return (
    <div className="w-full h-[280px] rounded-xl border bg-muted/20 overflow-hidden">
      <ReactFlowProvider>
        <Canvas
          edges={promoEdges}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodes={promoNodes}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        />
      </ReactFlowProvider>
    </div>
  );
}
