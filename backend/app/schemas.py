from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from datetime import datetime, timezone
from typing import Optional, Literal


class UTCInput(BaseModel):
    @field_validator("deadline", "recurring_until", "started_at", "ended_at", mode="after", check_fields=False)
    @classmethod
    def normalize_datetime(cls, value):
        # SQLite stores timezone-naive UTC; normalize offsets before storage.
        if value is not None and value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value


# Auth schemas
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, value):
        if not 8 <= len(value.encode("utf-8")) <= 72:
            raise ValueError("Password must contain 8 to 72 UTF-8 bytes")
        return value


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# Comment schemas
class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Task schemas
class TaskCreate(UTCInput):
    title: str
    description: Optional[str] = None
    tag_ids: list[int] = []
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["todo", "in_progress", "done"] = "todo"
    deadline: Optional[datetime] = None
    pinned: bool = False
    recurring: Optional[Literal["daily", "weekly", "monthly"]] = None
    recurring_until: Optional[datetime] = None


class TaskUpdate(UTCInput):
    title: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[list[int]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None
    completed: Optional[bool] = None
    deadline: Optional[datetime] = None
    pinned: Optional[bool] = None
    recurring: Optional[Literal["daily", "weekly", "monthly"]] = None
    recurring_until: Optional[datetime] = None


    @field_validator("title", "priority", "status", "completed", "pinned")
    @classmethod
    def non_nullable_fields(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value


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

    model_config = ConfigDict(from_attributes=True)


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


class TimeEntryLog(UTCInput):
    started_at: datetime
    ended_at: datetime
    note: Optional[str] = None


    @model_validator(mode="after")
    def ordered_interval(self):
        if self.ended_at <= self.started_at:
            raise ValueError("ended_at must be after started_at")
        return self


class TimeEntryResponse(BaseModel):
    id: int
    task_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int
    note: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Template schemas
class TemplateCreate(BaseModel):
    name: str
    title: str
    description: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    title: str
    description: Optional[str]
    priority: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskImport(TaskCreate):
    completed: bool = False
    tags: list[str] = []
    tag: Optional[str] = None  # Accept legacy exports.
