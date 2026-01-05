import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { MerchantWalletsList } from "@/components/merchant-wallets-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function MerchantsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <PageHeader
        icon="store"
        title="Merchant Accounts"
        description="Create and manage merchant wallets for receiving MNEE payments. Generate QR codes and track incoming transactions."
      />

      <MerchantWalletsList />
    </div>
  );
}
