# Mantenimiento de Autos

Sistema web familiar para llevar el control de mantenimiento de vehículos: alta/baja/modificación de vehículos y registro de tareas de mantenimiento (con recordatorios y comprobantes adjuntos).

## Stack

- Backend: FastAPI + SQLAlchemy + Alembic + SQLite (`backend/`)
- Frontend: React + TypeScript + Vite (`frontend/`)

## Requisitos

- Python 3.12 (gestionado automáticamente por `uv`)
- Node.js 22+ y npm
- [`uv`](https://docs.astral.sh/uv/)

## Backend

```bash
cd backend
uv sync                                    # instala dependencias
uv run alembic upgrade head                # crea la base de datos (backend/data/app.db)
uv run python -m app.scripts.create_user   # crea el primer usuario familiar
uv run uvicorn app.main:app --reload       # levanta la API en http://localhost:8000
```

Documentación interactiva de la API: http://localhost:8000/docs

Para crear más usuarios familiares una vez logueado, usar `POST /api/auth/register` desde `/docs`.

## Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

El frontend apunta a la API vía la variable `VITE_API_URL` en `frontend/.env` (por defecto `http://localhost:8000/api`).

## Despliegue en producción

Para correrlo en un servidor propio (Docker + HTTPS automático con dominio propio), ver [`DEPLOY.md`](./DEPLOY.md).

## Backups

Los datos viven en dos lugares — hay que respaldar ambos juntos:
- `backend/data/app.db` (base de datos)
- `backend/uploads/` (comprobantes/fotos adjuntas a las tareas)

## Variables de entorno del backend (opcional)

Crear `backend/.env` para sobrescribir defaults (ver `backend/app/config.py`):

```
DATABASE_URL=sqlite:///./data/app.db
SECRET_KEY=<generar con: openssl rand -hex 32>
CORS_ORIGINS=["http://localhost:5173"]
```
