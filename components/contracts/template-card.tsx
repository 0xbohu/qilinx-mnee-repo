"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContractTemplate } from "@/lib/db/schema";

interface TemplateCardProps {
  template: ContractTemplate;
  onClick: () => void;
  selected?: boolean;
}

const categoryColors: Record<string, string> = {
  staking: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "dao-voting": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  payment: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const categoryLabels: Record<string, string> = {
  staking: "Staking",
  "dao-voting": "DAO Voting",
  payment: "Payment",
};

export function TemplateCard({ template, onClick, selected }: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${selected ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <Badge className={categoryColors[template.category] || "bg-gray-100"}>
            {categoryLabels[template.category] || template.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardContent>
    </Card>
  );
}
