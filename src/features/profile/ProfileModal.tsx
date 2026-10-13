import { useState } from "react";
import XIcon from "../../shared/icons/XIcon";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import { roleLabel } from "../auth/roles";
import { errorText } from "../auth/api";
import { useProfile } from "./useProfile";

interface ProfileModalProps {
  onClose: () => void;
}

function ProfileModal({ onClose }: ProfileModalProps) {
  const {
    profile,
    specialties,
    catalog,
    loading,
    error,
    saving,
    addSpecialty,
    dropSpecialty,
  } = useProfile();
  const [selectedId, setSelectedId] = useState("");
  const [formError, setFormError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setFormError("");
    try {
      await addSpecialty(Number(selectedId));
      setSelectedId("");
    } catch (failure) {
      setFormError(errorText(failure));
    }
  };

  const handleDrop = async (id: number, name: string) => {
    setFormError("");
    try {
      await dropSpecialty({ id, name, level: 0 });
    } catch (failure) {
      setFormError(errorText(failure));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="m-0 text-sm font-medium text-neutral-800">
            Mi perfil
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <div className="p-4">
          {loading ? (
            <p role="status" className="m-0 text-xs text-neutral-600">
              Cargando perfil…
            </p>
          ) : error != null || profile == null ? (
            <p role="alert" className="m-0 text-xs text-neutral-600">
              No se pudo cargar tu perfil.
            </p>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-medium text-neutral-800">
                  {profile.name}
                </p>
                <p className="m-0 text-xs text-neutral-600">{profile.email}</p>
                <p className="m-0 text-[10px] text-neutral-600">
                  {roleLabel(profile.role)}
                </p>
              </div>

              <form onSubmit={handleAdd} className="pt-2">
                <h4 className="m-0 text-xs font-medium text-neutral-700">
                  Mis especialidades ({specialties.length})
                </h4>

                {specialties.length > 0 && (
                  <ul className="m-0 mt-2 p-0 list-none flex flex-wrap gap-1.5">
                    {specialties.map((item) => (
                      <li
                        key={item.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded"
                      >
                        {item.name}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDrop(item.id, item.name)}
                          aria-label={`Quitar ${item.name}`}
                          className="text-neutral-600 hover:text-neutral-800 cursor-pointer disabled:opacity-50 leading-none"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="relative flex-1 min-w-48">
                    <select
                      value={selectedId}
                      aria-label="Especialidad a agregar"
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 text-neutral-800 pl-3 pr-8 py-1.5 text-xs rounded-md appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">Selecciona una especialidad</option>
                      {catalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !selectedId}
                    className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Agregar
                  </button>
                </div>

                {formError && (
                  <p role="alert" className="m-0 mt-2 text-xs text-neutral-600">
                    {formError}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end p-4 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ProfileModal;
