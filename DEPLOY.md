# Despliegue en Proxmox

Estado actual: **desplegado** en `https://autos.serrichio.com.ar`.

## Arquitectura real

- **`192.168.35.90`** (host Proxmox, Docker directo sobre el host, sin LXC/VM): corre los 2 contenedores de la app.
  - **`backend`**: la API (FastAPI). Solo alcanzable dentro de la red de Docker.
  - **`web`**: [Caddy](https://caddyserver.com/) sirviendo el frontend compilado + reverse proxy de `/api/*` hacia `backend`, por **HTTP simple** en el puerto `8091` del host (`frontend/Caddyfile` usa `:80` a propósito — sin HTTPS propio).
- **`192.168.35.100`**: nginx existente, ya usado para otros servicios (`figus`, `catalis`, `ha`, `wordpress`). Termina TLS con **certbot** y hace `proxy_pass` hacia `192.168.35.90:8091`. Config en `/etc/nginx/sites-available/autos.conf`, certificado en `/etc/letsencrypt/live/autos.serrichio.com.ar/`, renovación automática vía el `certbot.timer` que ya corre en ese host para todos los certificados.
- DNS: `autos.serrichio.com.ar` resuelve vía el wildcard existente de DuckDNS — no hizo falta ningún cambio de DNS.
- Router: 80/443 ya estaban redirigidos a `192.168.35.100` (nginx) desde antes, para los otros servicios.

Código en `/opt/mantenimiento_autos` en `.90`, copiado con `git archive` (no es un clon git con remoto configurado — actualizar significa repetir el paso 2 de abajo, no `git pull`).

## Repo

```
git@github.com:jserrichio/autos.git
```

## Actualizar la app

Desde tu compu de desarrollo, con los cambios ya commiteados y pusheados:

```bash
cd /home/jserrichio/claude/mantenimiento_autos
git archive HEAD | ssh root@192.168.35.90 "tar -x -C /opt/mantenimiento_autos"
ssh root@192.168.35.90 "cd /opt/mantenimiento_autos && docker compose up -d --build"
```

Las migraciones de base de datos corren solas al arrancar el backend.

## Variables de entorno (ya configuradas en el servidor)

- `/opt/mantenimiento_autos/backend/.env`: `SECRET_KEY` generado con `openssl rand -hex 32`, `CORS_ORIGINS=["https://autos.serrichio.com.ar"]`.
- `/opt/mantenimiento_autos/.env`: `WEB_PORT=8091`.

Ninguno de los dos está en git (están en `.gitignore`) — si hay que recrear el servidor desde cero, hay que volver a generar el `SECRET_KEY` y recrear estos archivos a mano.

## Permisos de los volúmenes

El backend corre en el contenedor con un usuario sin privilegios (uid 1000). `backend/data` y `backend/uploads` en el host ya están con `chown 1000:1000` — si se recrean esas carpetas hay que repetir ese `chown`, si no el backend queda reiniciándose en loop con "unable to open database file".

## Crear un usuario

```bash
ssh root@192.168.35.90
cd /opt/mantenimiento_autos
docker compose exec backend python -m app.scripts.create_user
```

(Se usa `python` directo, no `uv run` — `uv` no está en la imagen final de runtime, solo en el build.)

**Pendiente**: crear el primer usuario admin — no se hizo automáticamente para no hacer pasar una contraseña por el chat. Corré el comando de arriba vos mismo.

## Backups

Los datos viven en `/opt/mantenimiento_autos/backend/data/app.db` (base) y `/opt/mantenimiento_autos/backend/uploads/` (comprobantes) en `192.168.35.90` — **hay que respaldar las dos carpetas juntas**. Ejemplo de cron en ese host:

```bash
# /etc/cron.d/mantenimiento-autos-backup
0 4 * * * root tar -czf /respaldos/mantenimiento-autos-$(date +\%Y\%m\%d).tar.gz -C /opt/mantenimiento_autos/backend data uploads
```

Ajustá `/respaldos` a un destino real (idealmente otro disco o la nube) — todavía no está configurado.

## Si se quiere `git pull` automático a futuro

Hoy el código en el servidor no es un clon git (se copió con `git archive` para no meter una clave de GitHub en el servidor sin que lo pidieras explícitamente). Si en algún momento querés que el servidor pueda hacer `git pull` solo, se puede armar una deploy key de solo lectura dedicada — es un paso aparte, no incluido acá a propósito.
