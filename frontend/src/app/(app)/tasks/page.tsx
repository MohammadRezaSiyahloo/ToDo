"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, PanelLeftClose, PanelLeft, Download, Upload, Keyboard, List, Columns3, CalendarDays, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/tags/tag-sidebar";
import { TaskList } from "@/components/tasks/task-list";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { CalendarView } from "@/components/tasks/calendar-view";
import { GanttView } from "@/components/tasks/gantt-view";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TemplateForm } from "@/components/tasks/template-form";
import { Task, Tag, Template } from "@/lib/types";
import api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("searchQuery") || "";
    }
    return "";
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("statusFilter") || "all";
    }
    return "all";
  });
  const [priorityFilter, setPriorityFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("priorityFilter") || "all";
    }
    return "all";
  });
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar" | "gantt">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("viewMode") as "list" | "kanban" | "calendar" | "gantt") || "list";
    }
    return "list";
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [prefilledDeadline, setPrefilledDeadline] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem("searchQuery", searchQuery);
  }, [searchQuery]);
  useEffect(() => {
    localStorage.setItem("statusFilter", statusFilter);
  }, [statusFilter]);
  useEffect(() => {
    localStorage.setItem("priorityFilter", priorityFilter);
  }, [priorityFilter]);
  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get<Tag[]>("/api/tags/");
      setTags(res.data);
    } catch (err) {
      console.error("Failed to fetch tags", err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get<Template[]>("/api/templates/");
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedTag !== null) params.tag_id = selectedTag.toString();
      if (statusFilter === "completed") params.completed = "true";
      if (statusFilter === "pending") params.completed = "false";
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get<Task[]>("/api/tasks/", { params });
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  }, [selectedTag, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchTags();
    fetchTemplates();
  }, [fetchTags, fetchTemplates]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditingTask(null);
        setFormOpen(true);
      }
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      }
      if (e.key === "Escape") {
        setFormOpen(false);
        setShowShortcuts(false);
      }
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcuts]);

  const handleToggle = async (id: number) => {
    try {
      await api.patch(`/api/tasks/${id}/toggle`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  const handleTogglePin = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await api.put(`/api/tasks/${id}`, { pinned: !task.pinned });
      fetchTasks();
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingTask) {
        await api.put(`/api/tasks/${editingTask.id}`, data);
      } else {
        await api.post("/api/tasks/", data);
      }
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to save task", err);
    }
  };

  const handleReorder = async (reorderData: { id: number; sort_order: number }[]) => {
    setTasks((prev) => {
      const newTasks = [...prev];
      reorderData.forEach(({ id, sort_order }) => {
        const task = newTasks.find((t) => t.id === id);
        if (task) task.sort_order = sort_order;
      });
      return newTasks.sort((a, b) => a.sort_order - b.sort_order);
    });
    try {
      await api.patch("/api/tasks/reorder", { tasks: reorderData });
    } catch (err) {
      console.error("Failed to reorder tasks", err);
      fetchTasks();
    }
  };

  const handleClearCompleted = async () => {
    try {
      await api.delete("/api/tasks/clear-completed");
      fetchTasks();
    } catch (err) {
      console.error("Failed to clear completed", err);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.post(`/api/tasks/${id}/duplicate`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to duplicate task", err);
    }
  };

  const handleCreateTemplate = async (data: { name: string; title: string; description?: string; priority: string }) => {
    try {
      await api.post("/api/templates/", data);
      fetchTemplates();
    } catch (err) {
      console.error("Failed to create template", err);
    }
  };

  const handleUseTemplate = async (id: number) => {
    try {
      await api.post(`/api/templates/${id}/create-task`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to use template", err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await api.delete(`/api/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error("Failed to delete template", err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/api/tasks/export/json");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasks-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export", err);
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.post("/api/tasks/import/json", data);
        fetchTasks();
      } catch (err) {
        console.error("Failed to import", err);
      }
    };
    input.click();
  };

  const tagCounts = tags.reduce((acc, tag) => {
    acc[tag.id] = tasks.filter((t) => t.tags?.some((tg) => tg.id === tag.id)).length;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Sidebar
        tags={tags}
        tagCounts={tagCounts}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        onAddTag={async (name, color) => {
          await api.post("/api/tags/", { name, color });
          fetchTags();
        }}
        onDeleteTag={async (id) => {
          await api.delete(`/api/tags/${id}`);
          fetchTags();
        }}
        onClose={() => setSidebarOpen(false)}
        className={sidebarOpen ? "hidden lg:flex" : "hidden"}
      />

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar
              tags={tags}
              tagCounts={tagCounts}
              selectedTag={selectedTag}
              onSelectTag={(id) => { setSelectedTag(id); setSidebarOpen(false); }}
              onAddTag={async (name, color) => {
                await api.post("/api/tags/", { name, color });
                fetchTags();
              }}
              onDeleteTag={async (id) => {
                await api.delete(`/api/tags/${id}`);
                fetchTags();
              }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold flex-1 min-w-0 truncate">
              {selectedTag
                ? tags.find((t) => t.id === selectedTag)?.name
                : "All Tasks"}
            </h1>

            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-all",
                  viewMode === "list" ? "bg-card neu-raised-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-all",
                  viewMode === "kanban" ? "bg-card neu-raised-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="Board view"
              >
                <Columns3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-all",
                  viewMode === "calendar" ? "bg-card neu-raised-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="Calendar view"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-all",
                  viewMode === "gantt" ? "bg-card neu-raised-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="Gantt view"
              >
                <GanttChart className="h-4 w-4" />
              </button>
            </div>

            <Button variant="ghost" size="icon-sm" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleExport} title="Export tasks">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleImport} title="Import tasks">
              <Upload className="h-4 w-4" />
            </Button>
            <Button onClick={() => { setEditingTask(null); setFormOpen(true); }} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          {/* View content */}
          {viewMode === "list" && (
            <TaskList
              tasks={tasks}
              onToggle={handleToggle}
              onTogglePin={handleTogglePin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={setSelectedTask}
              onReorder={handleReorder}
              onClearCompleted={handleClearCompleted}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
            />
          )}

          {viewMode === "kanban" && (
            <KanbanBoard
              tasks={tasks}
              onRefresh={fetchTasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={setSelectedTask}
            />
          )}

          {viewMode === "calendar" && (
            <CalendarView
              tasks={tasks}
              onDayClick={(date) => {
                const deadline = new Date(date);
                deadline.setHours(12, 0, 0, 0);
                setPrefilledDeadline(deadline.toISOString().slice(0, 16));
                setEditingTask(null);
                setFormOpen(true);
              }}
              onTaskClick={setSelectedTask}
            />
          )}

          {viewMode === "gantt" && (
            <GanttView
              tasks={tasks}
              onTaskClick={setSelectedTask}
            />
          )}
        </div>
      </div>

      <TaskForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); setPrefilledDeadline(undefined); }}
        onSubmit={handleSubmit}
        task={editingTask}
        tags={tags}
        prefilledDeadline={prefilledDeadline}
      />

      <TemplateForm
        open={templateFormOpen}
        onClose={() => setTemplateFormOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setFormOpen(true); }}
          onDelete={async (id) => { setSelectedTask(null); await handleDelete(id); }}
          onDuplicate={async (id) => { setSelectedTask(null); await handleDuplicate(id); }}
          onToggle={handleToggle}
          onTogglePin={handleTogglePin}
          onRefresh={fetchTasks}
        />
      )}

      {/* Keyboard shortcuts dialog */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-card neu-raised-lg rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2 text-sm">
              {[
                ["N", "New task"],
                ["/", "Focus search"],
                ["?", "Show shortcuts"],
                ["Esc", "Close dialog"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setShowShortcuts(false)}>Close</Button>
          </div>
        </div>
      )}

      {/* Fixed sidebar toggle — left center of screen */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-6 rounded-r-lg bg-card neu-raised-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          title="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
