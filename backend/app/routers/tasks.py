from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime, timedelta, timezone
import json
from app.database import get_db
from app.models import Task, Subtask, Comment, User, Tag
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskReorderRequest,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    CommentCreate, CommentResponse, TaskImport,
)
from app.dependencies import get_current_user

from sqlalchemy import func

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


from app.services.tasks import task_to_response, next_deadline


# --- List & Create (no conflict with /{task_id}) ---

@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    tag_id: Optional[int] = None,
    priority: Optional[str] = None,
    completed: Optional[bool] = None,
    pinned: Optional[bool] = None,
    today: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if tag_id is not None:
        query = query.filter(Task.tags_list.any(Tag.id == tag_id))
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
                Task.tags_list.any(Tag.name.ilike(search_term)),
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
        completed=task_data.status == "done",
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
            "status": t.status,
            "recurring": t.recurring,
            "recurring_until": t.recurring_until.isoformat() if t.recurring_until else None,
        }
        for t in tasks
    ]
    return data


@router.post("/import/json")
def import_tasks_json(
    tasks_data: list[TaskImport],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_tags = {tag.name: tag for tag in db.query(Tag).filter(Tag.user_id == current_user.id)}
    for item in tasks_data:
        names = list(dict.fromkeys(item.tags + ([item.tag] if item.tag else [])))
        tags = []
        for name in names:
            if name not in existing_tags:
                existing_tags[name] = Tag(user_id=current_user.id, name=name)
                db.add(existing_tags[name])
            tags.append(existing_tags[name])
        task = Task(
            user_id=current_user.id, title=item.title, description=item.description,
            priority=item.priority, completed=item.completed,
            status="done" if item.completed else ("todo" if item.status == "done" else item.status),
            deadline=item.deadline, pinned=item.pinned, tags_list=tags,
            recurring=item.recurring, recurring_until=item.recurring_until,
        )
        db.add(task)
    db.commit()
    return {"imported": len(tasks_data)}


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

    if "status" in update_data:
        update_data["completed"] = update_data["status"] == "done"
    elif "completed" in update_data:
        update_data["status"] = "done" if update_data["completed"] else "todo"

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
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if now < task.recurring_until:
            following = next_deadline(task.deadline, task.recurring)
            if following and following <= task.recurring_until:
                db.add(Task(
                    user_id=task.user_id, title=task.title, description=task.description,
                    priority=task.priority, deadline=following, tags_list=list(task.tags_list),
                    pinned=task.pinned, recurring=task.recurring,
                    recurring_until=task.recurring_until, sort_order=task.sort_order,
                ))

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
    if "status" in update_data:
        update_data["completed"] = update_data["status"] == "done"
    elif "completed" in update_data:
        update_data["status"] = "done" if update_data["completed"] else "todo"

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
