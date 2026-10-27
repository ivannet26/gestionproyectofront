import { useTheme } from "../../hooks/useTheme";
import type { Theme } from "../../hooks/useTheme";

const options: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <main
      className="min-h-full bg-white text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
      id="main-content"
    >
      <header className="mb-8">
        <h1 className="m-0 text-lg font-medium text-neutral-800 dark:text-neutral-100">
          Configuración
        </h1>
        <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          Preferencias de la aplicación.
        </p>
      </header>

      <section className="max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
        <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-3">
          Apariencia
        </h2>
        <div className="flex gap-2">
          {options.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer border ${
                  active
                    ? "bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-800 dark:border-neutral-100"
                    : "bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default SettingsPage;
