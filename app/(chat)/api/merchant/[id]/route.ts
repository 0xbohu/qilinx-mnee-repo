import { auth } from "@/app/(auth)/auth";
import { merchantWalletService } from "@/lib/mnee/merchant-wallet-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/merchant/[id] - Get specific merchant wallet
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
    
    return Response.json({ wallet });
  } catch (error) {
    console.error('Failed to get merchant wallet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get merchant wallet"
    ).toResponse();
  }
}

/**
 * DELETE /api/merchant/[id] - Delete merchant wallet
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { id } = await params;
    const result = await merchantWalletService.deleteMerchantWallet(
      session.user.id,
      id
    );

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 404 }
      );
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete merchant wallet:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to delete merchant wallet"
    ).toResponse();
  }
}
