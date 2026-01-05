import { auth } from "@/app/(auth)/auth";
import { merchantWalletService } from "@/lib/mnee/merchant-wallet-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/merchant/[id]/balance - Get balance for specific merchant wallet
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { id } = await params;
    
    // First verify the wallet belongs to the user
    const wallet = await merchantWalletService.getMerchantWalletById(
      session.user.id,
      id
    );

    if (!wallet) {
      return Response.json(
        { error: "Merchant wallet not found" },
        { status: 404 }
      );
    }

    // Fetch balance
    const result = await merchantWalletService.getMerchantWalletBalance(wallet.address);
    
    if (result.error) {
      return Response.json(
        { 
          balance: result.balance,
          error: result.error,
          lastKnownBalance: result.balance,
        },
        { status: 502 }
      );
    }
    
    return Response.json({ balance: result.balance });
  } catch (error) {
    console.error('Failed to get merchant wallet balance:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get merchant wallet balance"
    ).toResponse();
  }
}
