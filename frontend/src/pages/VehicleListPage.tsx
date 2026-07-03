import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminUsers, fetchVehicles } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { User, Vehicle } from "../types";

export default function VehicleListPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVehicles(includeInactive)
      .then(setVehicles)
      .finally(() => setLoading(false));
  }, [includeInactive]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminUsers().then(setUsers);
    }
  }, [user]);

  function ownerLabel(ownerId: number): string {
    const owner = users.find((u) => u.id === ownerId);
    return owner ? owner.full_name || owner.username : `#${ownerId}`;
  }

  return (
    <main className="container">
      <nav>
        <ul>
          <li>
            <h1>Vehículos</h1>
          </li>
        </ul>
        <ul>
          <li>
            <Link to="/vehiculos/nuevo" role="button">
              Nuevo vehículo
            </Link>
          </li>
        </ul>
      </nav>

      <label>
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
        />
        Mostrar vehículos dados de baja
      </label>

      {loading ? (
        <p>Cargando...</p>
      ) : vehicles.length === 0 ? (
        <p>No hay vehículos cargados todavía.</p>
      ) : (
        <table className="rtable">
          <thead>
            <tr>
              <th>Alias</th>
              <th>Marca / Modelo</th>
              <th>Año</th>
              <th>Patente</th>
              <th>Kilometraje</th>
              {user?.is_admin && <th>Dueño</th>}
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td data-label="Alias">
                  <Link to={`/vehiculos/${v.id}`}>{v.alias || `${v.marca} ${v.modelo}`}</Link>
                </td>
                <td data-label="Marca / Modelo">
                  {v.marca} {v.modelo}
                </td>
                <td data-label="Año">{v.anio}</td>
                <td data-label="Patente">{v.patente}</td>
                <td data-label="Kilometraje">{v.kilometraje_actual.toLocaleString("es-AR")} km</td>
                {user?.is_admin && (
                  <td data-label="Dueño" className="hide-mobile">
                    {ownerLabel(v.owner_id)}
                  </td>
                )}
                <td data-label="Estado">{v.activo ? "Activo" : "Dado de baja"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
