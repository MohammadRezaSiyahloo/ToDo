from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime, timedelta, timezone
import json
import csv
import io
from app.database import get_db
from app.models import Task, Subtask, Comment, User, Tag
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskReorderRequest,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    CommentCreate, CommentResponse,
)
from app.dependencies import get_current_user

from sqlalchemy import func

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def task_to_response(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "completed": task.completed,
        "pinned": task.pinned,
        "status": task.status or "todo",
        "priority": task.priority,
        "deadline": task.deadline,
        "tags": task.tags_list or [],
        "subtasks": task.subtasks,
        "comment_count": len(task.comments),
        "sort_order": task.sort_order,
        "recurring": task.recurring,
        "recurring_until": task.recurring_until,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


# --- List & Create (no conflict with /{task_id}) ---

@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    priority: Optional[str] = None,
    completed: Optional[bool] = None,
    pinned: Optional[bool] = None,
    today: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if priority is not None:
        query = query.filter(Task.priority == priority)
    if completed is not None:
        query = query.filter(Task.completed == completed)
    if pinned is not None:
        query = query.filter(Task.pinned == pinned)
    if today:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today_start + timedelta(days=1)
        week_ago = today_start - timedelta(days=7)
        query = query.filter(
            Task.completed == False,
            Task.deadline != None,
            Task.deadline < tomorrow,
            Task.deadline >= week_ago,
        )
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term),
                Task.tag.ilike(search_term),
            )
        )

    tasks = query.order_by(Task.pinned.desc(), Task.sort_order, Task.id.desc()).all()
    return [task_to_response(t) for t in tasks]


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    max_order = db.query(func.coalesce(func.max(Task.sort_order), -1)).filter(Task.user_id == current_user.id).scalar() + 1
    task = Task(
        user_id=current_user.id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        status=task_data.status,
        deadline=task_data.deadline,
        pinned=task_data.pinned,
        recurring=task_data.recurring,
        recurring_until=task_data.recurring_until,
        sort_order=max_order,
    )

    # Handle multiple tags
    if task_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(task_data.tag_ids), Tag.user_id == current_user.id).all()
        task.tags_list = tags

    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_response(task)


# --- Named routes BEFORE /{task_id} to avoid path conflicts ---

@router.patch("/reorder")
def reorder_tasks(
    reorder_data: TaskReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_ids = [t.id for t in reorder_data.tasks]
    tasks = db.query(Task).filter(Task.id.in_(task_ids), Task.user_id == current_user.id).all()
    task_map = {t.id: t for t in tasks}

    for item in reorder_data.tasks:
        if item.id in task_map:
            task_map[item.id].sort_order = item.sort_order

    db.commit()
    return {"message": "Tasks reordered successfully"}


@router.delete("/clear-completed", status_code=204)
def clear_completed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Task).filter(Task.user_id == current_user.id, Task.completed == True).delete()
    db.commit()


@router.get("/export/json")
def export_tasks_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    data = [
        {
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "completed": t.completed,
            "pinned": t.pinned,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "tags": [tag.name for tag in t.tags_list],
        }
        for t in tasks
    ]
    return data


@router.post("/import/json")
def import_tasks_json(
    tasks_data: list[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    imported = 0
    for item in tasks_data:
        task = Task(
            user_id=current_user.id,
            title=item.get("title", "Untitled"),
            description=item.get("description"),
            priority=item.get("priority", "medium"),
            completed=item.get("completed", False),
            deadline=datetime.fromisoformat(item["deadline"]) if item.get("deadline") else None,
            tag=item.get("tag"),
            pinned=item.get("pinned", False),
        )
        db.add(task)
        imported += 1
    db.commit()
    return {"imported": imported}


# --- /{task_id} routes ---

@router.post("/{task_id}/duplicate", response_model=TaskResponse, status_code=201)
def duplicate_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    max_order = db.query(func.coalesce(func.max(Task.sort_order), -1)).filter(Task.user_id == current_user.id).scalar() + 1
    new_task = Task(
        user_id=current_user.id,
        title=f"{task.title} (copy)",
        description=task.description,
        priority=task.priority,
        status="todo",
        deadline=task.deadline,
        pinned=False,
        recurring=task.recurring,
        recurring_until=task.recurring_until,
        sort_order=max_order,
        tags_list=task.tags_list,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return task_to_response(new_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)

    # Handle tag_ids separately (many-to-many)
    tag_ids = update_data.pop("tag_ids", None)
    if tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == current_user.id).all()
        task.tags_list = tags

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task_to_response(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.patch("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.completed = not task.completed
    # Sync status with completed state
    task.status = "done" if task.completed else "todo"

    # Recurring: create next instance on completion
    if task.completed and task.recurring and task.recurring_until and task.deadline:
        now = datetime.now(timezone.utc)
        if now < task.recurring_until:
            if task.recurring == "daily":
                next_deadline = task.deadline + timedelta(days=1)
            elif task.recurring == "weekly":
                next_deadline = task.deadline + timedelta(weeks=1)
            elif task.recurring == "monthly":
                next_deadline = task.deadline + timedelta(days=30)
            else:
                next_deadline = None

            if next_deadline and next_deadline <= task.recurring_until:
                new_task = Task(
                    user_id=task.user_id,
                    title=task.title,
                    description=task.description,
                    priority=task.priority,
                    deadline=next_deadline,
                    tag=task.tag,
                    pinned=task.pinned,
                    recurring=task.recurring,
                    recurring_until=task.recurring_until,
                    sort_order=task.sort_order,
                )
                db.add(new_task)

    db.commit()
    db.refresh(task)
    return task_to_response(task)


# --- Subtasks ---

@router.get("/{task_id}/subtasks", response_model=list[SubtaskResponse])
def list_subtasks(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.subtasks


@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
def create_subtask(
    task_id: int,
    subtask_data: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    max_order = len(task.subtasks)
    subtask = Subtask(task_id=task_id, title=subtask_data.title, sort_order=max_order)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(
    task_id: int,
    subtask_id: int,
    subtask_data: SubtaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id, Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    update_data = subtask_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
def delete_subtask(
    task_id: int,
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id, Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(subtask)
    db.commit()


# --- Comments ---

@router.get("/{task_id}/comments", response_model=list[CommentResponse])
def list_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.comments


@router.post("/{task_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(
    task_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = Comment(task_id=task_id, user_id=current_user.id, content=comment_data.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{task_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    task_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = db.query(Comment).filter(
        Comment.id == comment_id, Comment.task_id == task_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
