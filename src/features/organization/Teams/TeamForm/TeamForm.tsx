import XIcon from "../../../../shared/icons/XIcon";
import { useTeamForm } from "./useTeamForm";
import type { TeamFormState } from "./useTeamForm";
import type { TeamWriteData } from "../../../../core/interfaces/organization.interface";
import type { Area } from "../../../../core/interfaces/organization.interface";

interface TeamFormProps {
  title: string;
  submitLabel: string;
  initialData: TeamFormState;
  areas: Area[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: TeamWriteData) => void;
}

function TeamForm({
  title,
  submitLabel,
  initialData,
  areas,
  submitting,
  onClose,
  onSubmit,
}: TeamFormProps) {
  const { formData, updateField, toWriteData } = useTeamForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toWriteData());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-lg">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="m-0 text-sm text-neutral-800">{title}</h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 p-4">
          <div className="grid gap-1.5">
            <label htmlFor="team-name" className="text-xs text-neutral-800">
              Nombre
            </label>
            <input
              id="team-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-md focus:border-neutral-400 focus:outline-none"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="team-area" className="text-xs text-neutral-800">
              Área
            </label>
            <select
              id="team-area"
              name="area"
              value={formData.area}
              onChange={(e) => updateField("area", e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 px-3 py-1.5 text-xs rounded-md focus:border-neutral-400 focus:outline-none cursor-pointer"
              required
            >
              <option value="">Seleccionar área…</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="flex items-center gap-2 text-xs text-neutral-800 cursor-pointer">
              <input
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="accent-neutral-800 cursor-pointer"
              />
              <span>Activo</span>
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs rounded-md cursor-pointer"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? "Guardando…" : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default TeamForm;
