"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Play, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { PaymentContract } from "./payment-gateway-client";

const GATEWAY_URL = "https://mnee-payment-gateway.vercel.app";

interface IntegrationDetailsPanelProps {
  contract: PaymentContract;
  onTestPayment: () => void;
}

export function IntegrationDetailsPanel({
  contract,
  onTestPayment,
}: IntegrationDetailsPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const sessionEndpoint = `${GATEWAY_URL}/api/payment/${contract.network}/${contract.contractAddress}/session`;
  const statusEndpoint = `${GATEWAY_URL}/api/session/{sessionId}/status`;

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const javascriptCode = `// Create payment session
const response = await fetch(
  '${sessionEndpoint}',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: '10.00',
      currency: 'MNEE',
      orderId: 'your-order-id',
      returnUrl: 'https://your-app.com/checkout/complete'
    })
  }
);
const { paymentUrl, session } = await response.json();

// Redirect user to payment page
window.location.href = paymentUrl;

// Or embed in iframe
// <iframe src={paymentUrl} width="100%" height="600" />

// Verify payment status
const statusRes = await fetch(
  \`${GATEWAY_URL}/api/session/\${session.id}/status\`
);
const { isPaid } = await statusRes.json();`;

  const pythonCode = `import requests

GATEWAY_URL = "${GATEWAY_URL}"
NETWORK = "${contract.network}"
CONTRACT_ADDRESS = "${contract.contractAddress}"

def create_payment_session(order_id: str, amount: str, return_url: str):
    response = requests.post(
        f"{GATEWAY_URL}/api/payment/{NETWORK}/{CONTRACT_ADDRESS}/session",
        json={
            "amount": amount,
            "currency": "MNEE",
            "orderId": order_id,
            "returnUrl": return_url
        }
    )
    return response.json()

def verify_payment(session_id: str) -> bool:
    response = requests.get(
        f"{GATEWAY_URL}/api/session/{session_id}/status"
    )
    data = response.json()
    return data.get("isPaid", False)

# Usage
result = create_payment_session("order-123", "10.00", "https://your-app.com/complete")
payment_url = result["paymentUrl"]
# Redirect user to payment_url`;

  const curlCode = `# Create payment session
curl -X POST '${sessionEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": "10.00",
    "currency": "MNEE",
    "orderId": "your-order-id-123",
    "returnUrl": "https://your-app.com/checkout/complete"
  }'

# Response:
# {
#   "success": true,
#   "session": { "id": "...", "status": "pending" },
#   "paymentUrl": "${GATEWAY_URL}/pay/{sessionId}"
# }

# Verify payment status
curl '${GATEWAY_URL}/api/session/{sessionId}/status'`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Integration Details</CardTitle>
            <CardDescription>
              Connect external systems to accept MNEE payments via {contract.name}
            </CardDescription>
          </div>
          <Button onClick={onTestPayment}>
            <Play className="h-4 w-4 mr-2" />
            Test Payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Endpoints */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">API Endpoints</h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">POST</Badge>
              <span className="text-sm font-medium">Create Payment Session</span>
            </div>
            <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
              <code className="text-xs flex-1 break-all">{sessionEndpoint}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => copyToClipboard(sessionEndpoint, "session")}
              >
                {copiedSection === "session" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">GET</Badge>
              <span className="text-sm font-medium">Check Session Status</span>
            </div>
            <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
              <code className="text-xs flex-1 break-all">{statusEndpoint}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => copyToClipboard(statusEndpoint, "status")}
              >
                {copiedSection === "status" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Request Parameters */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Request Parameters</h3>
          <div className="text-sm space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium">Parameter</div>
              <div className="font-medium">Required</div>
              <div className="font-medium">Description</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>amount</code>
              <span>Yes</span>
              <span>Payment amount (e.g., "10.00")</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>returnUrl</code>
              <span>Yes</span>
              <span>URL to redirect after payment</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>orderId</code>
              <span>No</span>
              <span>Your internal order reference</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>currency</code>
              <span>No</span>
              <span>Currency code (default: "MNEE")</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>customerEmail</code>
              <span>No</span>
              <span>Customer's email address</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <code>metadata</code>
              <span>No</span>
              <span>Custom JSON data to store</span>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Code Examples</h3>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="javascript" className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(javascriptCode, "js")}
              >
                {copiedSection === "js" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                <code>{javascriptCode}</code>
              </pre>
            </TabsContent>
            <TabsContent value="python" className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(pythonCode, "py")}
              >
                {copiedSection === "py" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                <code>{pythonCode}</code>
              </pre>
            </TabsContent>
            <TabsContent value="curl" className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(curlCode, "curl")}
              >
                {copiedSection === "curl" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                <code>{curlCode}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </div>

        {/* Session Status Values */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Session Status Values</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50">pending</Badge>
              <span className="text-muted-foreground">Waiting for user</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">wallet_connected</Badge>
              <span className="text-muted-foreground">Wallet connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">approval_pending</Badge>
              <span className="text-muted-foreground">Approval submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">approval_confirmed</Badge>
              <span className="text-muted-foreground">Approval confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">payment_pending</Badge>
              <span className="text-muted-foreground">Payment submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">payment_confirmed</Badge>
              <span className="text-muted-foreground">Payment successful ✓</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50">failed</Badge>
              <span className="text-muted-foreground">Payment failed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-50">expired</Badge>
              <span className="text-muted-foreground">Session expired</span>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="pt-4 border-t">
          <a
            href="https://mnee-payment-gateway.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View full documentation <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
