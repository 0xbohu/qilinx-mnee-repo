// Template service for fetching contract templates from database
// Task 3.3: Template service

import { db } from "@/lib/db";
import { contractTemplate, type ContractCategory, type ContractTemplate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getTemplates(): Promise<ContractTemplate[]> {
  return db.select().from(contractTemplate);
}

export async function getTemplateById(id: string): Promise<ContractTemplate | null> {
  const results = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.id, id));
  return results[0] ?? null;
}

export async function getTemplatesByCategory(category: ContractCategory): Promise<ContractTemplate[]> {
  return db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.category, category));
}
