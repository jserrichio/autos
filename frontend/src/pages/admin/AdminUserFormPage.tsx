import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { fetchAdminUsers, registerUser, updateAdminUser } from "../../api/client";

interface FormValues {
  username: string;
  full_name: string;
  password: string;
}

export default function AdminUserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (isEdit) {
      fetchAdminUsers().then((users) => {
        const u = users.find((x) => x.id === Number(id));
        if (u) reset({ username: u.username, full_name: u.full_name ?? "", password: "" });
      });
    }
  }, [id, isEdit, reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      if (isEdit) {
        await updateAdminUser(Number(id), {
          username: values.username,
          full_name: values.full_name || null,
        });
      } else {
        await registerUser(values.username, values.password, values.full_name || null);
      }
      navigate("/admin/usuarios");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo guardar el usuario";
      setError(detail);
    }
  }

  return (
    <main className="container" style={{ maxWidth: "480px" }}>
      <h1>{isEdit ? "Editar usuario" : "Nuevo usuario"}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>
          Usuario
          <input {...register("username", { required: true })} />
        </label>
        <label>
          Nombre completo
          <input {...register("full_name")} />
        </label>
        {!isEdit && (
          <label>
            Contraseña
            <input type="password" {...register("password", { required: true })} />
          </label>
        )}

        {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Guardar
        </button>
      </form>
    </main>
  );
}
