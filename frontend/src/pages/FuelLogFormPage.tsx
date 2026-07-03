import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createFuelLog, fetchFuelLog, fetchFuelTypes, updateFuelLog } from "../api/client";
import type { FuelLogInput, FuelType, TipoCombustible } from "../types";

interface FormValues {
  fecha: string;
  kilometraje: number;
  litros: number;
  costo_total: number;
  tipo_combustible: TipoCombustible;
  estacion_servicio: string;
  tanque_lleno: boolean;
  carga_anterior_registrada: boolean;
}

export default function FuelLogFormPage() {
  const { id: vehicleIdParam, fuelLogId } = useParams();
  const vehicleId = Number(vehicleIdParam);
  const isEdit = Boolean(fuelLogId);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      tipo_combustible: "nafta_comun",
      fecha: new Date().toISOString().slice(0, 10),
      tanque_lleno: true,
      carga_anterior_registrada: true,
    },
  });

  useEffect(() => {
    fetchFuelTypes().then(setFuelTypes);
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchFuelLog(Number(fuelLogId)).then((f) => {
        reset({
          fecha: f.fecha,
          kilometraje: f.kilometraje,
          litros: Number(f.litros),
          costo_total: Number(f.costo_total),
          tipo_combustible: f.tipo_combustible,
          estacion_servicio: f.estacion_servicio ?? "",
          tanque_lleno: f.tanque_lleno,
          carga_anterior_registrada: f.carga_anterior_registrada,
        });
      });
    }
  }, [isEdit, fuelLogId, reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload: FuelLogInput = {
      fecha: values.fecha,
      kilometraje: Number(values.kilometraje),
      litros: Number(values.litros),
      costo_total: Number(values.costo_total),
      tipo_combustible: values.tipo_combustible,
      estacion_servicio: values.estacion_servicio || null,
      tanque_lleno: Boolean(values.tanque_lleno),
      carga_anterior_registrada: Boolean(values.carga_anterior_registrada),
    };
    try {
      if (isEdit) {
        await updateFuelLog(Number(fuelLogId), payload);
      } else {
        await createFuelLog(vehicleId, payload);
      }
      navigate(`/vehiculos/${vehicleId}`);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo guardar la carga de combustible";
      setError(typeof detail === "string" ? detail : "No se pudo guardar la carga de combustible");
    }
  }

  return (
    <main className="container" style={{ maxWidth: "600px" }}>
      <h1>{isEdit ? "Editar carga de combustible" : "Nueva carga de combustible"}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>
          Tipo de combustible
          <select {...register("tipo_combustible", { required: true })}>
            {fuelTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid">
          <label>
            Fecha
            <input type="date" {...register("fecha", { required: true })} />
          </label>
          <label>
            Kilometraje
            <input type="number" {...register("kilometraje", { required: true, valueAsNumber: true })} />
          </label>
        </div>

        <div className="grid">
          <label>
            Litros
            <input type="number" step="0.01" {...register("litros", { required: true, valueAsNumber: true })} />
          </label>
          <label>
            Costo total
            <input
              type="number"
              step="0.01"
              {...register("costo_total", { required: true, valueAsNumber: true })}
            />
          </label>
        </div>

        <label>
          Estación de servicio (opcional)
          <input {...register("estacion_servicio")} placeholder="ej. YPF" />
        </label>

        <label>
          <input type="checkbox" {...register("tanque_lleno")} />
          Tanque lleno
        </label>
        <small>
          Marcá esta opción cuando llenás el tanque completo — es lo que permite calcular el rendimiento
          (km/litro) entre cargas.
        </small>

        <label style={{ marginTop: "0.75rem" }}>
          <input type="checkbox" {...register("carga_anterior_registrada")} />
          Registré la carga de combustible anterior a esta
        </label>
        <small>
          Destildá esto si en algún momento cargaste combustible sin anotarlo en la app antes de esta carga —
          así evitamos calcular un rendimiento incorrecto para ese tramo.
        </small>

        {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Guardar
        </button>
      </form>
    </main>
  );
}
