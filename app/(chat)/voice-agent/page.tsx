import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { PageHeader } from "@/components/ui/page-header";
import { VoiceAgentClient } from "@/components/voice-agent/voice-agent-client";

export default async function VoiceAgentPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <PageHeader
        icon="mic"
        title="Voice Agent"
        description="Talk to your MNEE assistant using voice"
      />
      <VoiceAgentClient userId={session.user.id} />
    </div>
  );
}
