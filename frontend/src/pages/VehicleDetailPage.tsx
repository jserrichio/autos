import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteFuelLog,
  deleteTask,
  deleteVehicle,
  fetchFuelLogs,
  fetchFuelTypes,
  fetchTasks,
  fetchTaskTypes,
  fetchVehicle,
  reactivateVehicle,
} from "../api/client";
import type { FuelLog, FuelType, MaintenanceTask, TaskType, Vehicle } from "../types";

export default function VehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [consumoPromedio, setConsumoPromedio] = useState<number | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    Promise.all([
      fetchVehicle(vehicleId),
      fetchTasks(vehicleId),
      fetchTaskTypes(),
      fetchFuelLogs(vehicleId),
      fetchFuelTypes(),
    ])
      .then(([v, t, tt, fl, ft]) => {
        setVehicle(v);
        setTasks(t);
        setTaskTypes(tt);
        setFuelLogs(fl.items);
        setConsumoPromedio(fl.consumo_promedio_km_l);
        setFuelTypes(ft);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, [vehicleId]);

  function tipoLabel(tipo: string, otroTexto: string | null): string {
    if (tipo === "otro" && otroTexto) return otroTexto;
    return taskTypes.find((t) => t.value === tipo)?.label ?? tipo;
  }

  function fuelTipoLabel(tipo: string): string {
    return fuelTypes.find((t) => t.value === tipo)?.label ?? tipo;
  }

  async function handleDeleteFuelLog(fuelLogId: number) {
    if (!confirm("¿Eliminar esta carga de combustible?")) return;
    await deleteFuelLog(fuelLogId);
    reload();
  }

  async function handleBaja() {
    if (!vehicle) return;
    if (!confirm(`¿Dar de baja a ${vehicle.marca} ${vehicle.modelo} (${vehicle.patente})?`)) return;
    await deleteVehicle(vehicle.id);
    reload();
  }

  async function handleReactivar() {
    if (!vehicle) return;
    await reactivateVehicle(vehicle.id);
    reload();
  }

  async function handleDeleteTask(taskId: number) {
    if (!confirm("¿Eliminar esta tarea de mantenimiento?")) return;
    await deleteTask(taskId);
    reload();
  }

  if (loading || !vehicle) return <main className="container"><p>Cargando...</p></main>;

  return (
    <main className="container">
      <nav>
        <ul>
          <li>
            <h1>
              {vehicle.alias || `${vehicle.marca} ${vehicle.modelo}`}{" "}
              {!vehicle.activo && <small>(dado de baja)</small>}
            </h1>
          </li>
        </ul>
        <ul>
          <li>
            <Link to={`/vehiculos/${vehicle.id}/estadisticas`} role="button" className="secondary">
              Ver estadísticas
            </Link>
          </li>
          <li>
            <Link to={`/vehiculos/${vehicle.id}/editar`} role="button" className="secondary">
              Editar
            </Link>
          </li>
          {vehicle.activo ? (
            <li>
              <button className="contrast" onClick={handleBaja}>
                Dar de baja
              </button>
            </li>
          ) : (
            <li>
              <button onClick={handleReactivar}>Reactivar</button>
            </li>
          )}
        </ul>
      </nav>

      <article>
        <div className="grid">
          <div>
            <strong>Marca / Modelo:</strong> {vehicle.marca} {vehicle.modelo}
          </div>
          <div>
            <strong>Año:</strong> {vehicle.anio}
          </div>
          <div>
            <strong>Patente:</strong> {vehicle.patente}
          </div>
        </div>
        <div className="grid">
          <div>
            <strong>Kilometraje actual:</strong> {vehicle.kilometraje_actual.toLocaleString("es-AR")} km
          </div>
          <div>
            <strong>Color:</strong> {vehicle.color || "-"}
          </div>
          <div>
            <strong>VIN:</strong> {vehicle.vin || "-"}
          </div>
        </div>
        {vehicle.notas && (
          <p>
            <strong>Notas:</strong> {vehicle.notas}
          </p>
        )}
      </article>

      <nav>
        <ul>
          <li>
            <h2>Historial de mantenimiento</h2>
          </li>
        </ul>
        <ul>
          <li>
            <Link to={`/vehiculos/${vehicle.id}/tareas/nueva`} role="button">
              Agregar tarea
            </Link>
          </li>
        </ul>
      </nav>

      {tasks.length === 0 ? (
        <p>No hay tareas de mantenimiento registradas todavía.</p>
      ) : (
        <table className="rtable">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Km</th>
              <th>Costo</th>
              <th>Taller</th>
              <th>Adjuntos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td data-label="Fecha">{t.fecha}</td>
                <td data-label="Tipo">{tipoLabel(t.tipo, t.tipo_otro_texto)}</td>
                <td data-label="Km">{t.kilometraje.toLocaleString("es-AR")} km</td>
                <td data-label="Costo">{t.costo ? `$${Number(t.costo).toLocaleString("es-AR")}` : "-"}</td>
                <td data-label="Taller">{t.taller_nombre || "-"}</td>
                <td data-label="Adjuntos" className="hide-mobile">
                  {t.attachments.length}
                </td>
                <td className="actions-cell">
                  <Link to={`/vehiculos/${vehicle.id}/tareas/${t.id}/editar`} className="action-btn">
                    Editar
                  </Link>
                  <a
                    href="#"
                    className="action-btn danger"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteTask(t.id);
                    }}
                  >
                    Eliminar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <nav>
        <ul>
          <li>
            <h2>Cargas de combustible</h2>
          </li>
        </ul>
        <ul>
          <li>
            <Link to={`/vehiculos/${vehicle.id}/combustible/nueva`} role="button">
              Agregar carga
            </Link>
          </li>
        </ul>
      </nav>

      {fuelLogs.length === 0 ? (
        <p>No hay cargas de combustible registradas todavía.</p>
      ) : (
        <>
          {consumoPromedio !== null && (
            <p>
              <strong>Consumo promedio:</strong> {consumoPromedio.toLocaleString("es-AR")} km/l
            </p>
          )}
          <table className="rtable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Km</th>
                <th>Litros</th>
                <th>Costo</th>
                <th>$/litro</th>
                <th>Estación</th>
                <th>Tanque lleno</th>
                <th>Rendimiento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.map((f) => (
                <tr key={f.id}>
                  <td data-label="Fecha">{f.fecha}</td>
                  <td data-label="Tipo">{fuelTipoLabel(f.tipo_combustible)}</td>
                  <td data-label="Km">{f.kilometraje.toLocaleString("es-AR")} km</td>
                  <td data-label="Litros">{Number(f.litros).toLocaleString("es-AR")} l</td>
                  <td data-label="Costo">${Number(f.costo_total).toLocaleString("es-AR")}</td>
                  <td data-label="$/litro">
                    $
                    {(Number(f.costo_total) / Number(f.litros)).toLocaleString("es-AR", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td data-label="Estación" className="hide-mobile">
                    {f.estacion_servicio || "-"}
                  </td>
                  <td data-label="Tanque lleno" className="hide-mobile">
                    {f.tanque_lleno ? "Sí" : "No"}
                  </td>
                  <td data-label="Rendimiento">
                    {f.rendimiento_km_l !== null ? `${f.rendimiento_km_l} km/l` : "-"}
                  </td>
                  <td className="actions-cell">
                    <Link to={`/vehiculos/${vehicle.id}/combustible/${f.id}/editar`} className="action-btn">
                      Editar
                    </Link>
                    <a
                      href="#"
                      className="action-btn danger"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteFuelLog(f.id);
                      }}
                    >
                      Eliminar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button className="secondary" onClick={() => navigate("/vehiculos")}>
        Volver al listado
      </button>
    </main>
  );
}
