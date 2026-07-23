export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Subtask {
  id: number;
  title: string;
  completed: boolean;
  sort_order: number;
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  pinned: boolean;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  tags: Tag[];
  subtasks: Subtask[];
  comment_count: number;
  sort_order: number;
  recurring: string | null;
  recurring_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  completed: number;
  pending: number;
  overdue: number;
  by_priority: { low: number; medium: number; high: number };
  weekly_completion: { date: string; count: number }[];
}

export interface TimeEntry {
  id: number;
  task_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  note: string | null;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  created_at: string;
}
