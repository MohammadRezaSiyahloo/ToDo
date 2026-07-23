"use client";

import { useState } from "react";
import { Tag as TagIcon, X, PanelLeftClose, Palette, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag as TagType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  tags: TagType[];
  tagCounts?: Record<number, number>;
  selectedTag?: number | null;
  onSelectTag?: (id: number | null) => void;
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (id: number) => void;
  onClose?: () => void;
  className?: string;
}

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

export function Sidebar({
  tags,
  tagCounts = {},
  selectedTag = null,
  onSelectTag,
  onAddTag,
  onDeleteTag,
  onClose,
  className,
}: SidebarProps) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleAddTag = () => {
    if (tagName.trim()) {
      onAddTag(tagName.trim(), tagColor);
      setTagName("");
      setShowAddTag(false);
    }
  };

  return (
    <aside className={cn("w-72 bg-card flex flex-col h-full neu-raised shrink-0", className)}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TagIcon className="h-3.5 w-3.5" />
          Tags
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:neu-raised-sm transition-all"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tags list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag?.(selectedTag === tag.id ? null : tag.id)}
              className={cn(
                "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-white transition-all",
                selectedTag === tag.id && "ring-2 ring-offset-1 ring-primary"
              )}
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <span className="opacity-70 text-[10px]">{tagCounts[tag.id] || 0}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onDeleteTag(tag.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity -mr-0.5"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>

        {tags.length === 0 && !showAddTag && (
          <p className="text-xs text-muted-foreground text-center py-4">No tags yet</p>
        )}
      </div>

      {/* Add tag form */}
      <div className="p-4 border-t">
        {showAddTag ? (
          <div className="space-y-2">
            <Input
              placeholder="Tag name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              autoFocus
              className="h-8 text-sm"
            />
            <div className="flex gap-1 flex-wrap items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setTagColor(c); setShowColorPicker(false); }}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    tagColor === c && !showColorPicker ? "scale-125 ring-2 ring-offset-1 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`h-5 w-5 rounded-full transition-transform flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ${
                  showColorPicker ? "scale-125 ring-2 ring-offset-1 ring-primary" : ""
                }`}
                title="Custom color"
              >
                <Palette className="h-3 w-3 text-white" />
              </button>
            </div>
            {showColorPicker && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer border-0"
                />
                <Input
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  placeholder="#000000"
                  className="h-7 text-xs font-mono"
                />
              </div>
            )}
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddTag} className="flex-1 h-7 text-xs">Add</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAddTag(false); setShowColorPicker(false); }} className="h-7">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddTag(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        )}
      </div>
    </aside>
  );
}
