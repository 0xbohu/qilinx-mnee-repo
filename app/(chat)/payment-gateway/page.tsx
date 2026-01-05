import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";
import { PaymentGatewayClient } from "@/components/payment-gateway/payment-gateway-client";

export default async function PaymentGatewayPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <PaymentGatewayClient />;
}
