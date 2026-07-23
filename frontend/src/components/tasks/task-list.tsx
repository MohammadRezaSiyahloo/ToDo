"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Search, Filter, Trash2, AlertTriangle, CalendarDays, Inbox, CheckCircle2, ArrowUpDown, ChevronDown, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BulkActions } from "./bulk-actions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "./task-card";
import { Task } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number) => void;
  onTogglePin: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onClick?: (task: Task) => void;
  onReorder: (tasks: { id: number; sort_order: number }[]) => void;
  onClearCompleted: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (filter: string) => void;
}

interface TaskGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  tasks: Task[];
  emptyMessage: string;
  accentColor: string;
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground/60">
      {icon}
      <span className="text-sm">{message}</span>
    </div>
  );
}

function GroupHeader({ label, count, icon, accentColor }: { label: string; count: number; icon: React.ReactNode; accentColor: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <span className={accentColor}>{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
      <span className="text-xs text-muted-foreground/50">({count})</span>
      <div className="flex-1 h-px bg-border/50 ml-2" />
    </div>
  );
}

export function TaskList({
  tasks,
  onToggle,
  onTogglePin,
  onEdit,
  onDelete,
  onClick,
  onReorder,
  onClearCompleted,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
}: TaskListProps) {
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("taskSortBy") || "created";
    }
    return "created";
  });
  const [sortDir, setSortDir] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("taskSortDir") || "desc";
    }
    return "desc";
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Persist sort preferences
  useEffect(() => {
    localStorage.setItem("taskSortBy", sortBy);
    localStorage.setItem("taskSortDir", sortDir);
  }, [sortBy, sortDir]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const selectAll = () => {
    setSelectedIds(new Set(sortedTasks.map((t) => t.id)));
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onDelete(id));
    clearSelection();
  };

  const handleBulkComplete = () => {
    selectedIds.forEach((id) => onToggle(id));
    clearSelection();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which group both tasks belong to
    const activeGroup = groups.find((g) => g.tasks.some((t) => t.id === active.id));
    const overGroup = groups.find((g) => g.tasks.some((t) => t.id === over.id));

    // Only allow reorder within the same group
    if (!activeGroup || !overGroup || activeGroup.id !== overGroup.id) return;

    const groupTasks = activeGroup.tasks;
    const oldIndex = groupTasks.findIndex((t) => t.id === active.id);
    const newIndex = groupTasks.findIndex((t) => t.id === over.id);

    const newTasks = [...groupTasks];
    const [moved] = newTasks.splice(oldIndex, 1);
    newTasks.splice(newIndex, 0, moved);

    // Update sort_order for the reordered tasks
    const reorderData = newTasks.map((t, i) => ({ id: t.id, sort_order: i }));
    onReorder(reorderData);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  // Sort tasks before grouping
  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const statusOrder = { todo: 0, in_progress: 1, done: 2 };

    if (sortBy === "manual") {
      return [...tasks].sort((a, b) => a.sort_order - b.sort_order);
    }

    return [...tasks].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "deadline":
          const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          comparison = aTime - bTime;
          break;
        case "priority":
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case "name":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        default:
          comparison = 0;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortBy, sortDir]);

  // Group tasks by urgency/time
  const groups = useMemo((): TaskGroup[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const pinned = sortedTasks.filter((t) => t.pinned && !t.completed);
    const overdue = sortedTasks.filter((t) => !t.completed && !t.pinned && t.deadline && new Date(t.deadline) < todayStart);
    const today = sortedTasks.filter((t) => !t.completed && !t.pinned && t.deadline && new Date(t.deadline) >= todayStart && new Date(t.deadline) < todayEnd);
    const upcoming = sortedTasks.filter((t) => !t.completed && !t.pinned && t.deadline && new Date(t.deadline) >= todayEnd);
    const noDate = sortedTasks.filter((t) => !t.completed && !t.pinned && !t.deadline);
    const completed = sortedTasks.filter((t) => t.completed);

    const result: TaskGroup[] = [];

    if (pinned.length > 0) {
      result.push({
        id: "pinned",
        label: "Pinned",
        icon: <span className="text-primary">📌</span>,
        tasks: pinned,
        emptyMessage: "No pinned tasks",
        accentColor: "text-primary",
      });
    }

    result.push({
      id: "overdue",
      label: "Overdue",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
      tasks: overdue,
      emptyMessage: "Nothing overdue — nice work!",
      accentColor: "text-red-500",
    });

    result.push({
      id: "today",
      label: "Today",
      icon: <CalendarDays className="h-3.5 w-3.5 text-amber-500" />,
      tasks: today,
      emptyMessage: "All caught up for today!",
      accentColor: "text-amber-500",
    });

    result.push({
      id: "upcoming",
      label: "Upcoming",
      icon: <CalendarDays className="h-3.5 w-3.5 text-blue-500" />,
      tasks: upcoming,
      emptyMessage: "Nothing coming up this week",
      accentColor: "text-blue-500",
    });

    result.push({
      id: "no-date",
      label: "No Date",
      icon: <Inbox className="h-3.5 w-3.5 text-muted-foreground" />,
      tasks: noDate,
      emptyMessage: "All tasks have deadlines",
      accentColor: "text-muted-foreground",
    });

    if (completed.length > 0) {
      result.push({
        id: "completed",
        label: "Completed",
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
        tasks: completed,
        emptyMessage: "",
        accentColor: "text-emerald-500",
      });
    }

    return result;
  }, [sortedTasks]);

  const hasAnyTasks = tasks.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and status filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Priority filter and sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Priority:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "low", "medium", "high"].map((p) => (
            <Badge
              key={p}
              variant={priorityFilter === p ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => onPriorityFilterChange(p)}
            >
              {p}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Select mode toggle */}
          <button
            onClick={() => {
              if (selectMode) {
                clearSelection();
              } else {
                setSelectMode(true);
              }
            }}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm transition-all",
              selectMode ? "bg-primary text-primary-foreground neu-raised-sm" : "bg-card neu-pressed-sm text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{selectMode ? "Cancel" : "Select"}</span>
          </button>

          {/* Sort dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-card px-3 text-sm neu-pressed-sm transition-all"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium capitalize">{sortBy}</span>
              <span className="text-xs text-muted-foreground">{sortDir === "asc" ? "↑" : "↓"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showSortDropdown && (
              <div className="absolute z-50 right-0 mt-1 w-40 rounded-xl bg-popover neu-raised p-1">
                {[
                  { value: "manual", label: "Manual" },
                  { value: "created", label: "Created" },
                  { value: "deadline", label: "Deadline" },
                  { value: "priority", label: "Priority" },
                  { value: "name", label: "Name" },
                  { value: "status", label: "Status" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors",
                      sortBy === option.value && "bg-muted font-medium"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <div className="border-t mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSortDir(sortDir === "asc" ? "desc" : "asc"); setShowSortDropdown(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortDir === "asc" ? "Descending" : "Ascending"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={onClearCompleted}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Clear {completedCount} done</span>
              <span className="sm:hidden">Clear {completedCount}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 neu-pressed-sm">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create your first task to get started</p>
        </div>
      )}

      {/* Task groups */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {groups.map((group) => (
          <div key={group.id}>
            <GroupHeader
              label={group.label}
              count={group.tasks.length}
              icon={group.icon}
              accentColor={group.accentColor}
            />
            {group.tasks.length === 0 ? (
              <EmptyState
                message={group.emptyMessage}
                icon={group.icon}
              />
            ) : (
              <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={onToggle}
                      onTogglePin={onTogglePin}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onClick={onClick}
                      selectable={selectMode}
                      selected={selectedIds.has(task.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        ))}
      </DndContext>

      {/* Bulk actions bar */}
      <BulkActions
        selectedCount={selectedIds.size}
        onDelete={handleBulkDelete}
        onComplete={handleBulkComplete}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
