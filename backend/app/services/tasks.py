from calendar import monthrange
from datetime import datetime, timedelta
from app.models import Task


def next_deadline(deadline: datetime, frequency: str):
    if frequency == "daily":
        return deadline + timedelta(days=1)
    if frequency == "weekly":
        return deadline + timedelta(weeks=1)
    if frequency == "monthly":
        year = deadline.year + (deadline.month == 12)
        month = deadline.month % 12 + 1
        return deadline.replace(year=year, month=month,
                                day=min(deadline.day, monthrange(year, month)[1]))
    return None


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


