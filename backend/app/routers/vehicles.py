from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import User, Vehicle
from app.schemas import VehicleCreate, VehicleOut, VehicleUpdate

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"], dependencies=[Depends(get_current_user)])


def _normalize_patente(patente: str) -> str:
    return patente.strip().upper()


@router.get("", response_model=list[VehicleOut])
def list_vehicles(
    include_inactive: bool = False,
    owner_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vehicle)
    if not include_inactive:
        query = query.filter(Vehicle.activo.is_(True))
    if current_user.is_admin:
        if owner_id is not None:
            query = query.filter(Vehicle.owner_id == owner_id)
    else:
        query = query.filter(Vehicle.owner_id == current_user.id)
    return query.order_by(Vehicle.marca, Vehicle.modelo).all()


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    patente = _normalize_patente(vehicle_in.patente)
    if db.query(Vehicle).filter(Vehicle.patente == patente).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un vehículo con esa patente")
    owner_id = current_user.id
    if current_user.is_admin and vehicle_in.owner_id is not None:
        if db.get(User, vehicle_in.owner_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario propietario no existe")
        owner_id = vehicle_in.owner_id
    vehicle = Vehicle(
        **{**vehicle_in.model_dump(exclude={"owner_id"}), "patente": patente}, owner_id=owner_id
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def _get_vehicle_or_404(vehicle_id: int, db: Session, current_user: User) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehículo no encontrado")
    if not current_user.is_admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehículo no encontrado")
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_vehicle_or_404(vehicle_id, db, current_user)


@router.put("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db, current_user)
    patente = _normalize_patente(vehicle_in.patente)
    duplicate = db.query(Vehicle).filter(Vehicle.patente == patente, Vehicle.id != vehicle_id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un vehículo con esa patente")
    for field, value in vehicle_in.model_dump(exclude={"owner_id"}).items():
        setattr(vehicle, field, patente if field == "patente" else value)
    if current_user.is_admin and vehicle_in.owner_id is not None:
        if db.get(User, vehicle_in.owner_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario propietario no existe")
        vehicle.owner_id = vehicle_in.owner_id
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = _get_vehicle_or_404(vehicle_id, db, current_user)
    vehicle.activo = False
    db.commit()


@router.post("/{vehicle_id}/reactivar", response_model=VehicleOut)
def reactivate_vehicle(
    vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    vehicle = _get_vehicle_or_404(vehicle_id, db, current_user)
    vehicle.activo = True
    db.commit()
    db.refresh(vehicle)
    return vehicle
