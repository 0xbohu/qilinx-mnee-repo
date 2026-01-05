import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { mcpTools } from "./schema";

config({
  path: ".env.local",
});

const seedMCP = async () => {
  if (!process.env.POSTGRES_URL) {
    console.log("⏭️  POSTGRES_URL not defined, skipping seed");
    process.exit(0);
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Seeding MCP tools...");

  try {
    await db.insert(mcpTools).values({
      name: "MNEE Wallet Tools",
      description: "Wallet tools for checking balance, transferring tokens, and managing merchant wallets",
      host: "https://qilin-mcp-mnee.vercel.app/api/mcp",
      isActive: true,
    });
    console.log("✅ MCP tools seeded successfully");
  } catch (error: any) {
    if (error.code === "23505") {
      console.log("ℹ️  MCP tool already exists, skipping");
    } else {
      throw error;
    }
  }

  process.exit(0);
};

seedMCP().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
