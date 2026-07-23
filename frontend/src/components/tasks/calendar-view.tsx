"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: Task[];
  onDayClick: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const priorityColors = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-blue-500",
};

export function CalendarView({ tasks, onDayClick, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = useMemo(() => {
    const result: Date[] = [];
    const current = new Date(startDate);
    while (result.length < 42) {
      result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [startDate.getTime()]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.deadline) {
        const dateKey = new Date(task.deadline).toISOString().split("T")[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dateKey = day.toISOString().split("T")[0];
          const dayTasks = tasksByDate[dateKey] || [];
          const isCurrentMonth = day.getMonth() === month;
          const isToday = dateKey === today;
          const isExpanded = expandedDay === dateKey;
          const visibleTasks = isExpanded ? dayTasks : dayTasks.slice(0, 2);
          const hiddenCount = dayTasks.length - 2;

          return (
            <div
              key={index}
              className={cn(
                "rounded-lg text-left transition-all overflow-hidden",
                isCurrentMonth ? "bg-card neu-raised-sm" : "bg-muted/20 opacity-50",
                isToday && "ring-2 ring-primary",
                isExpanded ? "min-h-[100px]" : "h-[100px]"
              )}
            >
              {/* Day header — clickable to add task */}
              <button
                onClick={() => onDayClick(day)}
                className={cn(
                  "w-full text-left px-1.5 py-1 rounded-t-lg text-sm font-medium hover:bg-muted/50 transition-colors",
                  isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {day.getDate()}
              </button>

              {/* Tasks for this day */}
              <div className="px-1 pb-1 space-y-0.5">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick?.(task);
                    }}
                    className={cn(
                      "w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-all hover:opacity-80 border-l-2",
                      task.completed
                        ? "line-through text-muted-foreground bg-muted/30"
                        : "bg-muted/50",
                      priorityColors[task.priority]
                    )}
                    title={task.title}
                  >
                    <span className="flex items-center gap-1">
                      {task.completed && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                      <span className="truncate">{task.title}</span>
                    </span>
                  </button>
                ))}

                {/* Show more / collapse button */}
                {dayTasks.length > 2 && !isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay(dateKey);
                    }}
                    className="w-full h-6 px-2 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all flex items-center justify-center gap-1"
                    title={`+${hiddenCount} more`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}
                {isExpanded && dayTasks.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay(null);
                    }}
                    className="w-full h-6 px-2 rounded-lg text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-all neu-raised-sm flex items-center justify-center"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
