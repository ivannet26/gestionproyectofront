import { useWorkerForm } from "./useWorkerForm";
import type { WorkerFormState } from "./useWorkerForm";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";
import XIcon from "../../../shared/icons/XIcon";

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
  {
    name: "weekly_hours",
    label: "Horas/sem",
    type: "number",
    min: "1",
    max: "80",
  },
];

interface WorkerFormProps {
  worker: Worker;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: WorkerUpdateData) => void;
}

function WorkerForm({
  worker,
  submitting,
  onClose,
  onSubmit,
}: WorkerFormProps) {
  const { formData, updateField, toUpdateData } = useWorkerForm(worker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toUpdateData());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-neutral-200 rounded-lg">
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-neutral-700">Editar trabajador</h3>
          <button
            type="button"
            className="p-2 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg cursor-pointer text-base leading-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-5"></XIcon>
          </button>
        </header>

        <form id="worker-form" onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textFields.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label
                  htmlFor={field.name}
                  className="text-xs text-neutral-600"
                >
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name]}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full h-9 px-4 text-sm text-neutral-900 bg-white border border-neutral-200 rounded-lg focus:border-neutral-400 focus:ring-0 focus-visible:outline-none"
                  min={field.min}
                  max={field.max}
                  required
                />
              </div>
            ))}

            <div className="flex items-center sm:pt-6 pl-2">
              <label className="inline-flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
                <input
                  name="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => updateField("active", e.target.checked)}
                  className="rounded border-neutral-200 accent-neutral-900 cursor-pointer"
                />
                Trabajador activo
              </label>
            </div>
          </div>
        </form>
        <footer className="flex items-center justify-end gap-2 p-4">
          <button
            type="button"
            className="px-4 py-2 text-sm text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="worker-form"
            className="px-4 py-2 text-sm bg-neutral-800 text-white rounded-lg hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default WorkerForm;
