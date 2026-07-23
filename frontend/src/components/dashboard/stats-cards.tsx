"use client";

import { CheckCircle2, Clock, ListTodo, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export function StatsCards({ total, completed, pending, overdue }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Tasks",
      value: total,
      icon: ListTodo,
      color: "text-blue-500",
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
    },
    {
      title: "Completed",
      value: completed,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    },
    {
      title: "Pending",
      value: pending,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
    },
    {
      title: "Overdue",
      value: overdue,
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-500/10 dark:bg-red-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-xl ${stat.bg} neu-pressed-sm`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
            {stat.title === "Completed" && total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((completed / total) * 100)}% completion rate
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
