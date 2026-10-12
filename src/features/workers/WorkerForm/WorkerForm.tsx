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
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>Editar trabajador</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="modal-form">
          {textFields.map((field) => (
            <div key={field.name} className="form-row">
              <label htmlFor={field.name} className="form-label">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                value={formData[field.name]}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="form-input"
                min={field.min}
                max={field.max}
                required
              />
            </div>
          ))}
          <div className="form-row">
            <label className="checkbox-label">
              <input
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="form-checkbox"
              />
              <span>Activo</span>
            </label>
          </div>
          <footer className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
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
