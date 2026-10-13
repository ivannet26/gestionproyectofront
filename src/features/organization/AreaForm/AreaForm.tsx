import { useAreaForm } from "./useAreaForm";
import type { AreaWriteData } from "../../../core/interfaces/organization.interface";

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 shadow-none">
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
          <h3 className="m-0 text-base font-semibold text-neutral-900">{title}</h3>
          <button
            type="button"
            className="min-w-10 min-h-10 text-neutral-900 bg-neutral-100 border border-neutral-200 text-xl cursor-pointer shadow-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="grid gap-3 p-5">
          <div className="grid gap-1.5">
            <label htmlFor="area-code" className="text-neutral-900 text-sm font-medium">
              Código
            </label>
            <input
              id="area-code"
              name="code"
              type="text"
              value={formData.code}
              onChange={(e) => updateField("code", e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="area-name" className="text-neutral-900 text-sm font-medium">
              Nombre
            </label>
            <input
              id="area-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label className="flex items-center gap-2 text-sm text-neutral-900">
              <input
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="accent-neutral-900"
              />
              <span>Activa</span>
            </label>
          </div>
          <footer className="flex justify-end gap-3 mt-3">
            <button
              type="button"
              className="min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm cursor-pointer shadow-none"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-neutral-900 text-white text-sm font-medium shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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
