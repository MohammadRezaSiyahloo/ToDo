"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GanttViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const priorityConfig = {
  high: { bg: "bg-red-500", light: "bg-red-500/20", text: "text-red-600" },
  medium: { bg: "bg-amber-500", light: "bg-amber-500/20", text: "text-amber-600" },
  low: { bg: "bg-blue-500", light: "bg-blue-500/20", text: "text-blue-600" },
};

export function GanttView({ tasks, onTaskClick }: GanttViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate 14 days starting from today
  const days = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 3); // Start 3 days before today
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [currentDate.getTime()]);

  const startDate = days[0];
  const endDate = days[days.length - 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter tasks with deadlines in the visible range
  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [tasks, startDate, endDate]);

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Timeline</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setCurrentDate(new Date(currentDate.getTime() - 14 * 86400000))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setCurrentDate(new Date(currentDate.getTime() + 14 * 86400000))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="overflow-hidden">
        {/* Day headers */}
        <div className="flex border-b">
          <div className="w-52 shrink-0 px-4 py-3 text-sm font-semibold text-muted-foreground bg-muted/30">
            Task
          </div>
          <div className="flex flex-1">
            {days.map((day, i) => {
              const dateKey = day.toISOString().split("T")[0];
              const isToday = dateKey === todayStr;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 min-w-[50px] text-center py-3 border-l transition-colors",
                    isToday && "bg-primary/10",
                    isWeekend && !isToday && "bg-muted/20"
                  )}
                >
                  <div className={cn("text-xs font-medium", isToday ? "text-primary font-bold" : "text-foreground")}>
                    {day.getDate()}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task rows */}
        {visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No tasks in this range</p>
            <p className="text-sm mt-1">Tasks with deadlines will appear here</p>
          </div>
        ) : (
          visibleTasks.map((task, taskIndex) => {
            const deadline = new Date(task.deadline!);
            const deadlineDateStr = deadline.toISOString().split("T")[0];
            const deadlineIndex = days.findIndex(
              (d) => d.toISOString().split("T")[0] === deadlineDateStr
            );
            const priority = priorityConfig[task.priority];

            return (
              <div
                key={task.id}
                className={cn(
                  "flex group cursor-pointer hover:bg-muted/30 transition-colors",
                  taskIndex < visibleTasks.length - 1 && "border-b"
                )}
                onClick={() => onTaskClick?.(task)}
              >
                {/* Task info */}
                <div className="w-52 shrink-0 px-4 py-3 flex items-center gap-2 min-w-0 border-r">
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", priority.bg)} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium truncate", task.completed && "line-through text-muted-foreground")}>
                      {task.title}
                    </div>
                  </div>
                  {task.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>

                {/* Timeline */}
                <div className="flex flex-1 relative">
                  {days.map((day, i) => {
                    const dateKey = day.toISOString().split("T")[0];
                    const isToday = dateKey === todayStr;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 min-w-[50px] border-l relative",
                          isToday && "bg-primary/5",
                          isWeekend && !isToday && "bg-muted/10"
                        )}
                      >
                        {/* Deadline marker */}
                        {i === deadlineIndex && (
                          <div className="absolute inset-x-1 inset-y-1">
                            <div
                              className={cn(
                                "h-full rounded-lg flex items-center justify-center px-1.5 text-[10px] font-mono font-bold transition-all",
                                task.completed
                                  ? "bg-emerald-500/20 text-emerald-600"
                                  : `${priority.light} ${priority.text}`
                              )}
                              title={`${task.title} - ${deadline.getHours().toString().padStart(2, "0")}:${deadline.getMinutes().toString().padStart(2, "0")}`}
                            >
                              {deadline.getHours().toString().padStart(2, "0")}:{deadline.getMinutes().toString().padStart(2, "0")}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
