# Despliegue en Proxmox (Docker directo sobre el host)

Guía para correr la app en tu servidor Proxmox, accesible por internet con HTTPS y tu propio dominio. Se corre con Docker directo sobre el host de Proxmox (sin LXC ni VM intermedia).

## Arquitectura

Dos contenedores:
- **`backend`**: la API (FastAPI). No se expone directo a internet, solo es alcanzable por el contenedor `web`.
- **`web`**: [Caddy](https://caddyserver.com/), sirve el frontend ya compilado y hace de reverse proxy de `/api/*` hacia `backend`. Consigue y renueva el certificado HTTPS solo (Let's Encrypt), sin pasos manuales.

## 1. Preparar el servidor

En el host de Proxmox (por SSH):

```bash
# Docker + el plugin de compose, si no los tenés ya
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

## 2. Llevar el código

```bash
git clone <URL-de-tu-repo> mantenimiento_autos
cd mantenimiento_autos
```

(Si todavía no subiste el repo a GitHub/GitLab, hacelo antes de este paso — ver la nota al final.)

## 3. Configurar variables de entorno

```bash
cp backend/.env.production.example backend/.env
```

Editá `backend/.env`:
- `SECRET_KEY`: generá uno único con `openssl rand -hex 32` y pegalo ahí (no uses el de ejemplo).
- `CORS_ORIGINS`: poné tu dominio real, ej. `["https://autos.tudominio.com"]`.

```bash
cp .env.production.example .env
```

Editá `.env` (en la raíz) y poné tu dominio real en `SITE_ADDRESS`, ej.:
```
SITE_ADDRESS=autos.tudominio.com
```

## 4. Preparar las carpetas de datos persistentes

```bash
mkdir -p backend/data backend/uploads
chown 1000:1000 backend/data backend/uploads
```

(El backend corre dentro del contenedor con un usuario sin privilegios, uid 1000 — sin este `chown` no va a poder crear la base de datos.)

## 5. DNS y router

- En tu proveedor de dominio, creá un registro **A** para `autos.tudominio.com` (o el subdominio que elijas) apuntando a tu **IP pública** de casa.
  - Si tu ISP te da una IP dinámica (lo más común en conexiones residenciales), vas a necesitar un cliente de DNS dinámico (ej. si tu proveedor de dominio lo soporta, o un servicio como DuckDNS/Cloudflare con un updater) para que el registro se actualice solo cuando cambie tu IP. Avisame si querés que armemos esto también.
- En tu router, redirigí (port forward) los puertos **80** y **443** hacia la IP local del servidor Proxmox. Los dos son necesarios: 80 para la validación inicial del certificado HTTPS, 443 para el tráfico normal.

## 6. Levantar todo

```bash
docker compose up -d --build
```

Mirá los logs hasta que se estabilice:
```bash
docker compose logs -f
```

## 7. Crear tu usuario admin

```bash
docker compose exec backend python -m app.scripts.create_user
```

Te va a preguntar usuario, contraseña, nombre, y si es administrador — respondé `s` para tu cuenta.

## 8. Verificar

Desde tu celular con datos móviles (no en la wifi de casa, para probar que realmente entra por internet):
```
https://autos.tudominio.com
```

## Actualizar la app más adelante

```bash
git pull
docker compose up -d --build
```

Las migraciones de base de datos corren solas al arrancar el backend.

## Backups

Los datos viven en `backend/data/app.db` (base de datos) y `backend/uploads/` (comprobantes) — **hay que respaldar las dos carpetas juntas**. Un cron simple en el host:

```bash
# /etc/cron.d/mantenimiento-autos-backup
0 4 * * * root tar -czf /respaldos/mantenimiento-autos-$(date +\%Y\%m\%d).tar.gz -C /ruta/a/mantenimiento_autos/backend data uploads
```

Ajustá `/respaldos` y la ruta del proyecto a tu caso, e idealmente copiá esos `.tar.gz` a otro disco o a la nube.

## Si todavía no subiste el repo a un remoto

En tu compu de desarrollo:
```bash
git remote add origin <URL-del-repo-que-creaste-en-GitHub/GitLab>
git push -u origin master
```
