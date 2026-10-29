import { useState } from "react";
import type { SessionUser } from "../auth/api";
import { errorText } from "../auth/api";
import ResourceStatus from "../../shared/ResourceStatus";
import { useTheme } from "../../hooks/useTheme";
import ThemePreview from "./ThemePreview";
import type { Theme } from "../../hooks/useTheme";
import { useProfile } from "../profile/ProfileModal/useProfile";
import Avatar from "../../shared/Avatar";
import UserIcon from "../../shared/icons/UserIcon";
import AtIcon from "../../shared/icons/AtIcon";

const appearanceOptions: Array<{
  value: Theme;
  label: string;
}> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automática" },
];

function SettingsPage({ user }: { user: SessionUser }) {
  const { theme, setTheme } = useTheme();
  const {
    mine, options,
    specialties,
    catalog,
    saving,
    addSpecialty,
    dropSpecialty,
  } = useProfile();

  const [mutationError, setMutationError] = useState("");
  const currentName = user.name;
  const currentEmail = user.email;
  const editable = mine.ready && !mine.pending && !mine.error && !saving;

  const allSpecialties = [...specialties, ...catalog].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const isMine = (id: number) => specialties.some((s) => s.id === id);

  const toggleSpecialty = async (id: number) => {
    setMutationError("");
    try {
      const own = specialties.find((item) => item.id === id);
      if (own) await dropSpecialty(own.id);
      else await addSpecialty(id);
    } catch (failure) { setMutationError(errorText(failure)); }
  };

  return (
    <main
      className="min-h-full max-w-4xl mx-auto text-neutral-800 dark:text-neutral-100 pb-16"
      id="main-content"
    >
      <header className="mb-6">
        <h1 className="text-xl  text-neutral-900 dark:text-white">
          Mis ajustes
        </h1>
      </header>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {/* Sección: Perfil */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-white">
              Perfil
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Tu información personal y los ajustes de seguridad de tu cuenta en
              la plataforma.
            </p>
          </div>

          <div className="md:flex-2 max-w-xl space-y-4">
            <div>
              <div className="flex items-center gap-3">
                {user && (
                  <Avatar
                    name={currentName}
                    className="size-14 text-base ring-2 ring-neutral-300 dark:ring-neutral-700 select-none"
                  />
                )}
              </div>
              <p className="mt-4 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {currentName}
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Nombre completo
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                <input
                  id="profile-name"
                  type="text"
                  value={currentName}
                  readOnly
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <AtIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                <input
                  id="profile-email"
                  type="email"
                  value={currentEmail}
                  readOnly
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                />
              </div>
            </div>


          </div>
        </section>

        {/* Sección: Apariencia */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-white">
              Apariencia
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Elige el modo claro u oscuro, o cambia el modo automáticamente
              según tu sistema.
            </p>
          </div>

          <div className="md:flex-2 flex flex-wrap items-start gap-4">
            {appearanceOptions.map((option) => {
              const active = theme === option.value;
              return (
                <div key={option.value} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-label={`Apariencia ${option.label}`}
                    aria-pressed={active}
                    className={`w-32 rounded-xl border p-1 text-left cursor-pointer overflow-hidden ${
                      active
                        ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900 dark:ring-white bg-neutral-50 dark:bg-neutral-800"
                        : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                  >
                    <ThemePreview
                      theme={option.value}
                      className="w-full aspect-video rounded-lg overflow-hidden"
                    />
                  </button>
                  <span className="mt-2 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección: Mis especialidades */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-white">
              Mis especialidades
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Marca las especialidades y competencias que dominas para la
              asignación de proyectos.
            </p>
          </div>

          <div className="md:flex-2 max-w-xl">
            <ResourceStatus label="tus especialidades" {...mine} />
            <ResourceStatus label="opciones de especialidades" {...options} />
            {mutationError && <p role="alert" className="text-xs text-red-700">{mutationError}</p>}
            {mine.ready && options.ready && !mine.pending && !options.pending && !mine.error && !options.error && allSpecialties.length === 0 ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                No hay especialidades disponibles.
              </p>
            ) : (
              <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2">
                {allSpecialties.map((item) => {
                  const checked = isMine(item.id);
                  return (
                    <li key={item.id}>
                      <label className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!editable || (!checked && (!options.ready || options.pending || Boolean(options.error)))}
                          onChange={() => void toggleSpecialty(item.id)}
                          className="accent-neutral-800 dark:accent-neutral-100 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-neutral-800 dark:text-neutral-100">
                          {item.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default SettingsPage;
