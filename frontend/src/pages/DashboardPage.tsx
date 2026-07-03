import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUpcoming } from "../api/client";
import type { UpcomingItem } from "../types";

export default function DashboardPage() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcoming()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const vencidos = items.filter((i) => i.estado === "vencido");
  const proximos = items.filter((i) => i.estado === "proximo");

  return (
    <main className="container">
      <h1>Dashboard</h1>

      {loading ? (
        <p>Cargando...</p>
      ) : items.length === 0 ? (
        <p>No hay mantenimientos vencidos ni próximos. ¡Todo al día!</p>
      ) : (
        <>
          {vencidos.length > 0 && (
            <section>
              <h2>⚠️ Vencidos</h2>
              <table>
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
                      <td>
                        <Link to={`/vehiculos/${item.vehicle_id}`}>{item.vehicle_label}</Link>
                      </td>
                      <td>{item.tipo_label}</td>
                      <td>
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
              <h2>🔔 Próximos</h2>
              <table>
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
                      <td>
                        <Link to={`/vehiculos/${item.vehicle_id}`}>{item.vehicle_label}</Link>
                      </td>
                      <td>{item.tipo_label}</td>
                      <td>
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
