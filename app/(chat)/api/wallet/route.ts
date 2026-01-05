import { auth } from "@/app/(auth)/auth";
import { userWalletService } from "@/lib/mnee/user-wallet-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/wallet - Get user wallet info
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const walletInfo = await userWalletService.getWalletInfo(session.user.id);
    
    return Response.json({
      hasWallet: !!walletInfo,
      wallet: walletInfo,
    });
  } catch (error) {
    console.error('Failed to get wallet info:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get wallet info"
    ).toResponse();
  }
}

/**
 * POST /api/wallet - Create new wallet
 */
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const result = await userWalletService.createWallet(session.user.id);
    
    return Response.json({
      success: true,
      address: result.address,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already has')) {
      return new ChatSDKError(
        "bad_request:api",
        error.message
      ).toResponse();
    }
    
    console.error('Failed to create wallet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to create wallet"
    ).toResponse();
  }
}
