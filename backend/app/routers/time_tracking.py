from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models import Task, TimeEntry, User
from app.schemas import TimeEntryLog, TimeEntryResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/time", tags=["time-tracking"])


# Named routes BEFORE /{task_id} to avoid path conflicts

@router.get("/running", response_model=TimeEntryResponse | None)
def get_running_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.ended_at == None,
    ).first()
    return entry


@router.post("/{task_id}/start", response_model=TimeEntryResponse)
def start_timer(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Stop any running timer for this user
    running = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.ended_at == None,
    ).first()
    if running:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        running.ended_at = now
        running.duration_seconds = int((now - running.started_at).total_seconds())

    entry = TimeEntry(
        task_id=task_id,
        user_id=current_user.id,
        started_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{task_id}/stop", response_model=TimeEntryResponse)
def stop_timer(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeEntry).filter(
        TimeEntry.task_id == task_id,
        TimeEntry.user_id == current_user.id,
        TimeEntry.ended_at == None,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No running timer found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    entry.ended_at = now
    entry.duration_seconds = int((now - entry.started_at).total_seconds())
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{task_id}/log", response_model=TimeEntryResponse, status_code=201)
def log_time(
    task_id: int,
    data: TimeEntryLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    duration = int((data.ended_at - data.started_at).total_seconds())
    entry = TimeEntry(
        task_id=task_id,
        user_id=current_user.id,
        started_at=data.started_at,
        ended_at=data.ended_at,
        duration_seconds=duration,
        note=data.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{task_id}", response_model=list[TimeEntryResponse])
def list_time_entries(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db.query(TimeEntry).filter(
        TimeEntry.task_id == task_id,
        TimeEntry.user_id == current_user.id,
    ).order_by(TimeEntry.started_at.desc()).all()
