import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchFuelLogs, fetchVehicle, fetchVehicleStats } from "../api/client";
import BarChart from "../components/charts/BarChart";
import GroupedBarChart from "../components/charts/GroupedBarChart";
import LineChart from "../components/charts/LineChart";
import type { FuelLog, Vehicle, VehicleStats } from "../types";

const money = (v: number) => `$${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const km = (v: number) => `${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })} km`;
const kmPorLitro = (v: number) => `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km/l`;

function mesLabel(mes: string): string {
  const [anio, m] = mes.split("-");
  return `${Number(m)}/${anio}`;
}

export default function VehicleStatsPage() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [consumoPromedio, setConsumoPromedio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVehicle(vehicleId), fetchVehicleStats(vehicleId), fetchFuelLogs(vehicleId)])
      .then(([v, s, fl]) => {
        setVehicle(v);
        setStats(s);
        setFuelLogs(fl.items);
        setConsumoPromedio(fl.consumo_promedio_km_l);
      })
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading || !vehicle || !stats) {
    return (
      <main className="container">
        <p>Cargando...</p>
      </main>
    );
  }

  const gastoMantTotal = Number(stats.gasto_mantenimiento_total);
  const gastoCombTotal = Number(stats.gasto_combustible_total);
  const precioPromLitro = stats.precio_promedio_litro !== null ? Number(stats.precio_promedio_litro) : null;
  const costoPorKm = stats.costo_por_km !== null ? Number(stats.costo_por_km) : null;

  const hayDatos =
    stats.gasto_mantenimiento_por_tipo.length > 0 || stats.gasto_por_anio.length > 0 || stats.km_por_anio.length > 0;

  const eficienciaData = [...fuelLogs]
    .filter((f) => f.rendimiento_km_l !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((f) => ({ label: f.fecha, value: f.rendimiento_km_l as number }));

  return (
    <main className="container">
      <h1>Estadísticas — {vehicle.alias || `${vehicle.marca} ${vehicle.modelo}`}</h1>

      <div className="grid">
        <article>
          <p>
            <small>Gasto total mantenimiento</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>{money(gastoMantTotal)}</strong>
        </article>
        <article>
          <p>
            <small>Gasto total combustible</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>{money(gastoCombTotal)}</strong>
        </article>
        <article>
          <p>
            <small>Precio promedio por litro</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>{precioPromLitro !== null ? money(precioPromLitro) : "-"}</strong>
        </article>
        <article>
          <p>
            <small>Costo por km</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>{costoPorKm !== null ? money(costoPorKm) : "-"}</strong>
        </article>
      </div>

      <div className="grid">
        <article>
          <p>
            <small>Promedio km/día</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>
            {stats.promedio_km_dia !== null ? stats.promedio_km_dia.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : "-"}
          </strong>
        </article>
        <article>
          <p>
            <small>Estimado km/año</small>
          </p>
          <strong style={{ fontSize: "1.5rem" }}>{stats.estimado_km_anio !== null ? km(stats.estimado_km_anio) : "-"}</strong>
        </article>
      </div>

      {!hayDatos ? (
        <p>Todavía no hay suficientes datos para mostrar gráficos. Cargá tareas de mantenimiento y cargas de combustible.</p>
      ) : (
        <>
          {stats.gasto_por_anio.length > 0 && (
            <section>
              <h2>Gasto por año</h2>
              <GroupedBarChart
                data={stats.gasto_por_anio.map((g) => ({
                  label: String(g.anio),
                  series1: Number(g.mantenimiento),
                  series2: Number(g.combustible),
                }))}
                series1Label="Mantenimiento"
                series2Label="Combustible"
                valueFormatter={money}
              />
            </section>
          )}

          {stats.gasto_por_mes.length > 0 && (
            <section>
              <h2>Gastos mensuales</h2>
              <BarChart
                data={stats.gasto_por_mes.map((g) => ({
                  label: mesLabel(g.mes),
                  value: Number(g.mantenimiento) + Number(g.combustible),
                }))}
                orientation="vertical"
                valueFormatter={money}
              />
            </section>
          )}

          {stats.gasto_por_mes.some((g) => Number(g.combustible) > 0) && (
            <section>
              <h2>Gastos mensuales de combustible</h2>
              <BarChart
                data={stats.gasto_por_mes.map((g) => ({ label: mesLabel(g.mes), value: Number(g.combustible) }))}
                orientation="vertical"
                color="var(--chart-series-2)"
                valueFormatter={money}
              />
            </section>
          )}

          {eficienciaData.length > 0 && (
            <section>
              <h2>Eficiencia de combustible en el tiempo</h2>
              <LineChart
                data={eficienciaData}
                valueFormatter={kmPorLitro}
                referenceValue={consumoPromedio ?? undefined}
                referenceLabel="Promedio"
              />
            </section>
          )}

          {stats.odometro_lecturas.length > 0 && (
            <section>
              <h2>Odómetro</h2>
              <LineChart
                data={stats.odometro_lecturas.map((o) => ({ label: o.fecha, value: o.kilometraje }))}
                valueFormatter={km}
              />
            </section>
          )}

          {stats.km_por_anio.length > 0 && (
            <section>
              <h2>Kilómetros por año</h2>
              <BarChart
                data={stats.km_por_anio.map((k) => ({ label: String(k.anio), value: k.km }))}
                orientation="vertical"
                valueFormatter={km}
              />
            </section>
          )}

          {stats.gasto_mantenimiento_por_tipo.length > 0 && (
            <section>
              <h2>Gasto de mantenimiento por tipo</h2>
              <BarChart
                data={stats.gasto_mantenimiento_por_tipo.map((g) => ({
                  label: g.tipo_label,
                  value: Number(g.total),
                }))}
                orientation="horizontal"
                valueFormatter={money}
              />
            </section>
          )}
        </>
      )}

      <button className="secondary" onClick={() => navigate(`/vehiculos/${vehicleId}`)}>
        Volver al vehículo
      </button>
    </main>
  );
}
