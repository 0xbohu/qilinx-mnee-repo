// API route for fetching payment-type contracts
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { userContract, contractTemplate } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch user contracts that are payment type
    // Join with contract template to filter by category
    const contracts = await db
      .select({
        id: userContract.id,
        name: userContract.name,
        contractAddress: userContract.contractAddress,
        network: userContract.network,
        deployedAt: userContract.deployedAt,
        templateId: userContract.templateId,
      })
      .from(userContract)
      .leftJoin(contractTemplate, eq(userContract.templateId, contractTemplate.id))
      .where(
        and(
          eq(userContract.userId, session.user.id),
          eq(contractTemplate.category, "payment")
        )
      );

    return Response.json({
      contracts: contracts.map((c) => ({
        id: c.id,
        name: c.name,
        contractAddress: c.contractAddress,
        network: c.network,
        deployedAt: c.deployedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching payment contracts:", error);
    return Response.json(
      { error: "Failed to fetch payment contracts" },
      { status: 500 }
    );
  }
}
