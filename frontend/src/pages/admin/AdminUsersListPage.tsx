import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { activateUser, deactivateUser, fetchAdminUsers, resetUserPassword } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { User } from "../../types";

export default function AdminUsersListPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchAdminUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleToggleActive(targetUser: User) {
    setError(null);
    try {
      if (targetUser.is_active) {
        await deactivateUser(targetUser.id);
      } else {
        await activateUser(targetUser.id);
      }
      reload();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo cambiar el estado del usuario";
      setError(detail);
    }
  }

  async function handleResetPassword(targetUser: User) {
    const newPassword = prompt(`Nueva contraseña para ${targetUser.username}:`);
    if (!newPassword) return;
    await resetUserPassword(targetUser.id, newPassword);
    alert(`Contraseña de ${targetUser.username} actualizada.`);
  }

  return (
    <main className="container">
      <nav>
        <ul>
          <li>
            <h1>Administración de usuarios</h1>
          </li>
        </ul>
        <ul>
          <li>
            <Link to="/admin/usuarios/nuevo" role="button">
              Nuevo usuario
            </Link>
          </li>
        </ul>
      </nav>

      {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Admin</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.full_name || "-"}</td>
                <td>{u.is_admin ? "Sí" : "No"}</td>
                <td>{u.is_active ? "Activo" : "Desactivado"}</td>
                <td>
                  <Link to={`/admin/usuarios/${u.id}/editar`}>Editar</Link>
                  {" · "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleResetPassword(u);
                    }}
                  >
                    Resetear contraseña
                  </a>
                  {u.id !== currentUser?.id && (
                    <>
                      {" · "}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleActive(u);
                        }}
                      >
                        {u.is_active ? "Desactivar" : "Activar"}
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
