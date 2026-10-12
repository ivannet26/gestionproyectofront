import { useTeamForm } from "./useTeamForm";
import type { TeamFormState } from "./useTeamForm";
import type { TeamWriteData } from "../../../core/interfaces/organization.interface";
import type { Area } from "../../../core/interfaces/organization.interface";

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
            <label htmlFor="team-name" className="form-label">
              Nombre
            </label>
            <input
              id="team-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="team-area" className="form-label">
              Área
            </label>
            <select
              id="team-area"
              name="area"
              value={formData.area}
              onChange={(e) => updateField("area", e.target.value)}
              className="form-input"
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
              {submitting ? "Guardando…" : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default TeamForm;
