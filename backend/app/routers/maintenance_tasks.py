import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import TIPO_OTRO_SLUG, MaintenanceTask, TaskType, User, Vehicle
from app.routers.vehicles import _get_vehicle_or_404
from app.schemas import (
    MaintenanceTaskCreate,
    MaintenanceTaskOut,
    MaintenanceTaskUpdate,
    TaskTypeCreate,
    TaskTypeOut,
    TaskTypeUpdate,
)

router = APIRouter(prefix="/api", tags=["maintenance_tasks"], dependencies=[Depends(get_current_user)])


def _slugify(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")
    return slug or "tipo"


def _unique_slug(db: Session, base_slug: str) -> str:
    slug = base_slug
    suffix = 2
    while db.query(TaskType).filter(TaskType.slug == slug).first() is not None:
        slug = f"{base_slug}_{suffix}"
        suffix += 1
    return slug


def _task_type_out(t: TaskType) -> TaskTypeOut:
    return TaskTypeOut(
        id=t.id,
        value=t.slug,
        label=t.label,
        permite_recordatorio=t.permite_recordatorio,
        es_protegido=t.es_protegido,
        intervalo_km=t.intervalo_km,
        intervalo_meses=t.intervalo_meses,
    )


def _validate_intervalos(type_in: TaskTypeCreate | TaskTypeUpdate) -> None:
    if type_in.intervalo_km is not None and type_in.intervalo_km <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="intervalo_km debe ser mayor a 0")
    if type_in.intervalo_meses is not None and type_in.intervalo_meses <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="intervalo_meses debe ser mayor a 0"
        )


@router.get("/task-types", response_model=list[TaskTypeOut])
def list_task_types(db: Session = Depends(get_db)):
    types = db.query(TaskType).order_by(TaskType.label).all()
    return [_task_type_out(t) for t in types]


@router.post("/task-types", response_model=TaskTypeOut, status_code=status.HTTP_201_CREATED)
def create_task_type(
    type_in: TaskTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    label = type_in.label.strip()
    if not label:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre no puede estar vacío")
    _validate_intervalos(type_in)
    slug = _unique_slug(db, _slugify(label))
    task_type = TaskType(
        slug=slug,
        label=label,
        permite_recordatorio=True,
        es_protegido=False,
        intervalo_km=type_in.intervalo_km,
        intervalo_meses=type_in.intervalo_meses,
        created_by_id=current_user.id,
    )
    db.add(task_type)
    db.commit()
    db.refresh(task_type)
    return _task_type_out(task_type)


def _get_task_type_or_404(type_id: int, db: Session) -> TaskType:
    task_type = db.get(TaskType, type_id)
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de tarea no encontrado")
    return task_type


@router.put("/task-types/{type_id}", response_model=TaskTypeOut)
def update_task_type(type_id: int, type_in: TaskTypeUpdate, db: Session = Depends(get_db)):
    task_type = _get_task_type_or_404(type_id, db)
    label = type_in.label.strip()
    if not label:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre no puede estar vacío")
    if not task_type.permite_recordatorio and (type_in.intervalo_km is not None or type_in.intervalo_meses is not None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Este tipo de tarea no admite recordatorio de próximo mantenimiento",
        )
    _validate_intervalos(type_in)
    task_type.label = label
    task_type.intervalo_km = type_in.intervalo_km
    task_type.intervalo_meses = type_in.intervalo_meses
    db.commit()
    db.refresh(task_type)
    return _task_type_out(task_type)


@router.delete("/task-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_type(type_id: int, db: Session = Depends(get_db)):
    task_type = _get_task_type_or_404(type_id, db)
    if task_type.es_protegido:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este tipo de tarea no se puede eliminar")
    in_use = db.query(MaintenanceTask).filter(MaintenanceTask.tipo == task_type.slug).first() is not None
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Hay tareas que usan este tipo, no se puede eliminar"
        )
    db.delete(task_type)
    db.commit()


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


def _validate_tipo(task_in: MaintenanceTaskCreate, db: Session) -> TaskType:
    task_type = db.query(TaskType).filter(TaskType.slug == task_in.tipo).first()
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo de tarea inválido")
    if task_in.tipo == TIPO_OTRO_SLUG and not task_in.tipo_otro_texto:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tipo_otro_texto es requerido cuando tipo es 'otro'",
        )
    if (task_in.proximo_fecha_estimada or task_in.proximo_km_estimado) and not task_type.permite_recordatorio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Este tipo de tarea no admite recordatorio de próximo mantenimiento",
        )
    return task_type


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
    _validate_tipo(task_in, db)
    task = MaintenanceTask(
        vehicle_id=vehicle_id,
        created_by_id=current_user.id,
        **task_in.model_dump(),
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
    _validate_tipo(task_in, db)
    vehicle = db.get(Vehicle, task.vehicle_id)
    for field, value in task_in.model_dump().items():
        setattr(task, field, value)
    _bump_kilometraje(vehicle, task_in.kilometraje)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(task_id, db, current_user)
    db.delete(task)
    db.commit()
