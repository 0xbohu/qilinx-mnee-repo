import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PaymentSimulatorPage({ params }: PageProps) {
  const { sessionId } = await params;
  
  if (!sessionId) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="rounded-lg border bg-card p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Simulator</h1>
        <p className="text-muted-foreground">
          Session ID: {sessionId}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          This page simulates a payment flow for testing purposes.
        </p>
      </div>
    </div>
  );
}
