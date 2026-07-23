"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Pin, ListChecks, Trash2, MessageSquare, Send, Check, ChevronDown, Folder, Tag as TagIcon, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag, Task, Subtask, Comment } from "@/lib/types";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  category_id: z.string().optional(),
  project_id: z.string().optional(),
  deadline: z.string().optional(),
  tag: z.string().optional(),
  pinned: z.boolean().optional(),
  recurring: z.string().optional(),
  recurring_until: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  task?: Task | null;
  tags: Tag[];
  prefilledDeadline?: string;
}

export function TaskForm({ open, onClose, onSubmit, task, tags, prefilledDeadline }: TaskFormProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category_id: "",
      project_id: "",
      deadline: "",
      tag: "",
      pinned: false,
      recurring: "",
      recurring_until: "",
    },
  });

  const isPinned = watch("pinned");

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : "",
        tag: "",
        pinned: task.pinned,
        recurring: task.recurring || "",
        recurring_until: task.recurring_until ? new Date(task.recurring_until).toISOString().slice(0, 10) : "",
      });
      setSelectedTagIds(task.tags?.map(t => t.id) || []);
      setSubtasks(task.subtasks || []);
      api.get(`/api/tasks/${task.id}/comments`).then(res => setComments(res.data)).catch(() => setComments([]));
    } else {
      reset({
        title: "",
        description: "",
        priority: "medium",
        deadline: prefilledDeadline || "",
        tag: "",
        pinned: false,
        recurring: "",
        recurring_until: "",
      });
      setSelectedTagIds([]);
      setSubtasks([]);
    }
    setShowTagDropdown(false);
  }, [task, reset, open, prefilledDeadline]);

  const handleFormSubmit = async (data: TaskFormData) => {
    const payload: any = {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      tag_ids: selectedTagIds,
      tag: data.tag || undefined,
      pinned: !!data.pinned,
      status: "todo",
    };
    if (data.deadline) payload.deadline = new Date(data.deadline).toISOString();
    if (data.recurring) payload.recurring = data.recurring;
    if (data.recurring_until) payload.recurring_until = new Date(data.recurring_until).toISOString();
    onSubmit(payload);
    onClose();
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const removeTag = (tagId: number) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: Date.now(), // temp id
      title: newSubtaskTitle.trim(),
      completed: false,
      sort_order: subtasks.length,
    };
    setSubtasks([...subtasks, newSubtask]);
    setNewSubtaskTitle("");
  };

  const removeSubtask = (id: number) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      const res = await api.post(`/api/tasks/${task.id}/comments`, { content: newComment.trim() });
      setComments([...comments, res.data]);
      setNewComment("");
    } catch {}
  };

  const deleteComment = async (commentId: number) => {
    if (!task) return;
    try {
      await api.delete(`/api/tasks/${task.id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title + Pin */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title" className="flex-1">Title</Label>
              <button
                type="button"
                onClick={() => setValue("pinned", !isPinned)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${
                  isPinned ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Pin className={`h-3 w-3 ${isPinned ? "fill-primary" : ""}`} />
                {isPinned ? "Pinned" : "Pin"}
              </button>
            </div>
            <Input id="title" {...register("title")} placeholder="Task title" />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              {...register("priority")}
              className="flex h-9 w-full rounded-xl border border-transparent bg-card px-3 py-1 text-sm neu-pressed-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Deadline, Recurring, Tags */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="datetime-local" {...register("deadline")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring">Recurring</Label>
              <select
                id="recurring"
                {...register("recurring")}
                className="flex h-9 w-full rounded-xl border border-transparent bg-card px-3 py-1 text-sm neu-pressed-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring_until">Repeat Until</Label>
              <Input id="recurring_until" type="date" {...register("recurring_until")} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Tags</Label>
              {/* Selected tags display */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="flex h-9 w-full items-center justify-between gap-1 rounded-xl border border-transparent bg-card px-3 py-1 text-sm neu-pressed-sm transition-all"
                >
                  <span className={cn("truncate", selectedTags.length > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected` : "Tags"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                {showTagDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl bg-popover neu-raised p-1 max-h-48 overflow-y-auto">
                    {tags.length === 0 ? (
                      <div className="flex flex-col items-center gap-1 py-3 px-2">
                        <TagIcon className="h-5 w-5 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground text-center">No tags yet</p>
                      </div>
                    ) : (
                      tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedTagIds.includes(tag.id) ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}>
                            {selectedTagIds.includes(tag.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                          <span>{tag.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Subtasks
            </Label>
            <div className="space-y-1">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg bg-muted/30">
                  <span className="flex-1">{st.title}</span>
                  <button type="button" onClick={() => removeSubtask(st.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Comments — only show when editing existing task */}
          {task && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="group flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addComment())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon-sm" onClick={addComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{task ? "Save Changes" : "Create Task"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
