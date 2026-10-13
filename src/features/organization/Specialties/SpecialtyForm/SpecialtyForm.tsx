import XIcon from "../../../../shared/icons/XIcon";
import { useSpecialtyForm } from "./useSpecialtyForm";
import type { SpecialtyWriteData } from "../../../../core/interfaces/organization.interface";

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
            <label
              htmlFor="specialty-name"
              className="text-xs text-neutral-800"
            >
              Nombre
            </label>
            <input
              id="specialty-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-md focus:border-neutral-400 focus:outline-none"
              required
            />
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

export default SpecialtyForm;
