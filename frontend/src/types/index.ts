export type TipoTarea = string;

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  vin: string | null;
  kilometraje_actual: number;
  color: string | null;
  alias: string | null;
  notas: string | null;
  activo: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export type VehicleInput = Omit<
  Vehicle,
  "id" | "activo" | "owner_id" | "created_at" | "updated_at"
> & { owner_id?: number | null };

export interface Attachment {
  id: number;
  filename_original: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface MaintenanceTask {
  id: number;
  vehicle_id: number;
  tipo: TipoTarea;
  tipo_otro_texto: string | null;
  fecha: string;
  kilometraje: number;
  costo: string | null;
  notas: string | null;
  taller_nombre: string | null;
  taller_contacto: string | null;
  proximo_fecha_estimada: string | null;
  proximo_km_estimado: number | null;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export type MaintenanceTaskInput = {
  tipo: TipoTarea;
  tipo_otro_texto: string | null;
  fecha: string;
  kilometraje: number;
  costo: number | null;
  notas: string | null;
  taller_nombre: string | null;
  taller_contacto: string | null;
  proximo_fecha_estimada: string | null;
  proximo_km_estimado: number | null;
};

export interface TaskType {
  id: number;
  value: TipoTarea;
  label: string;
  permite_recordatorio: boolean;
  es_protegido: boolean;
  intervalo_km: number | null;
  intervalo_meses: number | null;
}

export interface TaskTypeInput {
  label: string;
  intervalo_km: number | null;
  intervalo_meses: number | null;
}

export interface UserUpdateInput {
  username: string;
  email: string;
  full_name: string | null;
}

export interface UpcomingItem {
  vehicle_id: number;
  vehicle_label: string;
  tipo: TipoTarea;
  tipo_label: string;
  estado: "vencido" | "proximo" | "ok";
  proximo_fecha_estimada: string | null;
  proximo_km_estimado: number | null;
  kilometraje_actual: number;
}

export type TipoCombustible = "nafta_comun" | "nafta_premium" | "diesel" | "gnc" | "otro";

export interface FuelType {
  value: TipoCombustible;
  label: string;
}

export interface FuelLog {
  id: number;
  vehicle_id: number;
  fecha: string;
  kilometraje: number;
  litros: string;
  costo_total: string;
  tipo_combustible: TipoCombustible;
  estacion_servicio: string | null;
  tanque_lleno: boolean;
  carga_anterior_registrada: boolean;
  created_at: string;
  updated_at: string;
  rendimiento_km_l: number | null;
}

export type FuelLogInput = {
  fecha: string;
  kilometraje: number;
  litros: number;
  costo_total: number;
  tipo_combustible: TipoCombustible;
  estacion_servicio: string | null;
  tanque_lleno: boolean;
  carga_anterior_registrada: boolean;
};

export interface FuelLogListResponse {
  items: FuelLog[];
  consumo_promedio_km_l: number | null;
}

export interface GastoPorTipo {
  tipo: string;
  tipo_label: string;
  total: string;
}

export interface GastoPorAnio {
  anio: number;
  mantenimiento: string;
  combustible: string;
}

export interface KmPorAnio {
  anio: number;
  km: number;
}

export interface GastoPorMes {
  mes: string;
  mantenimiento: string;
  combustible: string;
}

export interface OdometroLectura {
  fecha: string;
  kilometraje: number;
}

export interface VehicleStats {
  gasto_mantenimiento_total: string;
  gasto_mantenimiento_por_tipo: GastoPorTipo[];
  gasto_combustible_total: string;
  precio_promedio_litro: string | null;
  gasto_por_anio: GastoPorAnio[];
  gasto_por_mes: GastoPorMes[];
  km_por_anio: KmPorAnio[];
  costo_por_km: string | null;
  odometro_lecturas: OdometroLectura[];
  promedio_km_dia: number | null;
  estimado_km_anio: number | null;
}
