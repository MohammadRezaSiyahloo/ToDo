"use client";

import { useState } from "react";
import { Plus, X, Trash2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag } from "@/lib/types";

interface TagManagerProps {
  tags: Tag[];
  onAdd: (name: string, color: string) => void;
  onDelete: (id: number) => void;
}

const TAG_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

export function TagManager({ tags, onAdd, onDelete }: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim(), selectedColor);
      setNewName("");
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tags
        </h3>
      </div>

      {isAdding ? (
        <div className="space-y-2">
          <Input
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  selectedColor === color ? "scale-125 ring-2 ring-offset-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="flex-1">
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdding(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => onDelete(tag.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity -mr-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        </div>
      )}
    </div>
  );
}
