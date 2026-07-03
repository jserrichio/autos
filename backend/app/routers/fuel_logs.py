from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import TIPO_COMBUSTIBLE_LABELS, FuelLog, User
from app.routers.maintenance_tasks import _bump_kilometraje
from app.routers.vehicles import _get_vehicle_or_404
from app.schemas import FuelLogCreate, FuelLogListOut, FuelLogOut, FuelLogUpdate, FuelTypeOut

router = APIRouter(prefix="/api", tags=["fuel_logs"], dependencies=[Depends(get_current_user)])


@router.get("/fuel-types", response_model=list[FuelTypeOut])
def list_fuel_types():
    return [FuelTypeOut(value=t.value, label=label) for t, label in TIPO_COMBUSTIBLE_LABELS.items()]


def _get_fuel_log_or_404(fuel_log_id: int, db: Session, current_user: User) -> FuelLog:
    fuel_log = db.get(FuelLog, fuel_log_id)
    if fuel_log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga de combustible no encontrada")
    if not current_user.is_admin and fuel_log.vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga de combustible no encontrada")
    return fuel_log


def _with_rendimiento(logs: list[FuelLog]) -> list[FuelLogOut]:
    """Calcula el rendimiento (km/l) de cada carga con tanque lleno.

    El combustible consumido entre dos cargas llenas consecutivas es la suma de
    litros de todas las cargas posteriores a la primera (parciales incluidas),
    no solo los litros de la carga de cierre.

    Si una carga tiene `carga_anterior_registrada=False` (el usuario avisa que
    cargó combustible sin anotarlo antes de esta carga), se descarta todo lo
    acumulado hasta ese punto: ese tramo queda sin rendimiento calculable, y la
    carga vuelve a ser un punto de referencia válido a partir de aquí.
    """
    ordered = sorted(logs, key=lambda x: (x.fecha, x.kilometraje))
    results: list[FuelLogOut] = []
    litros_acumulados = 0.0
    ultima_carga_llena_km: int | None = None

    for log in ordered:
        if not log.carga_anterior_registrada:
            litros_acumulados = 0.0
            ultima_carga_llena_km = None

        litros_acumulados += float(log.litros)
        rendimiento: float | None = None
        if log.tanque_lleno:
            if ultima_carga_llena_km is not None and log.kilometraje > ultima_carga_llena_km:
                km_delta = log.kilometraje - ultima_carga_llena_km
                if litros_acumulados > 0:
                    rendimiento = round(km_delta / litros_acumulados, 2)
            ultima_carga_llena_km = log.kilometraje
            litros_acumulados = 0.0
        results.append(FuelLogOut.model_validate(log, from_attributes=True).model_copy(update={"rendimiento_km_l": rendimiento}))

    results.sort(key=lambda x: (x.fecha, x.kilometraje), reverse=True)
    return results


@router.get("/vehicles/{vehicle_id}/fuel-logs", response_model=FuelLogListOut)
def list_fuel_logs(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_vehicle_or_404(vehicle_id, db, current_user)
    logs = db.query(FuelLog).filter(FuelLog.vehicle_id == vehicle_id).all()
    items = _with_rendimiento(logs)
    valores = [item.rendimiento_km_l for item in items if item.rendimiento_km_l is not None]
    promedio = round(sum(valores) / len(valores), 2) if valores else None
    return FuelLogListOut(items=items, consumo_promedio_km_l=promedio)


@router.post("/vehicles/{vehicle_id}/fuel-logs", response_model=FuelLogOut, status_code=status.HTTP_201_CREATED)
def create_fuel_log(
    vehicle_id: int,
    fuel_log_in: FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db, current_user)
    fuel_log = FuelLog(
        vehicle_id=vehicle_id,
        created_by_id=current_user.id,
        **fuel_log_in.model_dump(exclude={"tipo_combustible"}),
        tipo_combustible=fuel_log_in.tipo_combustible.value,
    )
    _bump_kilometraje(vehicle, fuel_log_in.kilometraje)
    db.add(fuel_log)
    db.commit()
    db.refresh(fuel_log)
    return fuel_log


@router.get("/fuel-logs/{fuel_log_id}", response_model=FuelLogOut)
def get_fuel_log(fuel_log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_fuel_log_or_404(fuel_log_id, db, current_user)


@router.put("/fuel-logs/{fuel_log_id}", response_model=FuelLogOut)
def update_fuel_log(
    fuel_log_id: int,
    fuel_log_in: FuelLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fuel_log = _get_fuel_log_or_404(fuel_log_id, db, current_user)
    for field, value in fuel_log_in.model_dump(exclude={"tipo_combustible"}).items():
        setattr(fuel_log, field, value)
    fuel_log.tipo_combustible = fuel_log_in.tipo_combustible.value
    _bump_kilometraje(fuel_log.vehicle, fuel_log_in.kilometraje)
    db.commit()
    db.refresh(fuel_log)
    return fuel_log


@router.delete("/fuel-logs/{fuel_log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fuel_log(
    fuel_log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    fuel_log = _get_fuel_log_or_404(fuel_log_id, db, current_user)
    db.delete(fuel_log)
    db.commit()
