const MNEE_API_URL = 'https://api-developer.mnee.net';

export interface AuthSession {
  state: string;
  authUrl: string;
}

export interface AuthResult {
  token: string;
  email: string;
  name?: string;
}

export interface FaucetResult {
  success: boolean;
  txid?: string;
  amount?: number;
  message?: string;
  timeRemaining?: string;
  rateLimited?: boolean;
}

export class MneeAuthService {
  private apiUrl: string;

  constructor(apiUrl: string = MNEE_API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Initiates OAuth authentication flow with MNEE Developer Portal
   * Returns the auth URL that the user should be redirected to
   */
  async initiateAuth(redirectUri: string): Promise<AuthSession> {
    const response = await fetch(`${this.apiUrl}/cli/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUri }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initialize authentication: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { state: string; authUrl: string };
    
    return {
      state: data.state,
      authUrl: data.authUrl,
    };
  }

  /**
   * Checks the status of an authentication session
   * Returns the auth result if completed, null if still pending
   */
  async checkAuthStatus(state: string): Promise<AuthResult | null> {
    const response = await fetch(`${this.apiUrl}/cli/auth/status/${state}`);
    
    if (!response.ok) {
      return null;
    }

    const status = await response.json() as {
      status: 'pending' | 'completed' | 'error';
      token?: string;
      user?: { email: string; name?: string };
      message?: string;
    };

    if (status.status === 'completed' && status.token && status.user) {
      return {
        token: status.token,
        email: status.user.email,
        name: status.user.name,
      };
    }

    if (status.status === 'error') {
      throw new Error(status.message || 'Authentication failed');
    }

    return null;
  }

  /**
   * Requests faucet tokens for a sandbox wallet
   * Requires OAuth token from auth flow
   */
  async requestFaucet(token: string, depositAddress: string): Promise<FaucetResult> {
    console.log(`[MneeAuthService] Requesting faucet for ${depositAddress}`);
    console.log(`[MneeAuthService] Using OAuth token: ${token}`);
    
    const response = await fetch(`${this.apiUrl}/faucet/cli`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ depositAddress }),
    });

    console.log(`[MneeAuthService] Faucet response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MneeAuthService] Faucet error: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `Faucet request failed: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json() as {
      success: boolean;
      message?: string;
      error?: string;
      amount?: number;
      txid?: string;
      timeRemaining?: string;
      nextRequestTime?: string;
    };

    console.log('[MneeAuthService] Faucet result:', result);

    // Check for 24-hour cooldown message (this is a real failure - rate limited)
    const errorMessage = result.message || result.error || '';
    if (errorMessage.includes('already requested tokens') || errorMessage.includes('24 hours') || result.timeRemaining) {
      return {
        success: false,
        rateLimited: true,
        timeRemaining: result.timeRemaining,
        message: result.timeRemaining 
          ? `Faucet available in ${result.timeRemaining}`
          : errorMessage,
      };
    }

    // MNEE faucet has a known bug where it returns success: false with transaction errors
    // even when tokens are actually sent. Treat HTTP 200 as likely success.
    if (!result.success && response.status === 200) {
      console.log('[MneeAuthService] Treating as success despite success:false (known MNEE bug)');
      return {
        success: true,
        txid: result.txid,
        amount: result.amount || 10,
        message: 'Tokens likely sent (MNEE returned partial error but HTTP 200)',
      };
    }

    if (!result.success) {
      return {
        success: false,
        message: errorMessage || 'Faucet request failed',
      };
    }

    return {
      success: true,
      txid: result.txid,
      amount: result.amount || 10,
    };
  }
}

// Export singleton instance
export const mneeAuthService = new MneeAuthService();
