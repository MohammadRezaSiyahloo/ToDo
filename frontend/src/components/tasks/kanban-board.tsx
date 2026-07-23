"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, CheckCircle2, Circle, Clock, Pin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeadlineCountdown } from "./deadline-countdown";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface KanbanBoardProps {
  tasks: Task[];
  onRefresh: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onClick?: (task: Task) => void;
}

const columns = [
  { id: "todo", label: "To Do", color: "bg-blue-500" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { id: "done", label: "Done", color: "bg-emerald-500" },
] as const;

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

function SortableTaskCard({ task, onEdit, onDelete, onClick }: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onClick?: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-30 z-50")}>
      <Card className={cn(
        "p-3 transition-all hover:neu-raised-lg group cursor-default",
        isDragging && "ring-2 ring-primary/50"
      )}>
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <div className={cn("w-1.5 h-full min-h-[1.5rem] rounded-full shrink-0", priorityColors[task.priority])} />

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick?.(task)}>
            <h4 className={cn("text-sm font-medium truncate", task.completed && "line-through text-muted-foreground")}>
              {task.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {task.deadline && !task.completed && (
                <DeadlineCountdown deadline={task.deadline} />
              )}
              {task.pinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-2 min-h-[200px] p-2 rounded-xl transition-all duration-200",
        isOver ? "bg-primary/10 ring-2 ring-primary/30 scale-[1.01]" : "bg-muted/30 neu-pressed-sm"
      )}
    >
      {children}
    </div>
  );
}

export function KanbanBoard({ tasks, onRefresh, onEdit, onDelete, onClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => {
      const status = t.status || "todo";
      if (map[status]) map[status].push(t);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const overId = over.id as string;

    // Determine target column
    let targetStatus: string | null = null;
    if (["todo", "in_progress", "done"].includes(overId)) {
      targetStatus = overId;
    } else {
      // Dropped on another task — find which column it's in
      const overTask = tasks.find((t) => t.id === Number(overId));
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Only update if status changed
    if (task.status !== targetStatus) {
      try {
        await api.put(`/api/tasks/${taskId}`, {
          status: targetStatus,
          completed: targetStatus === "done",
        });
        onRefresh();
      } catch (err) {
        console.error("Failed to move task", err);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const columnTasks = tasksByColumn[col.id] || [];

          return (
            <div key={col.id} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", col.color)} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground">({columnTasks.length})</span>
              </div>

              {/* Droppable column */}
              <DroppableColumn id={col.id}>
                <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {columnTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground/50">
                      <p className="text-sm">Drop tasks here</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onClick={onClick}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? (
          <Card className="p-3 neu-raised-lg opacity-90 rotate-2">
            <div className="flex items-start gap-2">
              <div className={cn("w-1.5 h-full min-h-[1.5rem] rounded-full shrink-0", priorityColors[activeTask.priority])} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{activeTask.title}</h4>
              </div>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
