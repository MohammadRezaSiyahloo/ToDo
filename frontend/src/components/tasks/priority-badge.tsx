"use client";

import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high";
}

const config = {
  low: { label: "Low", className: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" },
  high: { label: "High", className: "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400" },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { label, className } = config[priority];
  return <Badge className={className}>{label}</Badge>;
}
