from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Template, Task, User
from app.schemas import TemplateCreate, TemplateUpdate, TemplateResponse, TaskResponse
from app.dependencies import get_current_user
from app.routers.tasks import task_to_response
from sqlalchemy import func

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/", response_model=list[TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Template).filter(Template.user_id == current_user.id).order_by(Template.name).all()


@router.post("/", response_model=TemplateResponse, status_code=201)
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = Template(
        user_id=current_user.id,
        name=data.name,
        title=data.title,
        description=data.description,
        priority=data.priority,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(Template).filter(
        Template.id == template_id, Template.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(Template).filter(
        Template.id == template_id, Template.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()


@router.post("/{template_id}/create-task", response_model=TaskResponse, status_code=201)
def create_task_from_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(Template).filter(
        Template.id == template_id, Template.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    max_order = db.query(func.coalesce(func.max(Task.sort_order), -1)).filter(Task.user_id == current_user.id).scalar() + 1
    task = Task(
        user_id=current_user.id,
        title=template.title,
        description=template.description,
        priority=template.priority,
        sort_order=max_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_response(task)
