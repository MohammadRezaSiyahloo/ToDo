"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Trash2, Pin, Clock, Folder, Tag as TagIcon, MessageSquare, ListChecks, CheckCircle2, Circle, Plus, Send, Repeat, Copy, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeadlineCountdown } from "./deadline-countdown";
import { Task, Comment, Subtask, TimeEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface TaskDetailProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onToggle: (id: number) => void;
  onTogglePin: (id: number) => void;
  onRefresh: () => void;
}

const priorityConfig = {
  high: { label: "High", bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Medium", bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
};

export function TaskDetail({ task, open, onClose, onEdit, onDelete, onDuplicate, onToggle, onTogglePin, onRefresh }: TaskDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [localPinned, setLocalPinned] = useState(task.pinned);
  const [localCompleted, setLocalCompleted] = useState(task.completed);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setLocalPinned(task.pinned);
    setLocalCompleted(task.completed);
  }, [task.pinned, task.completed]);

  const priority = priorityConfig[task.priority];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  useEffect(() => {
    if (open && task) {
      // Reset timer state immediately
      setElapsed(0);
      setRunningTimer(null);
      
      api.get(`/api/tasks/${task.id}/comments`).then(res => setComments(res.data)).catch(() => {});
      api.get(`/api/tasks/${task.id}/subtasks`).then(res => setSubtasks(res.data)).catch(() => {});
      api.get(`/api/time/${task.id}`).then(res => {
        const entries = res.data || [];
        setTimeEntries(entries);
        // Only show running timer if it belongs to THIS task and is recent (within 1 hour)
        const running = entries.find((e: TimeEntry) => {
          if (e.ended_at) return false;
          const started = new Date(e.started_at).getTime();
          const now = Date.now();
          return (now - started) < 60 * 60 * 1000; // within 1 hour
        });
        setRunningTimer(running || null);
        if (running) {
          // Parse the UTC timestamp and calculate elapsed
          const startStr = running.started_at.endsWith('Z') ? running.started_at : running.started_at + 'Z';
          const start = new Date(startStr).getTime();
          const now = Date.now();
          setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
        }
      }).catch(() => {});
    }
  }, [open, task]);

  // Timer tick
  useEffect(() => {
    if (!runningTimer) return;
    const startStr = runningTimer.started_at.endsWith('Z') ? runningTimer.started_at : runningTimer.started_at + 'Z';
    const startTime = new Date(startStr).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleStartTimer = async () => {
    try {
      const res = await api.post(`/api/time/${task.id}/start`);
      setRunningTimer(res.data);
      setElapsed(0);
    } catch (err) {
      console.error("Failed to start timer", err);
    }
  };

  const handleStopTimer = async () => {
    try {
      const res = await api.post(`/api/time/${task.id}/stop`);
      setRunningTimer(null);
      setElapsed(0);
      setTimeEntries((prev) => [res.data, ...prev]);
    } catch (err) {
      // If stop fails, clear the local state anyway
      setRunningTimer(null);
      setElapsed(0);
      console.error("Failed to stop timer", err);
    }
  };

  const handleTogglePin = async () => {
    setLocalPinned(!localPinned);
    onTogglePin(task.id);
  };

  const handleToggle = async () => {
    setLocalCompleted(!localCompleted);
    onToggle(task.id);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/api/tasks/${task.id}/comments`, { content: newComment.trim() });
      setComments([...comments, res.data]);
      setNewComment("");
    } catch {}
  };

  const deleteComment = async (id: number) => {
    try {
      await api.delete(`/api/tasks/${task.id}/comments/${id}`);
      setComments(comments.filter(c => c.id !== id));
    } catch {}
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      const res = await api.patch(`/api/tasks/${task.id}/subtasks/${subtask.id}`, { completed: !subtask.completed });
      setSubtasks(subtasks.map(s => s.id === subtask.id ? res.data : s));
    } catch {}
  };

  const addSubtaskItem = async () => {
    if (!newSubtask.trim()) return;
    try {
      const res = await api.post(`/api/tasks/${task.id}/subtasks`, { title: newSubtask.trim() });
      setSubtasks([...subtasks, res.data]);
      setNewSubtask("");
    } catch {}
  };

  const deleteSubtask = async (id: number) => {
    try {
      await api.delete(`/api/tasks/${task.id}/subtasks/${id}`);
      setSubtasks(subtasks.filter(s => s.id !== id));
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card neu-raised-lg rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-4">
          <button onClick={handleToggle} className="mt-1 shrink-0">
            {localCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h2 className={cn("text-xl font-bold", localCompleted && "line-through text-muted-foreground")}>
              {task.title}
            </h2>
            {task.description && (
              <p className={cn("text-sm text-muted-foreground mt-1", localCompleted && "line-through")}>
                {task.description}
              </p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium", priority.bg, priority.text)}>
            <span className={cn("h-2 w-2 rounded-full", priority.dot)} />
            {priority.label}
          </span>

          {task.tags && task.tags.length > 0 && task.tags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/50">
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
          ))}

          {task.deadline && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/50">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {localCompleted ? new Date(task.deadline).toLocaleDateString() : <DeadlineCountdown deadline={task.deadline} />}
            </span>
          )}

          {task.recurring && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/50">
              <Repeat className="h-3 w-3 text-muted-foreground" />
              {task.recurring}
            </span>
          )}

          {localPinned && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
              <Pin className="h-3 w-3 fill-primary" />
              Pinned
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 space-y-5">
          {/* Subtasks */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ListChecks className="h-4 w-4" />
              Subtasks
              {subtasks.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({completedSubtasks}/{subtasks.length})
                </span>
              )}
            </h3>
            {subtasks.length > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3 neu-pressed-sm">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%` }}
                />
              </div>
            )}
            <div className="space-y-1">
              {subtasks.map((st) => (
                <div key={st.id} className="group flex items-center gap-2 py-1">
                  <button onClick={() => toggleSubtask(st)} className="shrink-0">
                    {st.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>
                  <span className={cn("flex-1 text-sm", st.completed && "line-through text-muted-foreground")}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtaskItem()}
                className="h-8 text-sm"
              />
              <Button variant="outline" size="icon-sm" onClick={addSubtaskItem} disabled={!newSubtask.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Time Tracking */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4" />
              Time Tracking
            </h3>

            {/* Timer controls */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              {runningTimer ? (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">Timer running</p>
                    <p className="text-2xl font-bold font-mono">{formatDuration(elapsed)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleStopTimer}>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    Stop
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">No timer running</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleStartTimer}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Start
                  </Button>
                </>
              )}
            </div>

            {/* Time entries */}
            {timeEntries.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Recent entries</p>
                {timeEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">
                      {new Date(entry.started_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      {" "}
                      {new Date(entry.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="font-mono font-medium">
                      {formatDuration(entry.duration_seconds)}
                    </span>
                  </div>
                ))}
                {timeEntries.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{timeEntries.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="pb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h3>
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="group flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                className="h-8 text-sm"
              />
              <Button variant="outline" size="icon-sm" onClick={addComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-1">
            <button
              onClick={handleTogglePin}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                localPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pin className={cn("h-4 w-4", localPinned && "fill-primary")} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { onClose(); onDuplicate(task.id); }}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(task); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => { onClose(); onDelete(task.id); }}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
