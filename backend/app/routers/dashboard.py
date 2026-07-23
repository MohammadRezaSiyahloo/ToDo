from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import Task, User
from app.schemas import DashboardStats, PriorityStats, WeeklyCompletion
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_tasks = db.query(Task).filter(Task.user_id == current_user.id)

    total_tasks = user_tasks.count()
    completed = user_tasks.filter(Task.completed == True).count()
    pending = total_tasks - completed
    now = datetime.now(timezone.utc)
    overdue = user_tasks.filter(
        Task.completed == False, Task.deadline != None, Task.deadline < now
    ).count()

    # Priority breakdown
    low = user_tasks.filter(Task.priority == "low").count()
    medium = user_tasks.filter(Task.priority == "medium").count()
    high = user_tasks.filter(Task.priority == "high").count()

    # Weekly completion (last 7 days)
    weekly = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = (
            user_tasks.filter(
                Task.completed == True,
                Task.updated_at >= day_start,
                Task.updated_at < day_end,
            ).count()
        )
        weekly.append(WeeklyCompletion(date=day_start.strftime("%a"), count=count))

    return DashboardStats(
        total_tasks=total_tasks,
        completed=completed,
        pending=pending,
        overdue=overdue,
        by_priority=PriorityStats(low=low, medium=medium, high=high),
        weekly_completion=weekly,
    )
