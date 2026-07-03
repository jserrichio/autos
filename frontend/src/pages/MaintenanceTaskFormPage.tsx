import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  createTask,
  deleteAttachment,
  downloadAttachment,
  fetchTask,
  fetchTaskTypes,
  updateTask,
  uploadAttachment,
} from "../api/client";
import type { Attachment, MaintenanceTaskInput, TaskType, TipoTarea } from "../types";

interface FormValues {
  tipo: TipoTarea;
  tipo_otro_texto: string;
  fecha: string;
  kilometraje: number;
  costo: number | null;
  notas: string;
  taller_nombre: string;
  taller_contacto: string;
  proximo_fecha_estimada: string;
  proximo_km_estimado: number | null;
}

export default function MaintenanceTaskFormPage() {
  const { id: vehicleIdParam, taskId } = useParams();
  const vehicleId = Number(vehicleIdParam);
  const isEdit = Boolean(taskId);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { tipo: "cambio_aceite", fecha: new Date().toISOString().slice(0, 10) },
  });

  const tipoSeleccionado = watch("tipo");

  useEffect(() => {
    fetchTaskTypes().then(setTaskTypes);
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchTask(Number(taskId)).then((t) => {
        reset({
          tipo: t.tipo,
          tipo_otro_texto: t.tipo_otro_texto ?? "",
          fecha: t.fecha,
          kilometraje: t.kilometraje,
          costo: t.costo ? Number(t.costo) : null,
          notas: t.notas ?? "",
          taller_nombre: t.taller_nombre ?? "",
          taller_contacto: t.taller_contacto ?? "",
          proximo_fecha_estimada: t.proximo_fecha_estimada ?? "",
          proximo_km_estimado: t.proximo_km_estimado,
        });
        setAttachments(t.attachments);
      });
    }
  }, [isEdit, taskId, reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload: MaintenanceTaskInput = {
      tipo: values.tipo,
      tipo_otro_texto: values.tipo === "otro" ? values.tipo_otro_texto : null,
      fecha: values.fecha,
      kilometraje: Number(values.kilometraje),
      costo: values.costo === null || (values.costo as unknown as string) === "" ? null : Number(values.costo),
      notas: values.notas || null,
      taller_nombre: values.taller_nombre || null,
      taller_contacto: values.taller_contacto || null,
      proximo_fecha_estimada: values.proximo_fecha_estimada || null,
      proximo_km_estimado:
        values.proximo_km_estimado === null || (values.proximo_km_estimado as unknown as string) === ""
          ? null
          : Number(values.proximo_km_estimado),
    };
    try {
      if (isEdit) {
        await updateTask(Number(taskId), payload);
      } else {
        await createTask(vehicleId, payload);
      }
      navigate(`/vehiculos/${vehicleId}`);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo guardar la tarea";
      setError(typeof detail === "string" ? detail : "No se pudo guardar la tarea");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit || !e.target.files?.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(Number(taskId), e.target.files[0]);
      setAttachments((prev) => [...prev, uploaded]);
    } catch {
      setError("No se pudo subir el archivo (verificá el tipo y tamaño)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    await deleteAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  return (
    <main className="container" style={{ maxWidth: "600px" }}>
      <h1>{isEdit ? "Editar tarea de mantenimiento" : "Nueva tarea de mantenimiento"}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>
          Tipo de tarea
          <select {...register("tipo", { required: true })}>
            {taskTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {tipoSeleccionado === "otro" && (
          <label>
            Especificar tipo
            <input {...register("tipo_otro_texto", { required: tipoSeleccionado === "otro" })} />
          </label>
        )}

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

        <label>
          Costo (opcional)
          <input type="number" step="0.01" {...register("costo", { valueAsNumber: true })} />
        </label>

        <div className="grid">
          <label>
            Taller / proveedor
            <input {...register("taller_nombre")} />
          </label>
          <label>
            Contacto del taller
            <input {...register("taller_contacto")} />
          </label>
        </div>

        <fieldset>
          <legend>Recordatorio de próximo mantenimiento (opcional)</legend>
          <div className="grid">
            <label>
              Próxima fecha estimada
              <input type="date" {...register("proximo_fecha_estimada")} />
            </label>
            <label>
              Próximo km estimado
              <input type="number" {...register("proximo_km_estimado", { valueAsNumber: true })} />
            </label>
          </div>
        </fieldset>

        <label>
          Notas
          <textarea {...register("notas")} rows={3} />
        </label>

        {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Guardar
        </button>
      </form>

      <section>
        <h2>Comprobantes</h2>
        {isEdit ? (
          <>
            {attachments.length === 0 ? (
              <p>Sin comprobantes adjuntos.</p>
            ) : (
              <ul>
                {attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        downloadAttachment(a);
                      }}
                    >
                      {a.filename_original}
                    </a>{" "}
                    ({Math.round(a.size_bytes / 1024)} KB){" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAttachment(a.id);
                      }}
                    >
                      Eliminar
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </>
        ) : (
          <p>Guardá la tarea primero para poder adjuntar comprobantes.</p>
        )}
      </section>
    </main>
  );
}
