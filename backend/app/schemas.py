from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models import TipoCombustible, TipoTarea


def blank_to_none(value: str | None) -> str | None:
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


# --- Auth ---


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: str | None
    is_active: bool
    is_admin: bool


class UserUpdate(BaseModel):
    username: str
    email: EmailStr
    full_name: str | None = None

    _blank_full_name = field_validator("full_name", mode="before")(blank_to_none)


class PasswordReset(BaseModel):
    new_password: str


# --- Vehicles ---


class VehicleCreate(BaseModel):
    marca: str
    modelo: str
    anio: int
    patente: str
    vin: str | None = None
    kilometraje_actual: int = 0
    color: str | None = None
    alias: str | None = None
    notas: str | None = None
    owner_id: int | None = None

    _blank_vin = field_validator("vin", "color", "alias", "notas", mode="before")(blank_to_none)


class VehicleUpdate(VehicleCreate):
    pass


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    marca: str
    modelo: str
    anio: int
    patente: str
    vin: str | None
    kilometraje_actual: int
    color: str | None
    alias: str | None
    notas: str | None
    activo: bool
    owner_id: int
    created_at: datetime
    updated_at: datetime


# --- Maintenance tasks ---


class MaintenanceTaskCreate(BaseModel):
    tipo: TipoTarea
    tipo_otro_texto: str | None = None
    fecha: date
    kilometraje: int
    costo: Decimal | None = None
    notas: str | None = None
    taller_nombre: str | None = None
    taller_contacto: str | None = None
    proximo_fecha_estimada: date | None = None
    proximo_km_estimado: int | None = None

    _blank_strs = field_validator("tipo_otro_texto", "notas", "taller_nombre", "taller_contacto", mode="before")(
        blank_to_none
    )
    _blank_dates = field_validator("proximo_fecha_estimada", mode="before")(blank_to_none)


class MaintenanceTaskUpdate(MaintenanceTaskCreate):
    pass


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename_original: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class MaintenanceTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    tipo: TipoTarea
    tipo_otro_texto: str | None
    fecha: date
    kilometraje: int
    costo: Decimal | None
    notas: str | None
    taller_nombre: str | None
    taller_contacto: str | None
    proximo_fecha_estimada: date | None
    proximo_km_estimado: int | None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentOut] = []


class TaskTypeOut(BaseModel):
    value: str
    label: str


class UpcomingItem(BaseModel):
    vehicle_id: int
    vehicle_label: str
    tipo: TipoTarea
    tipo_label: str
    estado: str  # "vencido" | "proximo" | "ok"
    proximo_fecha_estimada: date | None
    proximo_km_estimado: int | None
    kilometraje_actual: int


# --- Fuel logs ---


class FuelLogCreate(BaseModel):
    fecha: date
    kilometraje: int
    litros: Decimal
    costo_total: Decimal
    tipo_combustible: TipoCombustible
    estacion_servicio: str | None = None
    tanque_lleno: bool = True
    carga_anterior_registrada: bool = True

    _blank_estacion = field_validator("estacion_servicio", mode="before")(blank_to_none)


class FuelLogUpdate(FuelLogCreate):
    pass


class FuelLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    fecha: date
    kilometraje: int
    litros: Decimal
    costo_total: Decimal
    tipo_combustible: TipoCombustible
    estacion_servicio: str | None
    tanque_lleno: bool
    carga_anterior_registrada: bool
    created_at: datetime
    updated_at: datetime
    rendimiento_km_l: float | None = None


class FuelLogListOut(BaseModel):
    items: list[FuelLogOut]
    consumo_promedio_km_l: float | None


class FuelTypeOut(BaseModel):
    value: str
    label: str


# --- Vehicle stats ---


class GastoPorTipo(BaseModel):
    tipo: str
    tipo_label: str
    total: Decimal


class GastoPorAnio(BaseModel):
    anio: int
    mantenimiento: Decimal
    combustible: Decimal


class KmPorAnio(BaseModel):
    anio: int
    km: int


class GastoPorMes(BaseModel):
    mes: str  # "YYYY-MM"
    mantenimiento: Decimal
    combustible: Decimal


class OdometroLectura(BaseModel):
    fecha: date
    kilometraje: int


class VehicleStatsOut(BaseModel):
    gasto_mantenimiento_total: Decimal
    gasto_mantenimiento_por_tipo: list[GastoPorTipo]
    gasto_combustible_total: Decimal
    precio_promedio_litro: Decimal | None
    gasto_por_anio: list[GastoPorAnio]
    gasto_por_mes: list[GastoPorMes]
    km_por_anio: list[KmPorAnio]
    costo_por_km: Decimal | None
    odometro_lecturas: list[OdometroLectura]
    promedio_km_dia: float | None
    estimado_km_anio: float | None
