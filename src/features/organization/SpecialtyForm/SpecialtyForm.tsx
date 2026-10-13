import { useSpecialtyForm } from "./useSpecialtyForm";
import type { SpecialtyWriteData } from "../../../core/interfaces/organization.interface";

interface SpecialtyFormProps {
  title: string;
  submitLabel: string;
  initialData: SpecialtyWriteData;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: SpecialtyWriteData) => void;
}

function SpecialtyForm({
  title,
  submitLabel,
  initialData,
  submitting,
  onClose,
  onSubmit,
}: SpecialtyFormProps) {
  const { formData, updateField } = useSpecialtyForm(initialData);

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
            <label htmlFor="specialty-name" className="text-neutral-900 text-sm font-medium">
              Nombre
            </label>
            <input
              id="specialty-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              required
            />
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

export default SpecialtyForm;
