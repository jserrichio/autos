from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import MaintenanceTask, TIPO_TAREA_LABELS, TipoTarea, User, Vehicle
from app.routers.vehicles import _get_vehicle_or_404
from app.schemas import (
    MaintenanceTaskCreate,
    MaintenanceTaskOut,
    MaintenanceTaskUpdate,
    TaskTypeOut,
)

router = APIRouter(prefix="/api", tags=["maintenance_tasks"], dependencies=[Depends(get_current_user)])


@router.get("/task-types", response_model=list[TaskTypeOut])
def list_task_types():
    return [TaskTypeOut(value=t.value, label=label) for t, label in TIPO_TAREA_LABELS.items()]


def _bump_kilometraje(vehicle: Vehicle, kilometraje: int) -> None:
    if kilometraje > vehicle.kilometraje_actual:
        vehicle.kilometraje_actual = kilometraje


def _get_task_or_404(task_id: int, db: Session, current_user: User) -> MaintenanceTask:
    task = db.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    if not current_user.is_admin and task.vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


def _validate_tipo_otro(task_in: MaintenanceTaskCreate) -> None:
    if task_in.tipo == TipoTarea.OTRO and not task_in.tipo_otro_texto:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tipo_otro_texto es requerido cuando tipo es 'otro'",
        )


@router.get("/vehicles/{vehicle_id}/tasks", response_model=list[MaintenanceTaskOut])
def list_tasks(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_vehicle_or_404(vehicle_id, db, current_user)
    return (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.vehicle_id == vehicle_id)
        .order_by(MaintenanceTask.fecha.desc())
        .all()
    )


@router.post("/vehicles/{vehicle_id}/tasks", response_model=MaintenanceTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    vehicle_id: int,
    task_in: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db, current_user)
    _validate_tipo_otro(task_in)
    task = MaintenanceTask(
        vehicle_id=vehicle_id,
        created_by_id=current_user.id,
        **task_in.model_dump(exclude={"tipo"}),
        tipo=task_in.tipo.value,
    )
    _bump_kilometraje(vehicle, task_in.kilometraje)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=MaintenanceTaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_task_or_404(task_id, db, current_user)


@router.put("/tasks/{task_id}", response_model=MaintenanceTaskOut)
def update_task(
    task_id: int,
    task_in: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, db, current_user)
    _validate_tipo_otro(task_in)
    vehicle = db.get(Vehicle, task.vehicle_id)
    for field, value in task_in.model_dump(exclude={"tipo"}).items():
        setattr(task, field, value)
    task.tipo = task_in.tipo.value
    _bump_kilometraje(vehicle, task_in.kilometraje)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(task_id, db, current_user)
    db.delete(task)
    db.commit()
