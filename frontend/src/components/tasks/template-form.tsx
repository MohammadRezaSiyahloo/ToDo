"use client";

import { useState } from "react";
import { X, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; title: string; description?: string; priority: string }) => void;
}

export function TemplateForm({ open, onClose, onSubmit }: TemplateFormProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) return;
    onSubmit({
      name: name.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    });
    setName("");
    setTitle("");
    setDescription("");
    setPriority("medium");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card neu-raised-lg rounded-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">New Template</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tmpl-name">Template Name</Label>
            <Input
              id="tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Standup"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmpl-title">Task Title</Label>
            <Input
              id="tmpl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare standup notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmpl-desc">Description</Label>
            <Textarea
              id="tmpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-transparent bg-card px-3 py-1 text-sm neu-pressed-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
