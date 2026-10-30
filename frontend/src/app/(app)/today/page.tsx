"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, CheckCircle2, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetail } from "@/components/tasks/task-detail";
import { Task, Tag } from "@/lib/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get<Task[]>("/api/tasks/", { params: { today: "true" } });
      setTasks(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleToggle = async (id: number) => {
    try {
      const { data: updated } = await api.patch<Task>(`/api/tasks/${id}/toggle`);
      setTasks((current) => current.map((task) => task.id === id ? updated : task));
      setSelectedTask((current) => current?.id === id ? updated : current);
      await fetchTasks();
    } catch {
      toast.error("Could not update the task. Please try again.");
    }
  };

  const handleTogglePin = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await api.put(`/api/tasks/${id}`, { pinned: !task.pinned });
      fetchTasks();
    } catch {}
  };

  const handleEdit = (task: Task) => {
    // For now, just navigate to tasks page
    window.location.href = "/tasks";
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/tasks/${id}`);
      fetchTasks();
    } catch {}
  };

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {greeting}, {user?.username}
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-6 p-6 rounded-2xl bg-card neu-raised">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.51} ${251 - progress * 2.51}`}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{progress}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Today&apos;s progress</span>
          <span className="font-medium">{completed} of {total}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden neu-pressed-sm">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No tasks for today. Enjoy your day!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onTogglePin={handleTogglePin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={setSelectedTask}
            />
          ))
        )}
      </div>

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={(task) => { setSelectedTask(null); window.location.href = "/tasks"; }}
          onDelete={async (id) => { setSelectedTask(null); await handleDelete(id); }}
          onDuplicate={async (id) => { setSelectedTask(null); window.location.href = "/tasks"; }}
          onToggle={handleToggle}
          onTogglePin={handleTogglePin}
          onRefresh={fetchTasks}
        />
      )}
    </div>
  );
}
