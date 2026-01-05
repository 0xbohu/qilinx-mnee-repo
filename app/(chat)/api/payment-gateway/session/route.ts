// API route for creating payment sessions via MNEE Payment Gateway
import { auth } from "@/app/(auth)/auth";
import { createPaymentSession } from "@/lib/payment-gateway/payment-gateway-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contractAddress, network, amount, returnUrl, orderId, customerEmail, metadata } = body;

    // Validate required fields
    if (!contractAddress || !network || !amount) {
      return Response.json(
        { error: { code: "INVALID_REQUEST", message: "Missing required fields: contractAddress, network, amount" } },
        { status: 400 }
      );
    }

    // Validate network
    if (!["mainnet", "sepolia"].includes(network)) {
      return Response.json(
        { error: { code: "INVALID_PARAMS", message: "Invalid network. Must be 'mainnet' or 'sepolia'" } },
        { status: 400 }
      );
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return Response.json(
        { error: { code: "INVALID_PARAMS", message: "Invalid contract address format" } },
        { status: 400 }
      );
    }

    // Create payment session via MNEE Gateway
    const result = await createPaymentSession(network, contractAddress, {
      amount,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment-gateway?status=complete`,
      orderId,
      customerEmail,
      metadata,
    });

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      session: result.session,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error("Error creating payment session:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create payment session" } },
      { status: 500 }
    );
  }
}
