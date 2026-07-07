import axios from "axios";
import type {
  Attachment,
  FuelLog,
  FuelLogInput,
  FuelLogListResponse,
  FuelType,
  MaintenanceTask,
  MaintenanceTaskInput,
  TaskType,
  TaskTypeInput,
  UpcomingItem,
  User,
  UserUpdateInput,
  Vehicle,
  VehicleInput,
  VehicleStats,
} from "../types";

const TOKEN_KEY = "mantenimiento_autos_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const publicPaths = ["/login", "/registro"];
    if (error.response?.status === 401) {
      clearToken();
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data.access_token;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
  fullName: string | null,
): Promise<User> {
  const { data } = await api.post<User>("/auth/register", {
    username,
    email,
    password,
    full_name: fullName,
  });
  return data;
}

export async function fetchAdminUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/admin/users");
  return data;
}

export async function updateAdminUser(userId: number, input: UserUpdateInput): Promise<User> {
  const { data } = await api.put<User>(`/admin/users/${userId}`, input);
  return data;
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<User> {
  const { data } = await api.post<User>(`/admin/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
  return data;
}

export async function activateUser(userId: number): Promise<User> {
  const { data } = await api.post<User>(`/admin/users/${userId}/activar`);
  return data;
}

export async function deactivateUser(userId: number): Promise<User> {
  const { data } = await api.post<User>(`/admin/users/${userId}/desactivar`);
  return data;
}

export async function fetchVehicles(includeInactive = false): Promise<Vehicle[]> {
  const { data } = await api.get<Vehicle[]>("/vehicles", {
    params: { include_inactive: includeInactive },
  });
  return data;
}

export async function fetchVehicle(id: number): Promise<Vehicle> {
  const { data } = await api.get<Vehicle>(`/vehicles/${id}`);
  return data;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>("/vehicles", input);
  return data;
}

export async function updateVehicle(id: number, input: VehicleInput): Promise<Vehicle> {
  const { data } = await api.put<Vehicle>(`/vehicles/${id}`, input);
  return data;
}

export async function deleteVehicle(id: number): Promise<void> {
  await api.delete(`/vehicles/${id}`);
}

export async function reactivateVehicle(id: number): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>(`/vehicles/${id}/reactivar`);
  return data;
}

export async function fetchTaskTypes(): Promise<TaskType[]> {
  const { data } = await api.get<TaskType[]>("/task-types");
  return data;
}

export async function createTaskType(input: TaskTypeInput): Promise<TaskType> {
  const { data } = await api.post<TaskType>("/task-types", input);
  return data;
}

export async function updateTaskType(id: number, input: TaskTypeInput): Promise<TaskType> {
  const { data } = await api.put<TaskType>(`/task-types/${id}`, input);
  return data;
}

export async function deleteTaskType(id: number): Promise<void> {
  await api.delete(`/task-types/${id}`);
}

export async function fetchTasks(vehicleId: number): Promise<MaintenanceTask[]> {
  const { data } = await api.get<MaintenanceTask[]>(`/vehicles/${vehicleId}/tasks`);
  return data;
}

export async function fetchTask(taskId: number): Promise<MaintenanceTask> {
  const { data } = await api.get<MaintenanceTask>(`/tasks/${taskId}`);
  return data;
}

export async function createTask(
  vehicleId: number,
  input: MaintenanceTaskInput,
): Promise<MaintenanceTask> {
  const { data } = await api.post<MaintenanceTask>(`/vehicles/${vehicleId}/tasks`, input);
  return data;
}

export async function updateTask(
  taskId: number,
  input: MaintenanceTaskInput,
): Promise<MaintenanceTask> {
  const { data } = await api.put<MaintenanceTask>(`/tasks/${taskId}`, input);
  return data;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export async function fetchFuelTypes(): Promise<FuelType[]> {
  const { data } = await api.get<FuelType[]>("/fuel-types");
  return data;
}

export async function fetchFuelLogs(vehicleId: number): Promise<FuelLogListResponse> {
  const { data } = await api.get<FuelLogListResponse>(`/vehicles/${vehicleId}/fuel-logs`);
  return data;
}

export async function fetchFuelLog(fuelLogId: number): Promise<FuelLog> {
  const { data } = await api.get<FuelLog>(`/fuel-logs/${fuelLogId}`);
  return data;
}

export async function createFuelLog(vehicleId: number, input: FuelLogInput): Promise<FuelLog> {
  const { data } = await api.post<FuelLog>(`/vehicles/${vehicleId}/fuel-logs`, input);
  return data;
}

export async function updateFuelLog(fuelLogId: number, input: FuelLogInput): Promise<FuelLog> {
  const { data } = await api.put<FuelLog>(`/fuel-logs/${fuelLogId}`, input);
  return data;
}

export async function deleteFuelLog(fuelLogId: number): Promise<void> {
  await api.delete(`/fuel-logs/${fuelLogId}`);
}

export async function uploadAttachment(taskId: number, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Attachment>(`/tasks/${taskId}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function downloadAttachment(attachment: Attachment): Promise<void> {
  const response = await api.get(`/attachments/${attachment.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.filename_original;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  await api.delete(`/attachments/${attachmentId}`);
}

export async function fetchUpcoming(): Promise<UpcomingItem[]> {
  const { data } = await api.get<UpcomingItem[]>("/dashboard/upcoming");
  return data;
}

export async function fetchVehicleUpcoming(vehicleId: number): Promise<UpcomingItem[]> {
  const { data } = await api.get<UpcomingItem[]>(`/vehicles/${vehicleId}/upcoming`);
  return data;
}

export async function fetchVehicleStats(vehicleId: number): Promise<VehicleStats> {
  const { data } = await api.get<VehicleStats>(`/vehicles/${vehicleId}/stats`);
  return data;
}

export default api;
