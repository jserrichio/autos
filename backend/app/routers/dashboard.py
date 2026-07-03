from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import TIPO_TAREA_LABELS, MaintenanceTask, TipoTarea, User, Vehicle
from app.schemas import UpcomingItem

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])

PROXIMO_DIAS_VENTANA = 30
PROXIMO_KM_VENTANA = 1000


@router.get("/upcoming", response_model=list[UpcomingItem])
def upcoming(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    latest_dates = (
        db.query(
            MaintenanceTask.vehicle_id,
            MaintenanceTask.tipo,
            func.max(MaintenanceTask.fecha).label("max_fecha"),
        )
        .group_by(MaintenanceTask.vehicle_id, MaintenanceTask.tipo)
        .subquery()
    )

    latest_tasks_query = db.query(MaintenanceTask).join(
        latest_dates,
        (MaintenanceTask.vehicle_id == latest_dates.c.vehicle_id)
        & (MaintenanceTask.tipo == latest_dates.c.tipo)
        & (MaintenanceTask.fecha == latest_dates.c.max_fecha),
    )
    if not current_user.is_admin:
        latest_tasks_query = latest_tasks_query.join(Vehicle).filter(Vehicle.owner_id == current_user.id)
    latest_tasks = latest_tasks_query.all()

    today = date.today()
    results: list[UpcomingItem] = []

    for task in latest_tasks:
        if task.proximo_fecha_estimada is None and task.proximo_km_estimado is None:
            continue

        vehicle: Vehicle = task.vehicle
        if not vehicle.activo:
            continue

        vencido_por_fecha = (
            task.proximo_fecha_estimada is not None and task.proximo_fecha_estimada < today
        )
        vencido_por_km = (
            task.proximo_km_estimado is not None
            and vehicle.kilometraje_actual >= task.proximo_km_estimado
        )

        proximo_por_fecha = (
            task.proximo_fecha_estimada is not None
            and today <= task.proximo_fecha_estimada <= today + timedelta(days=PROXIMO_DIAS_VENTANA)
        )
        proximo_por_km = (
            task.proximo_km_estimado is not None
            and vehicle.kilometraje_actual >= task.proximo_km_estimado - PROXIMO_KM_VENTANA
        )

        if vencido_por_fecha or vencido_por_km:
            estado = "vencido"
        elif proximo_por_fecha or proximo_por_km:
            estado = "proximo"
        else:
            continue

        tipo = TipoTarea(task.tipo)
        results.append(
            UpcomingItem(
                vehicle_id=vehicle.id,
                vehicle_label=f"{vehicle.marca} {vehicle.modelo} ({vehicle.patente})",
                tipo=tipo,
                tipo_label=TIPO_TAREA_LABELS[tipo],
                estado=estado,
                proximo_fecha_estimada=task.proximo_fecha_estimada,
                proximo_km_estimado=task.proximo_km_estimado,
                kilometraje_actual=vehicle.kilometraje_actual,
            )
        )

    results.sort(key=lambda item: (item.estado != "vencido", item.vehicle_label))
    return results
