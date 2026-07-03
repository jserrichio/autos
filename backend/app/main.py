from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin_users, attachments, auth, dashboard, fuel_logs, maintenance_tasks, stats, vehicles

app = FastAPI(title="Mantenimiento de Autos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(maintenance_tasks.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)
app.include_router(admin_users.router)
app.include_router(fuel_logs.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
