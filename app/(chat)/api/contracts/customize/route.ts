// API route for AI-assisted contract customization
// Task 7.4: Customize API route with streaming

import { streamText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { getTemplateById } from "@/lib/contracts/template-service";
import { getMneeAddress } from "@/lib/contracts/network-config";
import type { EthereumNetwork, ConstructorParam } from "@/lib/db/schema";

const SYSTEM_PROMPT = `You are an expert Solidity smart contract developer specializing in DeFi contracts that integrate with the MNEE token (an ERC20 token with 2 decimals).

Your role is to help users customize smart contract templates for their specific needs. You should:
1. Ask clarifying questions about their requirements
2. Explain what each customization option does
3. Generate the final customized Solidity code when ready

Important guidelines:
- MNEE token uses 2 decimals (not 18 like most ERC20 tokens)
- Always use SafeERC20 for token transfers
- Include proper access control (Ownable)
- Add reentrancy protection where needed
- Keep gas efficiency in mind
- Add clear comments explaining the code

When the user is ready to deploy, output the complete Solidity contract code in a code block with the contract name clearly indicated.`;

function buildTemplateContext(
  templateName: string,
  templateDescription: string,
  sourceCode: string,
  constructorParams: ConstructorParam[] | null,
  network: EthereumNetwork
): string {
  const mneeAddress = getMneeAddress(network);
  const paramsInfo = constructorParams
    ? constructorParams.map(p => `- ${p.name} (${p.type}): ${p.description}${p.defaultValue ? ` [default: ${p.defaultValue}]` : ""}`).join("\n")
    : "No constructor parameters";

  return `
## Selected Template: ${templateName}
${templateDescription}

## Target Network: ${network}
MNEE Token Address: ${mneeAddress}

## Constructor Parameters:
${paramsInfo}

## Template Source Code:
\`\`\`solidity
${sourceCode}
\`\`\`
`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, network, messages, modelId } = body;

    if (!templateId || !network || !messages) {
      return Response.json(
        { error: "Missing templateId, network, or messages" },
        { status: 400 }
      );
    }

    // Fetch template
    const template = await getTemplateById(templateId);
    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Build context
    const templateContext = buildTemplateContext(
      template.name,
      template.description,
      template.soliditySourceCode,
      template.constructorParamsSchema,
      network as EthereumNetwork
    );

    const systemPrompt = `${SYSTEM_PROMPT}\n\n${templateContext}`;

    // Stream AI response - use provided model or default to gemini-3-pro-preview
    const selectedModel = modelId || "google/gemini-3-pro-preview";
    const result = streamText({
      model: getLanguageModel(selectedModel),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Customization error:", error);
    return Response.json(
      { error: "Failed to process customization request" },
      { status: 500 }
    );
  }
}
