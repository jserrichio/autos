from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import FuelLog, MaintenanceTask, TaskType, User
from app.routers.vehicles import _get_vehicle_or_404
from app.schemas import (
    GastoPorAnio,
    GastoPorMes,
    GastoPorTipo,
    KmPorAnio,
    OdometroLectura,
    VehicleStatsOut,
)

router = APIRouter(prefix="/api/vehicles", tags=["stats"], dependencies=[Depends(get_current_user)])


@router.get("/{vehicle_id}/stats", response_model=VehicleStatsOut)
def get_vehicle_stats(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_vehicle_or_404(vehicle_id, db, current_user)

    tasks = db.query(MaintenanceTask).filter(MaintenanceTask.vehicle_id == vehicle_id).all()
    fuel_logs = db.query(FuelLog).filter(FuelLog.vehicle_id == vehicle_id).all()

    # --- Gasto de mantenimiento ---
    gasto_mantenimiento_total = sum((t.costo for t in tasks if t.costo is not None), Decimal("0"))

    tipo_labels = {t.slug: t.label for t in db.query(TaskType).all()}
    gasto_por_tipo_dict: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for t in tasks:
        if t.costo is not None:
            gasto_por_tipo_dict[t.tipo] += t.costo
    gasto_mantenimiento_por_tipo = sorted(
        (
            GastoPorTipo(tipo=tipo, tipo_label=tipo_labels.get(tipo, tipo), total=total)
            for tipo, total in gasto_por_tipo_dict.items()
        ),
        key=lambda g: g.total,
        reverse=True,
    )

    # --- Gasto de combustible ---
    gasto_combustible_total = sum((f.costo_total for f in fuel_logs), Decimal("0"))
    litros_totales = sum((f.litros for f in fuel_logs), Decimal("0"))
    precio_promedio_litro = (
        (gasto_combustible_total / litros_totales) if litros_totales > 0 else None
    )

    # --- Gasto por año (une años de ambas fuentes) ---
    gasto_mant_por_anio: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for t in tasks:
        if t.costo is not None:
            gasto_mant_por_anio[t.fecha.year] += t.costo
    gasto_comb_por_anio: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for f in fuel_logs:
        gasto_comb_por_anio[f.fecha.year] += f.costo_total

    anios = sorted(set(gasto_mant_por_anio) | set(gasto_comb_por_anio))
    gasto_por_anio = [
        GastoPorAnio(
            anio=anio,
            mantenimiento=gasto_mant_por_anio.get(anio, Decimal("0")),
            combustible=gasto_comb_por_anio.get(anio, Decimal("0")),
        )
        for anio in anios
    ]

    # --- Km por año y costo por km: a partir de todas las lecturas de odómetro con fecha ---
    lecturas = [(t.fecha, t.kilometraje) for t in tasks] + [(f.fecha, f.kilometraje) for f in fuel_logs]

    km_por_anio_dict: dict[int, list[int]] = defaultdict(list)
    for fecha, km in lecturas:
        km_por_anio_dict[fecha.year].append(km)
    km_por_anio = [
        KmPorAnio(anio=anio, km=max(kms) - min(kms))
        for anio, kms in sorted(km_por_anio_dict.items())
        if len(kms) >= 2
    ]

    costo_por_km: Decimal | None = None
    if len(lecturas) >= 2:
        todos_los_km = [km for _, km in lecturas]
        rango_km = max(todos_los_km) - min(todos_los_km)
        if rango_km > 0:
            costo_por_km = (gasto_mantenimiento_total + gasto_combustible_total) / rango_km

    # --- Gasto por mes (une meses de ambas fuentes) ---
    gasto_mant_por_mes: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for t in tasks:
        if t.costo is not None:
            gasto_mant_por_mes[f"{t.fecha.year:04d}-{t.fecha.month:02d}"] += t.costo
    gasto_comb_por_mes: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for f in fuel_logs:
        gasto_comb_por_mes[f"{f.fecha.year:04d}-{f.fecha.month:02d}"] += f.costo_total

    meses = sorted(set(gasto_mant_por_mes) | set(gasto_comb_por_mes))
    gasto_por_mes = [
        GastoPorMes(
            mes=mes,
            mantenimiento=gasto_mant_por_mes.get(mes, Decimal("0")),
            combustible=gasto_comb_por_mes.get(mes, Decimal("0")),
        )
        for mes in meses
    ]

    # --- Odómetro en el tiempo + proyección ---
    lecturas_ordenadas = sorted(lecturas)
    odometro_lecturas = [OdometroLectura(fecha=fecha, kilometraje=km) for fecha, km in lecturas_ordenadas]

    promedio_km_dia: float | None = None
    estimado_km_anio: float | None = None
    if len(lecturas_ordenadas) >= 2:
        primera_fecha, primer_km = lecturas_ordenadas[0]
        ultima_fecha, ultimo_km = lecturas_ordenadas[-1]
        dias = (ultima_fecha - primera_fecha).days
        if dias > 0:
            promedio_km_dia = (ultimo_km - primer_km) / dias
            estimado_km_anio = promedio_km_dia * 365

    return VehicleStatsOut(
        gasto_mantenimiento_total=gasto_mantenimiento_total,
        gasto_mantenimiento_por_tipo=gasto_mantenimiento_por_tipo,
        gasto_combustible_total=gasto_combustible_total,
        precio_promedio_litro=precio_promedio_litro,
        gasto_por_anio=gasto_por_anio,
        gasto_por_mes=gasto_por_mes,
        km_por_anio=km_por_anio,
        costo_por_km=costo_por_km,
        odometro_lecturas=odometro_lecturas,
        promedio_km_dia=promedio_km_dia,
        estimado_km_anio=estimado_km_anio,
    )
