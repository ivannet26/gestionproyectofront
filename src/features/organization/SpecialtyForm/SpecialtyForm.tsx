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
            <label htmlFor="specialty-name" className="form-label">
              Nombre
            </label>
            <input
              id="specialty-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="form-input"
              required
            />
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

export default SpecialtyForm;
