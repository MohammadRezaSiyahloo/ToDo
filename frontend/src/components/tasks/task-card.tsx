"use client";

import { GripVertical, Pencil, Trash2, CheckCircle2, Circle, Clock, Tag as TagIcon, Folder, Pin, MessageSquare, ListChecks, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeadlineCountdown } from "./deadline-countdown";
import { Task } from "@/lib/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onToggle: (id: number) => void;
  onTogglePin: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onClick?: (task: Task) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

const priorityConfig = {
  high: { letter: "H", bg: "bg-red-500", ring: "ring-red-500/20" },
  medium: { letter: "M", bg: "bg-amber-500", ring: "ring-amber-500/20" },
  low: { letter: "L", bg: "bg-blue-500", ring: "ring-blue-500/20" },
};

export function TaskCard({ task, onToggle, onTogglePin, onEdit, onDelete, onClick, selectable, selected, onSelect }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div ref={setNodeRef} style={style} className={cn("group", isDragging && "z-50")}>
      <Card className={cn(
        "p-0 transition-all duration-200 hover:neu-raised-lg hover:translate-x-0.5 overflow-hidden cursor-default",
        task.completed && "opacity-50 neu-pressed",
        isDragging && "neu-raised-lg scale-[1.02] shadow-lg"
      )}>
        {/* Priority color strip */}
        <div className="flex items-stretch">
          <div className={cn("w-1 shrink-0", priority.bg)} />

          {/* Main row — everything on one line */}
          <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5">

            {/* Selection checkbox (when in select mode) */}
            {selectable && (
              <button
                onClick={() => onSelect?.(task.id)}
                className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  selected ? "border-primary bg-primary" : "border-muted-foreground hover:border-primary"
                )}
              >
                {selected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}

            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Checkbox */}
            <button onClick={() => onToggle(task.id)} className="shrink-0">
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>

            {/* Title + description */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onClick?.(task)}
            >
              <div className="flex items-center gap-1.5">
                <h3 className={cn(
                  "text-sm font-medium truncate leading-tight",
                  task.completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
                {task.pinned && <Pin className="h-3 w-3 text-primary fill-primary shrink-0" />}
                {task.recurring && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
              {task.description && (
                <p className={cn(
                  "text-xs text-muted-foreground truncate leading-tight mt-0.5",
                  task.completed && "line-through"
                )}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Inline metadata — subtask progress */}
            {totalSubtasks > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}

            {/* Inline metadata — tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="shrink-0 flex items-center gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="h-5 px-1.5 rounded text-xs text-white font-medium inline-flex items-center"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Inline metadata — comments */}
            {task.comment_count > 0 && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {task.comment_count}
              </span>
            )}

            {/* Deadline — only place it appears */}
            {task.deadline && !task.completed && (
              <span className="shrink-0">
                <DeadlineCountdown deadline={task.deadline} />
              </span>
            )}

            {/* Priority badge — compact */}
            <span className={cn(
              "shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-bold ring-2",
              priority.bg, priority.ring
            )}>
              {priority.letter}
            </span>

            {/* Action icons — always visible, inline */}
            <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onTogglePin(task.id)}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  task.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                title={task.pinned ? "Unpin" : "Pin"}
              >
                <Pin className={cn("h-3.5 w-3.5", task.pinned && "fill-primary")} />
              </button>
              <button
                onClick={() => onEdit(task)}
                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
