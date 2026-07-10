import { useTheme } from "./ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="outline"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo noche"}
      title={theme === "dark" ? "Modo claro" : "Modo noche"}
      style={{ padding: "0 12px", minHeight: 40, width: "auto" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
