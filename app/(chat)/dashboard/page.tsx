import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { PageHeader } from "@/components/ui/page-header";
import { 
  MessageSquare, 
  User, 
  Store, 
  Bot, 
  FileCode, 
  LayoutDashboard as LayoutDashboardIcon,
  CreditCard,
  ArrowRight
} from "lucide-react";

interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function QuickAction({ href, icon, title, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 hover:bg-accent hover:border-primary/20 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <PageHeader
        icon="layout-dashboard"
        title="Qilin | MNEE Dashboard"
        description={`Welcome back! Signed in as ${session.user.email}`}
      />

      {/* BSV Chain Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm font-medium text-muted-foreground">BSV Chain</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            href="/chat"
            icon={<MessageSquare className="h-5 w-5" />}
            title="Chats"
            description="Start a conversation with the AI assistant"
          />
          <QuickAction
            href="/agents"
            icon={<Bot className="h-5 w-5" />}
            title="AGI Agents"
            description="Create and manage autonomous AI agents"
          />
          <QuickAction
            href="/account"
            icon={<User className="h-5 w-5" />}
            title="My Account"
            description="Manage your profile, wallet, and API tokens"
          />
          <QuickAction
            href="/merchants"
            icon={<Store className="h-5 w-5" />}
            title="Merchant Accounts"
            description="Create and manage merchant wallets"
          />
        </div>
      </div>

      {/* ETH Chain Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm font-medium text-muted-foreground">ETH Chain</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            href="/eth-contracts-library"
            icon={<FileCode className="h-5 w-5" />}
            title="Contracts Builder"
            description="Build and deploy smart contracts integrated with MNEE token"
          />
          <QuickAction
            href="/eth-dapp-builder"
            icon={<LayoutDashboardIcon className="h-5 w-5" />}
            title="DApps Builder"
            description="Create public MNEE DApps "
          />
          <QuickAction
            href="/payment-gateway"
            icon={<CreditCard className="h-5 w-5" />}
            title="Payment Gateway"
            description="Extenral Integration for MNEE Payment Gateway"
          />
        </div>
      </div>
    </div>
  );
}
