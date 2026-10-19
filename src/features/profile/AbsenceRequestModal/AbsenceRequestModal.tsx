import { useState } from "react";
import XIcon from "../../../shared/icons/XIcon";
import { useToast } from "../../../hooks/useToast";
import { createAbsence } from "../../../core/services/absenceService";
import { errorText } from "../../auth/api";
import type { SessionUser } from "../../auth/api";
import { roleLabel } from "../../auth/roles";

interface AbsenceRequestModalProps {
  user: SessionUser;
  onClose: () => void;
}

const inputClass =
  "w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none";

function AbsenceRequestModal({ user, onClose }: AbsenceRequestModalProps) {
  const { addToast } = useToast();
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fin < inicio) {
      addToast({
        icon: "error",
        title: "Fechas inválidas",
        message: "La fecha de fin es anterior a la de inicio.",
      });
      return;
    }
    setSaving(true);
    try {
      await createAbsence({
        fecha_inicio: inicio,
        fecha_fin: fin,
        motivo: motivo.trim(),
      });
      addToast({
        icon: "success",
        title: "Ausencia solicitada",
        message: `De ${inicio} a ${fin}. Queda pendiente de aprobación.`,
      });
      onClose();
    } catch (failure) {
      addToast({
        icon: "error",
        title: "Error al solicitar",
        message: errorText(failure),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 className="m-0 text-sm font-medium text-neutral-800">
            Solicitar ausencia
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 p-4">
          <p className="m-0 text-xs text-neutral-600">
            Solicitando como{" "}
            <span className="font-medium text-neutral-800">{user.name}</span>{" "}
            ({roleLabel(user.role)})
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="absence-inicio" className="text-xs text-neutral-600">
                Inicio
              </label>
              <input
                id="absence-inicio"
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="absence-fin" className="text-xs text-neutral-600">
                Fin
              </label>
              <input
                id="absence-fin"
                type="date"
                required
                min={inicio || undefined}
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="absence-motivo" className="text-xs text-neutral-600">
              Motivo
            </label>
            <textarea
              id="absence-motivo"
              required
              rows={3}
              maxLength={250}
              value={motivo}
              placeholder="Describe el motivo de la ausencia"
              onChange={(e) => setMotivo(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <footer className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Enviando…" : "Solicitar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AbsenceRequestModal;
