import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUpcoming, fetchVehicles } from "../api/client";
import type { UpcomingItem, Vehicle } from "../types";

export default function DashboardPage() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  useEffect(() => {
    fetchUpcoming()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchVehicles()
      .then(setVehicles)
      .finally(() => setVehiclesLoading(false));
  }, []);

  const vencidos = items.filter((i) => i.estado === "vencido");
  const proximos = items.filter((i) => i.estado === "proximo");

  return (
    <main className="container">
      <h1>Dashboard</h1>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Mis vehículos</h2>
        {vehiclesLoading ? (
          <p>Cargando...</p>
        ) : vehicles.length === 0 ? (
          <p>
            No hay vehículos cargados todavía. <Link to="/vehiculos/nuevo">Agregar uno</Link>.
          </p>
        ) : (
          <div className="vehicle-cards">
            {vehicles.map((v) => (
              <article key={v.id} style={{ marginBottom: 0 }}>
                <header>
                  <Link to={`/vehiculos/${v.id}`}>
                    <strong>{v.alias || `${v.marca} ${v.modelo}`}</strong>
                  </Link>
                </header>
                <p style={{ marginBottom: "0.5rem" }}>
                  <small>
                    {v.patente} · {v.kilometraje_actual.toLocaleString("es-AR")} km
                  </small>
                </p>
                <div className="grid">
                  <Link to={`/vehiculos/${v.id}/combustible/nueva`} role="button" className="secondary">
                    ⛽ Combustible
                  </Link>
                  <Link to={`/vehiculos/${v.id}/tareas/nueva`} role="button" className="secondary">
                    🔧 Tarea
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <p>Cargando...</p>
      ) : items.length === 0 ? (
        <p>No hay mantenimientos vencidos ni próximos. ¡Todo al día!</p>
      ) : (
        <>
          <div className="grid" style={{ marginBottom: "1.5rem" }}>
            {vencidos.length > 0 && (
              <article style={{ borderLeft: "4px solid var(--pico-del-color)", marginBottom: 0 }}>
                <p style={{ marginBottom: 4 }}>
                  <small>⚠️ Vencidos</small>
                </p>
                <strong style={{ fontSize: "1.8rem" }}>{vencidos.length}</strong>
              </article>
            )}
            {proximos.length > 0 && (
              <article style={{ borderLeft: "4px solid oklch(70% 0.15 70)", marginBottom: 0 }}>
                <p style={{ marginBottom: 4 }}>
                  <small>🔔 Próximos</small>
                </p>
                <strong style={{ fontSize: "1.8rem" }}>{proximos.length}</strong>
              </article>
            )}
          </div>

          {vencidos.length > 0 && (
            <section>
              <h2 style={{ color: "var(--pico-del-color)" }}>⚠️ Vencidos</h2>
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Tarea</th>
                    <th>Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map((item, idx) => (
                    <tr key={idx}>
                      <td data-label="Vehículo">
                        <Link to={`/vehiculos/${item.vehicle_id}`}>{item.vehicle_label}</Link>
                      </td>
                      <td data-label="Tarea">{item.tipo_label}</td>
                      <td data-label="Vencimiento">
                        {item.proximo_fecha_estimada && `Fecha: ${item.proximo_fecha_estimada}`}
                        {item.proximo_fecha_estimada && item.proximo_km_estimado && " · "}
                        {item.proximo_km_estimado &&
                          `Km: ${item.proximo_km_estimado.toLocaleString("es-AR")} (actual: ${item.kilometraje_actual.toLocaleString("es-AR")})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {proximos.length > 0 && (
            <section>
              <h2 style={{ color: "oklch(55% 0.15 70)" }}>🔔 Próximos</h2>
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Tarea</th>
                    <th>Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map((item, idx) => (
                    <tr key={idx}>
                      <td data-label="Vehículo">
                        <Link to={`/vehiculos/${item.vehicle_id}`}>{item.vehicle_label}</Link>
                      </td>
                      <td data-label="Tarea">{item.tipo_label}</td>
                      <td data-label="Estimado">
                        {item.proximo_fecha_estimada && `Fecha: ${item.proximo_fecha_estimada}`}
                        {item.proximo_fecha_estimada && item.proximo_km_estimado && " · "}
                        {item.proximo_km_estimado &&
                          `Km: ${item.proximo_km_estimado.toLocaleString("es-AR")} (actual: ${item.kilometraje_actual.toLocaleString("es-AR")})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
