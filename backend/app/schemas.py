from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Auth schemas
class UserCreate(BaseModel):
    email: str
    username: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# Tag schemas
class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


# Subtask schemas
class SubtaskCreate(BaseModel):
    title: str


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    sort_order: Optional[int] = None


class SubtaskResponse(BaseModel):
    id: int
    title: str
    completed: bool
    sort_order: int

    class Config:
        from_attributes = True


# Comment schemas
class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Task schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tag_ids: list[int] = []
    priority: str = "medium"
    status: str = "todo"
    deadline: Optional[datetime] = None
    pinned: bool = False
    recurring: Optional[str] = None
    recurring_until: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[list[int]] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    completed: Optional[bool] = None
    deadline: Optional[datetime] = None
    pinned: Optional[bool] = None
    recurring: Optional[str] = None
    recurring_until: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: bool
    pinned: bool
    status: str
    priority: str
    deadline: Optional[datetime]
    tags: list[TagResponse] = []
    subtasks: list[SubtaskResponse] = []
    comment_count: int = 0
    sort_order: int
    recurring: Optional[str]
    recurring_until: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskReorder(BaseModel):
    id: int
    sort_order: int


class TaskReorderRequest(BaseModel):
    tasks: list[TaskReorder]


# Dashboard schemas
class PriorityStats(BaseModel):
    low: int
    medium: int
    high: int


class WeeklyCompletion(BaseModel):
    date: str
    count: int


class DashboardStats(BaseModel):
    total_tasks: int
    completed: int
    pending: int
    overdue: int
    by_priority: PriorityStats
    weekly_completion: list[WeeklyCompletion]


# Time Entry schemas
class TimeEntryCreate(BaseModel):
    note: Optional[str] = None


class TimeEntryLog(BaseModel):
    started_at: datetime
    ended_at: datetime
    note: Optional[str] = None


class TimeEntryResponse(BaseModel):
    id: int
    task_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Template schemas
class TemplateCreate(BaseModel):
    name: str
    title: str
    description: Optional[str] = None
    priority: str = "medium"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    title: str
    description: Optional[str]
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True
