import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../theme/ThemeToggle";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="container">
      <nav>
        <ul>
          <li>
            <strong>🚗 Mantenimiento de Autos</strong>
          </li>
        </ul>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/vehiculos">Vehículos</Link>
          </li>
          <li>
            <Link to="/tipos-tarea">Tipos de tarea</Link>
          </li>
          {user?.is_admin && (
            <li>
              <Link to="/admin/usuarios">Admin</Link>
            </li>
          )}
        </ul>
        <ul>
          <li>
            <ThemeToggle />
          </li>
          {user && (
            <>
              <li>{user.full_name ?? user.username}</li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                >
                  Cerrar sesión
                </a>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
