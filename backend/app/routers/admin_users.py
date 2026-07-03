from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin_user, get_db
from app.core.security import hash_password
from app.models import User
from app.schemas import PasswordReset, UserOut, UserUpdate

router = APIRouter(prefix="/api/admin/users", tags=["admin"], dependencies=[Depends(get_current_admin_user)])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.username).all()


def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    duplicate = db.query(User).filter(User.username == user_in.username, User.id != user_id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un usuario con ese nombre")
    user.username = user_in.username
    user.full_name = user_in.full_name
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=UserOut)
def reset_password(user_id: int, payload: PasswordReset, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/activar", response_model=UserOut)
def activate_user(user_id: int, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/desactivar", response_model=UserOut)
def deactivate_user(
    user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)
):
    user = _get_user_or_404(user_id, db)
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No podés desactivar tu propia cuenta")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
