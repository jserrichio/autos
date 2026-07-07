import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AdminRoute from "./auth/AdminRoute";
import ProtectedRoute from "./auth/ProtectedRoute";
import Header from "./components/Header";
import DashboardPage from "./pages/DashboardPage";
import FuelLogFormPage from "./pages/FuelLogFormPage";
import LoginPage from "./pages/LoginPage";
import MaintenanceTaskFormPage from "./pages/MaintenanceTaskFormPage";
import RegisterPage from "./pages/RegisterPage";
import TaskTypesPage from "./pages/TaskTypesPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import VehicleFormPage from "./pages/VehicleFormPage";
import VehicleListPage from "./pages/VehicleListPage";
import VehicleStatsPage from "./pages/VehicleStatsPage";
import AdminUserFormPage from "./pages/admin/AdminUserFormPage";
import AdminUsersListPage from "./pages/admin/AdminUsersListPage";

function ProtectedLayout() {
  return (
    <>
      <Header />
      <ProtectedRoute />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vehiculos" element={<VehicleListPage />} />
            <Route path="/vehiculos/nuevo" element={<VehicleFormPage />} />
            <Route path="/vehiculos/:id" element={<VehicleDetailPage />} />
            <Route path="/vehiculos/:id/editar" element={<VehicleFormPage />} />
            <Route path="/vehiculos/:id/tareas/nueva" element={<MaintenanceTaskFormPage />} />
            <Route path="/vehiculos/:id/tareas/:taskId/editar" element={<MaintenanceTaskFormPage />} />
            <Route path="/vehiculos/:id/combustible/nueva" element={<FuelLogFormPage />} />
            <Route path="/vehiculos/:id/combustible/:fuelLogId/editar" element={<FuelLogFormPage />} />
            <Route path="/vehiculos/:id/estadisticas" element={<VehicleStatsPage />} />
            <Route path="/tipos-tarea" element={<TaskTypesPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/usuarios" element={<AdminUsersListPage />} />
              <Route path="/admin/usuarios/nuevo" element={<AdminUserFormPage />} />
              <Route path="/admin/usuarios/:id/editar" element={<AdminUserFormPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
