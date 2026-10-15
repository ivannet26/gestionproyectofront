import type { AreaWriteData } from "../../../../core/interfaces/organization.interface";
import XIcon from "../../../../shared/icons/XIcon";
import { useAreaForm } from "./useAreaForm";

interface AreaFormProps {
  title: string;
  submitLabel: string;
  initialData: AreaWriteData;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: AreaWriteData) => void;
}

function AreaForm({
  title,
  submitLabel,
  initialData,
  submitting,
  onClose,
  onSubmit,
}: AreaFormProps) {
  const { formData, updateField } = useAreaForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-modal">
      <div className="w-full max-w-md bg-white rounded-xl ">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
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

        <form onSubmit={handleSubmit} className="grid gap-4 p-4">
          <div className="grid gap-1.5">
            <label htmlFor="area-code" className="text-xs text-neutral-800">
              Código
            </label>
            <input
              id="area-code"
              name="code"
              type="text"
              value={formData.code}
              onChange={(e) => updateField("code", e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="area-name" className="text-xs text-neutral-800">
              Nombre
            </label>
            <input
              id="area-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
              required
            />
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
              <span>Activa</span>
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

export default AreaForm;
