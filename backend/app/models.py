import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TipoTarea(str, enum.Enum):
    CAMBIO_ACEITE = "cambio_aceite"
    FILTRO_ACEITE = "filtro_aceite"
    FILTRO_AIRE = "filtro_aire"
    FILTRO_COMBUSTIBLE = "filtro_combustible"
    FRENOS = "frenos"
    NEUMATICOS = "neumaticos"
    BATERIA = "bateria"
    CORREA_DISTRIBUCION = "correa_distribucion"
    REFRIGERANTE = "refrigerante"
    REVISION_GENERAL = "revision_general"
    ITV_VTV = "itv_vtv"
    OTRO = "otro"


TIPO_TAREA_LABELS: dict[TipoTarea, str] = {
    TipoTarea.CAMBIO_ACEITE: "Cambio de aceite",
    TipoTarea.FILTRO_ACEITE: "Filtro de aceite",
    TipoTarea.FILTRO_AIRE: "Filtro de aire",
    TipoTarea.FILTRO_COMBUSTIBLE: "Filtro de combustible",
    TipoTarea.FRENOS: "Frenos / pastillas",
    TipoTarea.NEUMATICOS: "Neumáticos / alineación",
    TipoTarea.BATERIA: "Batería",
    TipoTarea.CORREA_DISTRIBUCION: "Correa de distribución",
    TipoTarea.REFRIGERANTE: "Refrigerante",
    TipoTarea.REVISION_GENERAL: "Revisión general / service",
    TipoTarea.ITV_VTV: "ITV / VTV (revisión técnica)",
    TipoTarea.OTRO: "Otro",
}


class TipoCombustible(str, enum.Enum):
    NAFTA_COMUN = "nafta_comun"
    NAFTA_PREMIUM = "nafta_premium"
    DIESEL = "diesel"
    GNC = "gnc"
    OTRO = "otro"


TIPO_COMBUSTIBLE_LABELS: dict[TipoCombustible, str] = {
    TipoCombustible.NAFTA_COMUN: "Nafta común",
    TipoCombustible.NAFTA_PREMIUM: "Nafta premium",
    TipoCombustible.DIESEL: "Diésel",
    TipoCombustible.GNC: "GNC",
    TipoCombustible.OTRO: "Otro",
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    marca: Mapped[str] = mapped_column(String(50), nullable=False)
    modelo: Mapped[str] = mapped_column(String(50), nullable=False)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    patente: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    vin: Mapped[str | None] = mapped_column(String(50), unique=True)
    kilometraje_actual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    color: Mapped[str | None] = mapped_column(String(30))
    alias: Mapped[str | None] = mapped_column(String(50))
    notas: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship()
    tasks: Mapped[list["MaintenanceTask"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )
    fuel_logs: Mapped[list["FuelLog"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    tipo_otro_texto: Mapped[str | None] = mapped_column(String(100))
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    kilometraje: Mapped[int] = mapped_column(Integer, nullable=False)
    costo: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    notas: Mapped[str | None] = mapped_column(Text)
    taller_nombre: Mapped[str | None] = mapped_column(String(100))
    taller_contacto: Mapped[str | None] = mapped_column(String(100))
    proximo_fecha_estimada: Mapped[date | None] = mapped_column(Date)
    proximo_km_estimado: Mapped[int | None] = mapped_column(Integer)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="tasks")
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    maintenance_task_id: Mapped[int] = mapped_column(
        ForeignKey("maintenance_tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename_original: Mapped[str] = mapped_column(String(255), nullable=False)
    filename_stored: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    task: Mapped["MaintenanceTask"] = relationship(back_populates="attachments")


class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    kilometraje: Mapped[int] = mapped_column(Integer, nullable=False)
    litros: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    costo_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tipo_combustible: Mapped[str] = mapped_column(String(20), nullable=False)
    estacion_servicio: Mapped[str | None] = mapped_column(String(100))
    tanque_lleno: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    carga_anterior_registrada: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="fuel_logs")
