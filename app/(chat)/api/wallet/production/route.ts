import { auth } from "@/app/(auth)/auth";
import { userWalletService } from "@/lib/mnee/user-wallet-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/wallet/production - Get user production wallet info
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const walletInfo = await userWalletService.getProductionWalletInfo(session.user.id);
    
    return Response.json({
      hasWallet: !!walletInfo,
      wallet: walletInfo,
    });
  } catch (error) {
    console.error('Failed to get production wallet info:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get production wallet info"
    ).toResponse();
  }
}

/**
 * POST /api/wallet/production - Create new production wallet
 */
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const result = await userWalletService.createProductionWallet(session.user.id);
    
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
    
    console.error('Failed to create production wallet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to create production wallet"
    ).toResponse();
  }
}
