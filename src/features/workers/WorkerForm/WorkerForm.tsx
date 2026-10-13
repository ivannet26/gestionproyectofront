import { useWorkerForm } from "./useWorkerForm";
import type { WorkerFormState } from "./useWorkerForm";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";

interface TextField {
  name: Exclude<keyof WorkerFormState, "active">;
  label: string;
  type: string;
  min?: string;
  max?: string;
}

const textFields: TextField[] = [
  { name: "first_names", label: "Nombres", type: "text" },
  { name: "last_names", label: "Apellidos", type: "text" },
  { name: "email", label: "Correo", type: "email" },
  { name: "area", label: "Área", type: "text" },
  { name: "weekly_hours", label: "Horas/sem", type: "number", min: "1", max: "80" },
];

interface WorkerFormProps {
  worker: Worker;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: WorkerUpdateData) => void;
}

function WorkerForm({ worker, submitting, onClose, onSubmit }: WorkerFormProps) {
  const { formData, updateField, toUpdateData } = useWorkerForm(worker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toUpdateData());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 shadow-none">
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
          <h3 className="m-0 text-base font-semibold text-neutral-900">Editar trabajador</h3>
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
          {textFields.map((field) => (
            <div key={field.name} className="grid gap-1.5">
              <label htmlFor={field.name} className="text-neutral-900 text-sm font-medium">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                value={formData[field.name]}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
                min={field.min}
                max={field.max}
                required
              />
            </div>
          ))}
          <div className="grid gap-1.5">
            <label className="flex items-center gap-2 text-sm text-neutral-900">
              <input
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="accent-neutral-900"
              />
              <span>Activo</span>
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
              {submitting ? "Guardando…" : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default WorkerForm;
