import { auth } from "@/app/(auth)/auth";
import { mneeAuthService } from "@/lib/mnee/auth-service";
import { ChatSDKError } from "@/lib/errors";

/**
 * POST /api/wallet/faucet/auth/init - Initialize OAuth flow for faucet
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const body = await request.json();
    const redirectUri = body.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wallet/faucet/auth/callback`;

    const authSession = await mneeAuthService.initiateAuth(redirectUri);

    return Response.json({
      state: authSession.state,
      authUrl: authSession.authUrl,
    });
  } catch (error) {
    console.error('Failed to initialize faucet auth:', error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to initialize authentication"
    ).toResponse();
  }
}
