import { useState } from "react";
import XIcon from "../../../shared/icons/XIcon";
import Button from "../../../shared/Button/Button";
import SecondaryButton from "../../../shared/Button/SecondaryButton";
import { addTeamMember } from "../../../core/services/organizationService";
import { listWorkers } from "../../../core/services/workerService";
import type { Team } from "../../../core/interfaces/organization.interface";

interface TeamMembersModalProps {
  team: Team;
  onClose: () => void;
  onChanged: () => void;
}

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function TeamMembersModal({ team, onClose, onChanged }: TeamMembersModalProps) {
  const [code, setCode] = useState("");
  const [joinedDate, setJoinedDate] = useState(todayLocal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || !joinedDate) return;
    setBusy(true);
    try {
      const matches = await listWorkers({ search: trimmed });
      const worker =
        matches.find(
          (candidate) => candidate.code.toLowerCase() === trimmed.toLowerCase(),
        ) ?? (matches.length === 1 ? matches[0] : undefined);
      if (!worker) {
        setError("No existe un trabajador con ese código.");
        return;
      }
      await addTeamMember(team.id, {
        worker_id: worker.id,
        joined_date: joinedDate,
      });
      setCode("");
      setError("");
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo agregar.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-modal">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl ">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">Añadir a {team.name}</h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <form onSubmit={handleAdd} className="grid gap-4 p-4">
          {error && (
            <p
              className="m-0 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="grid gap-1.5">
            <label htmlFor="member-code" className="text-xs text-neutral-800 dark:text-neutral-100">
              Código de trabajador
            </label>
            <input
              id="member-code"
              name="code"
              type="text"
              required
              value={code}
              maxLength={50}
              placeholder="Ej. T-001"
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="member-date" className="text-xs text-neutral-800 dark:text-neutral-100">
              Fecha de ingreso
            </label>
            <input
              id="member-date"
              name="joined_date"
              type="date"
              required
              value={joinedDate}
              max={todayLocal()}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none cursor-pointer"
            />
          </div>
          <footer className="flex items-center justify-end gap-2 pt-1">
            <SecondaryButton type="button" onClick={onClose}>
              Cancelar
            </SecondaryButton>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Añadir"}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default TeamMembersModal;