import { auth } from "@/app/(auth)/auth";
import { userWalletService } from "@/lib/mnee/user-wallet-service";
import { createTransferService } from "@/lib/mnee/transfer-service";
import { formatMneeWithSymbol } from "@/lib/mnee/amount-utils";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/wallet/balance - Get wallet balance
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const walletInfo = await userWalletService.getWalletInfo(session.user.id);
    
    if (!walletInfo) {
      return new ChatSDKError(
        "bad_request:api",
        "User does not have a wallet"
      ).toResponse();
    }

    // Get fresh balance from MNEE API
    const transferService = createTransferService('sandbox');
    
    try {
      const balance = await transferService.getBalance(walletInfo.address);
      
      return Response.json({
        address: walletInfo.address,
        balance: balance.decimalAmount,
        balanceFormatted: formatMneeWithSymbol(balance.decimalAmount),
        atomicAmount: balance.amount,
      });
    } catch (balanceError) {
      console.error('Failed to fetch balance from MNEE API:', balanceError);
      
      // Return cached/default balance on API failure
      return Response.json({
        address: walletInfo.address,
        balance: 0,
        balanceFormatted: '0.00000 MNEE',
        atomicAmount: 0,
        error: 'Failed to fetch live balance',
      });
    }
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get wallet balance"
    ).toResponse();
  }
}
