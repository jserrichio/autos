import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_current_user, get_db
from app.models import Attachment, User
from app.routers.maintenance_tasks import _get_task_or_404
from app.schemas import AttachmentOut

router = APIRouter(prefix="/api", tags=["attachments"], dependencies=[Depends(get_current_user)])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def _upload_dir() -> Path:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


@router.post("/tasks/{task_id}/attachments", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    task_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, db, current_user)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de archivo no permitido. Se aceptan JPEG, PNG, WEBP o PDF.",
        )

    contents = file.file.read(settings.max_upload_size_bytes + 1)
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El archivo supera el tamaño máximo permitido ({settings.max_upload_size_bytes // (1024 * 1024)}MB).",
        )

    extension = EXTENSION_BY_CONTENT_TYPE[file.content_type]
    filename_stored = f"{uuid.uuid4().hex}{extension}"
    dest_path = _upload_dir() / filename_stored
    dest_path.write_bytes(contents)

    attachment = Attachment(
        maintenance_task_id=task.id,
        filename_original=file.filename or filename_stored,
        filename_stored=filename_stored,
        content_type=file.content_type,
        size_bytes=len(contents),
        uploaded_by_id=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def _get_attachment_or_404(attachment_id: int, db: Session, current_user: User) -> Attachment:
    attachment = db.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjunto no encontrado")
    if not current_user.is_admin and attachment.task.vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjunto no encontrado")
    return attachment


@router.get("/attachments/{attachment_id}")
def download_attachment(
    attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    attachment = _get_attachment_or_404(attachment_id, db, current_user)
    file_path = _upload_dir() / attachment.filename_stored
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado en disco")
    return FileResponse(
        path=file_path,
        media_type=attachment.content_type,
        filename=attachment.filename_original,
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    attachment = _get_attachment_or_404(attachment_id, db, current_user)
    file_path = _upload_dir() / attachment.filename_stored
    file_path.unlink(missing_ok=True)
    db.delete(attachment)
    db.commit()
