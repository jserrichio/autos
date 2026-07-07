import { useEffect, useState } from "react";
import { createTaskType, deleteTaskType, fetchTaskTypes, updateTaskType } from "../api/client";
import type { TaskType } from "../types";

interface EditState {
  label: string;
  intervalo_km: string;
  intervalo_meses: string;
}

const emptyEdit: EditState = { label: "", intervalo_km: "", intervalo_meses: "" };

export default function TaskTypesPage() {
  const [types, setTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<EditState>(emptyEdit);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState>(emptyEdit);

  function reload() {
    setLoading(true);
    fetchTaskTypes()
      .then(setTypes)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  function extractError(err: unknown): string {
    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    return typeof detail === "string" ? detail : "Ocurrió un error";
  }

  function toInput(state: EditState) {
    return {
      label: state.label.trim(),
      intervalo_km: state.intervalo_km === "" ? null : Number(state.intervalo_km),
      intervalo_meses: state.intervalo_meses === "" ? null : Number(state.intervalo_meses),
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.label.trim()) return;
    setError(null);
    try {
      await createTaskType(toInput(nuevo));
      setNuevo(emptyEdit);
      reload();
    } catch (err) {
      setError(extractError(err));
    }
  }

  function startEdit(t: TaskType) {
    setEditandoId(t.id);
    setEdit({
      label: t.label,
      intervalo_km: t.intervalo_km?.toString() ?? "",
      intervalo_meses: t.intervalo_meses?.toString() ?? "",
    });
  }

  async function handleSaveEdit(id: number) {
    if (!edit.label.trim()) return;
    setError(null);
    try {
      await updateTaskType(id, toInput(edit));
      setEditandoId(null);
      reload();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleDelete(t: TaskType) {
    if (!confirm(`¿Eliminar el tipo de tarea "${t.label}"?`)) return;
    setError(null);
    try {
      await deleteTaskType(t.id);
      reload();
    } catch (err) {
      setError(extractError(err));
    }
  }

  return (
    <main className="container">
      <h1>Tipos de tarea</h1>
      <p>
        Los tipos de tarea se usan para agrupar el historial y calcular los próximos mantenimientos. Si configurás
        un intervalo (en km y/o meses), al cargar una tarea de ese tipo el recordatorio se completa solo — después
        podés ajustarlo para esa tarea en particular. El tipo <strong>Otro</strong> es de uso libre y no admite
        recordatorio.
      </p>

      <form onSubmit={handleCreate}>
        <div className="grid">
          <input
            placeholder="Nombre del nuevo tipo (ej. Alineación de dirección)"
            value={nuevo.label}
            onChange={(e) => setNuevo({ ...nuevo, label: e.target.value })}
          />
          <input
            type="number"
            placeholder="Intervalo (km, opcional)"
            value={nuevo.intervalo_km}
            onChange={(e) => setNuevo({ ...nuevo, intervalo_km: e.target.value })}
          />
          <input
            type="number"
            placeholder="Intervalo (meses, opcional)"
            value={nuevo.intervalo_meses}
            onChange={(e) => setNuevo({ ...nuevo, intervalo_meses: e.target.value })}
          />
          <button type="submit">Agregar tipo</button>
        </div>
      </form>

      {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="rtable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Intervalo km</th>
              <th>Intervalo meses</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td data-label="Nombre">
                  {editandoId === t.id ? (
                    <input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
                  ) : (
                    t.label
                  )}
                </td>
                <td data-label="Intervalo km">
                  {editandoId === t.id ? (
                    t.permite_recordatorio ? (
                      <input
                        type="number"
                        value={edit.intervalo_km}
                        onChange={(e) => setEdit({ ...edit, intervalo_km: e.target.value })}
                      />
                    ) : (
                      "-"
                    )
                  ) : (
                    (t.intervalo_km?.toLocaleString("es-AR") ?? "-")
                  )}
                </td>
                <td data-label="Intervalo meses">
                  {editandoId === t.id ? (
                    t.permite_recordatorio ? (
                      <input
                        type="number"
                        value={edit.intervalo_meses}
                        onChange={(e) => setEdit({ ...edit, intervalo_meses: e.target.value })}
                      />
                    ) : (
                      "-"
                    )
                  ) : (
                    (t.intervalo_meses ?? "-")
                  )}
                </td>
                <td className="actions-cell">
                  {editandoId === t.id ? (
                    <>
                      <a
                        href="#"
                        className="action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSaveEdit(t.id);
                        }}
                      >
                        Guardar
                      </a>
                      <a
                        href="#"
                        className="action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditandoId(null);
                        }}
                      >
                        Cancelar
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href="#"
                        className="action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit(t);
                        }}
                      >
                        Editar
                      </a>
                      {!t.es_protegido && (
                        <a
                          href="#"
                          className="action-btn danger"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(t);
                          }}
                        >
                          Eliminar
                        </a>
                      )}
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
