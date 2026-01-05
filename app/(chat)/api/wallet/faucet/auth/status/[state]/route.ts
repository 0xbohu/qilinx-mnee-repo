import { auth } from "@/app/(auth)/auth";
import { mneeAuthService } from "@/lib/mnee/auth-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/wallet/faucet/auth/status/[state] - Check OAuth status
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { state } = await params;
    const result = await mneeAuthService.checkAuthStatus(state);

    if (result) {
      return Response.json({
        status: 'completed',
        token: result.token,
        email: result.email,
        name: result.name,
      });
    }

    return Response.json({ status: 'pending' });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return Response.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}
