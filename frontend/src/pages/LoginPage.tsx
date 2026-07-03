import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>();

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      await login(values.username, values.password);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Usuario o contraseña incorrectos");
    }
  }

  return (
    <main className="container" style={{ maxWidth: "420px" }}>
      <article>
        <h1>Iniciar sesión</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label>
            Usuario
            <input {...register("username", { required: true })} autoFocus />
          </label>
          <label>
            Contraseña
            <input type="password" {...register("password", { required: true })} />
          </label>
          {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}
          <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
            Entrar
          </button>
        </form>
      </article>
    </main>
  );
}
