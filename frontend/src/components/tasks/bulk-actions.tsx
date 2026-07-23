"use client";

import { X, Trash2, ArrowUpDown, Folder, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onComplete: () => void;
  onClearSelection: () => void;
}

export function BulkActions({ selectedCount, onDelete, onComplete, onClearSelection }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card neu-raised-lg">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="h-5 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onComplete}>
        <CheckCircle2 className="mr-1.5 h-4 w-4" />
        Complete
      </Button>
      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={onDelete}>
        <Trash2 className="mr-1.5 h-4 w-4" />
        Delete
      </Button>
      <div className="h-5 w-px bg-border" />
      <button
        onClick={onClearSelection}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
