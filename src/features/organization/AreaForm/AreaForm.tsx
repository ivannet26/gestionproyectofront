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
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>{title}</h3>
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
          <div className="form-row">
            <label htmlFor="area-code" className="form-label">
              Código
            </label>
            <input
              id="area-code"
              name="code"
              type="text"
              value={formData.code}
              onChange={(e) => updateField("code", e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="area-name" className="form-label">
              Nombre
            </label>
            <input
              id="area-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-row">
            <label className="checkbox-label">
              <input
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="form-checkbox"
              />
              <span>Activa</span>
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
              {submitting ? "Guardando…" : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AreaForm;
