import { auth } from "@/app/(auth)/auth";
import { merchantWalletService } from "@/lib/mnee/merchant-wallet-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/merchant - List all merchant wallets for user
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const wallets = await merchantWalletService.getMerchantWallets(session.user.id);
    
    return Response.json({
      wallets,
    });
  } catch (error) {
    console.error('Failed to get merchant wallets:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get merchant wallets"
    ).toResponse();
  }
}

/**
 * POST /api/merchant - Create new merchant wallet
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const body = await request.json();
    const { name, description, network } = body;

    if (!name || typeof name !== 'string') {
      return Response.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return Response.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Validate network if provided
    const walletNetwork = network === 'mainnet' ? 'mainnet' : 'sandbox';

    const result = await merchantWalletService.createMerchantWallet(
      session.user.id,
      name,
      description,
      walletNetwork
    );

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return Response.json({
      success: true,
      wallet: result.wallet,
    });
  } catch (error) {
    console.error('Failed to create merchant wallet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to create merchant wallet"
    ).toResponse();
  }
}
