import { auth } from "@/app/(auth)/auth";
import { userWalletService } from "@/lib/mnee/user-wallet-service";
import { mneeAuthService } from "@/lib/mnee/auth-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * POST /api/wallet/faucet - Request sandbox faucet tokens
 * Requires OAuth token from MNEE Developer Portal auth flow
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return Response.json({
        success: false,
        message: 'OAuth token is required. Please authenticate with MNEE first.',
      }, { status: 400 });
    }

    const walletInfo = await userWalletService.getWalletInfo(session.user.id);
    
    if (!walletInfo) {
      return new ChatSDKError(
        "bad_request:api",
        "User does not have a wallet"
      ).toResponse();
    }

    // Check 24-hour cooldown
    const { canRequest, timeUntil } = await userWalletService.canRequestFaucet(session.user.id);
    
    if (!canRequest) {
      return Response.json({
        success: false,
        message: `Faucet available in ${timeUntil}`,
        timeUntil,
      }, { status: 429 });
    }

    const result = await mneeAuthService.requestFaucet(token, walletInfo.address);
    
    // Handle rate limiting from MNEE API
    if (result.rateLimited) {
      // Also record locally so we don't keep hitting MNEE API
      await userWalletService.recordFaucetRequest(session.user.id);
      
      return Response.json({
        success: false,
        rateLimited: true,
        message: result.message || 'Faucet rate limited',
        timeRemaining: result.timeRemaining,
      }, { status: 429 });
    }
    
    if (!result.success) {
      return Response.json({
        success: false,
        message: result.message || 'Faucet request failed',
      }, { status: 400 });
    }

    // Record successful faucet request
    await userWalletService.recordFaucetRequest(session.user.id);

    return Response.json({
      success: true,
      txid: result.txid,
      amount: result.amount,
      message: `Received ${result.amount} MNEE tokens`,
    });
  } catch (error) {
    console.error('Failed to request faucet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to request faucet tokens"
    ).toResponse();
  }
}
