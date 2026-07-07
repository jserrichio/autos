import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createTask,
  deleteAttachment,
  downloadAttachment,
  fetchTask,
  fetchTaskTypes,
  fetchVehicle,
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
    getValues,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { tipo: "cambio_aceite", fecha: new Date().toISOString().slice(0, 10) },
  });

  const tipoSeleccionado = watch("tipo");
  const tipoInfo = taskTypes.find((t) => t.value === tipoSeleccionado);
  const admiteRecordatorio = tipoInfo?.permite_recordatorio ?? true;

  const [typesLoaded, setTypesLoaded] = useState(false);
  const [taskLoaded, setTaskLoaded] = useState(!isEdit);
  const [vehicleReady, setVehicleReady] = useState(isEdit);
  const readyRef = useRef(false);
  const lastTipoRef = useRef<string | null>(null);

  useEffect(() => {
    fetchTaskTypes().then((types) => {
      setTaskTypes(types);
      setTypesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) {
      fetchVehicle(vehicleId).then((v) => {
        setValue("kilometraje", v.kilometraje_actual);
        setVehicleReady(true);
      });
    }
  }, [isEdit, vehicleId, setValue]);

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
        setTaskLoaded(true);
      });
    }
  }, [isEdit, taskId, reset]);

  // Precarga el recordatorio con el intervalo configurado para el tipo elegido.
  // Al editar una tarea existente, no pisa el recordatorio ya guardado a menos
  // que el usuario cambie el tipo explícitamente.
  useEffect(() => {
    if (!typesLoaded || !taskLoaded || !vehicleReady) return;
    const firstRun = !readyRef.current;
    readyRef.current = true;

    if (firstRun) {
      lastTipoRef.current = tipoSeleccionado;
      if (isEdit) return;
    } else if (tipoSeleccionado === lastTipoRef.current) {
      return;
    } else {
      lastTipoRef.current = tipoSeleccionado;
    }

    const info = taskTypes.find((t) => t.value === tipoSeleccionado);
    if (!info || !info.permite_recordatorio) return;

    let nextFecha = "";
    if (info.intervalo_meses != null) {
      const fechaVal = getValues("fecha");
      if (fechaVal) {
        const d = new Date(fechaVal);
        d.setMonth(d.getMonth() + info.intervalo_meses);
        nextFecha = d.toISOString().slice(0, 10);
      }
    }
    setValue("proximo_fecha_estimada", nextFecha);

    let nextKm: number | null = null;
    if (info.intervalo_km != null) {
      const kmVal = Number(getValues("kilometraje"));
      if (kmVal > 0) {
        nextKm = kmVal + info.intervalo_km;
      }
    }
    setValue("proximo_km_estimado", nextKm);
  }, [tipoSeleccionado, typesLoaded, taskLoaded, vehicleReady, taskTypes, isEdit, getValues, setValue]);

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
      proximo_fecha_estimada: admiteRecordatorio ? values.proximo_fecha_estimada || null : null,
      proximo_km_estimado:
        !admiteRecordatorio ||
        values.proximo_km_estimado === null ||
        (values.proximo_km_estimado as unknown as string) === ""
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
        <p>
          <small>
            <Link to="/tipos-tarea" target="_blank">
              Gestionar tipos de tarea
            </Link>
          </small>
        </p>

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

        {admiteRecordatorio ? (
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
        ) : (
          <p>
            <small>
              El tipo "{tipoInfo?.label}" no admite recordatorio de próximo mantenimiento. Si necesitás uno,
              creá un tipo de tarea específico.
            </small>
          </p>
        )}

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
