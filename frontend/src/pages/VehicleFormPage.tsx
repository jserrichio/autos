import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createVehicle, fetchAdminUsers, fetchVehicle, updateVehicle } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { User, VehicleInput } from "../types";

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<VehicleInput>({
    defaultValues: { kilometraje_actual: 0 },
  });

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminUsers().then(setUsers);
    }
  }, [user]);

  useEffect(() => {
    if (isEdit) {
      fetchVehicle(Number(id)).then((v) =>
        reset({
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          patente: v.patente,
          vin: v.vin,
          kilometraje_actual: v.kilometraje_actual,
          color: v.color,
          alias: v.alias,
          notas: v.notas,
          owner_id: v.owner_id,
        }),
      );
    }
  }, [id, isEdit, reset]);

  async function onSubmit(values: VehicleInput) {
    setError(null);
    try {
      const payload = {
        ...values,
        anio: Number(values.anio),
        kilometraje_actual: Number(values.kilometraje_actual),
        owner_id: values.owner_id ? Number(values.owner_id) : null,
      };
      if (isEdit) {
        await updateVehicle(Number(id), payload);
        navigate(`/vehiculos/${id}`);
      } else {
        const created = await createVehicle(payload);
        navigate(`/vehiculos/${created.id}`);
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo guardar el vehículo";
      setError(detail);
    }
  }

  return (
    <main className="container" style={{ maxWidth: "600px" }}>
      <h1>{isEdit ? "Editar vehículo" : "Nuevo vehículo"}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        {user?.is_admin && (
          <label>
            Propietario
            <select {...register("owner_id", { valueAsNumber: true })}>
              <option value="">Yo ({user.username})</option>
              {users
                .filter((u) => u.id !== user.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="grid">
          <label>
            Marca
            <input {...register("marca", { required: true })} />
          </label>
          <label>
            Modelo
            <input {...register("modelo", { required: true })} />
          </label>
        </div>
        <div className="grid">
          <label>
            Año
            <input type="number" {...register("anio", { required: true, valueAsNumber: true })} />
          </label>
          <label>
            Patente
            <input {...register("patente", { required: true })} />
          </label>
        </div>
        <div className="grid">
          <label>
            VIN (opcional)
            <input {...register("vin")} />
          </label>
          <label>
            Kilometraje actual
            <input
              type="number"
              {...register("kilometraje_actual", { required: true, valueAsNumber: true })}
            />
          </label>
        </div>
        <div className="grid">
          <label>
            Color
            <input {...register("color")} />
          </label>
          <label>
            Alias
            <input {...register("alias")} placeholder="ej. El auto de mamá" />
          </label>
        </div>
        <label>
          Notas
          <textarea {...register("notas")} rows={3} />
        </label>

        {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Guardar
        </button>
      </form>
    </main>
  );
}
