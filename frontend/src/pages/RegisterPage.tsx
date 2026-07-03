import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface RegisterFormValues {
  username: string;
  full_name: string;
  password: string;
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>();

  async function onSubmit(values: RegisterFormValues) {
    setError(null);
    try {
      await registerUser(values.username, values.password, values.full_name || null);
      await login(values.username, values.password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo crear la cuenta";
      setError(typeof detail === "string" ? detail : "No se pudo crear la cuenta");
    }
  }

  return (
    <main className="container" style={{ maxWidth: "420px" }}>
      <article>
        <h1>Crear cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label>
            Usuario
            <input {...register("username", { required: true })} autoFocus />
          </label>
          <label>
            Nombre completo (opcional)
            <input {...register("full_name")} />
          </label>
          <label>
            Contraseña
            <input type="password" {...register("password", { required: true, minLength: 6 })} />
          </label>
          {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}
          <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
            Crear cuenta
          </button>
        </form>
        <p>
          <Link to="/login">Ya tengo cuenta, iniciar sesión</Link>
        </p>
      </article>
    </main>
  );
}
