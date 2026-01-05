// Payment Gateway Service
// Handles communication with the MNEE Payment Gateway API

const GATEWAY_BASE_URL = "https://mnee-payment-gateway.vercel.app";

export type PaymentSessionStatus =
  | "pending"
  | "wallet_connected"
  | "approval_pending"
  | "approval_confirmed"
  | "payment_pending"
  | "payment_confirmed"
  | "failed"
  | "expired";

export interface PaymentSession {
  id: string;
  amount: string;
  currency: string;
  network: string;
  status: PaymentSessionStatus;
  expiresAt: string;
  orderId?: string;
  walletAddress?: string;
  paymentTxHash?: string;
  createdAt?: string;
}

export interface CreateSessionRequest {
  amount: string;
  currency?: string;
  orderId?: string;
  returnUrl: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  success: boolean;
  session?: PaymentSession;
  paymentUrl?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface SessionStatusResponse {
  session: PaymentSession;
  isPaid: boolean;
  isExpired: boolean;
  isFailed: boolean;
}

export async function createPaymentSession(
  network: string,
  contractAddress: string,
  request: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const url = `${GATEWAY_BASE_URL}/api/payment/${network}/${contractAddress}/session`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency || "MNEE",
        orderId: request.orderId,
        returnUrl: request.returnUrl,
        customerEmail: request.customerEmail,
        metadata: request.metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          code: "UNKNOWN_ERROR",
          message: "Failed to create payment session",
        },
      };
    }

    return {
      success: true,
      session: data.session,
      paymentUrl: data.paymentUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function getSessionStatus(
  sessionId: string
): Promise<SessionStatusResponse | null> {
  const url = `${GATEWAY_BASE_URL}/api/session/${sessionId}/status`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get session status:", error);
    return null;
  }
}

export function isTerminalStatus(status: PaymentSessionStatus): boolean {
  return ["payment_confirmed", "failed", "expired"].includes(status);
}

export function getStatusCategory(
  status: PaymentSessionStatus
): "pending" | "in-progress" | "success" | "error" {
  switch (status) {
    case "pending":
      return "pending";
    case "wallet_connected":
    case "approval_pending":
    case "approval_confirmed":
    case "payment_pending":
      return "in-progress";
    case "payment_confirmed":
      return "success";
    case "failed":
    case "expired":
      return "error";
    default:
      return "pending";
  }
}
