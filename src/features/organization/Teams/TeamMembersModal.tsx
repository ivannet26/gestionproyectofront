import { useState } from "react";
import XIcon from "../../../shared/icons/XIcon";
import { useTeamMemberAddition } from "./useTeamMemberAddition";
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
  const { busy, error, add } = useTeamMemberAddition(team.id, onChanged);
  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await add(code, joinedDate)) setCode("");
  };

  return (
    <div className="bg-modal">
      <div role="dialog" aria-modal="true" aria-labelledby="team-members-title" className="w-full max-w-md bg-white rounded-xl ">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 id="team-members-title" className="m-0 text-sm text-neutral-800">Añadir a {team.name}</h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <form onSubmit={handleAdd} className="grid gap-4 p-4">
          {error && (
            <p
              className="m-0 border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="grid gap-1.5">
            <label htmlFor="member-code" className="text-xs text-neutral-800">
              Código de trabajador
            </label>
            <input
              id="member-code"
              name="code"
              disabled={busy}
              type="text"
              required
              value={code}
              maxLength={50}
              placeholder="Ej. T-001"
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="member-date" className="text-xs text-neutral-800">
              Fecha de ingreso
            </label>
            <input
              id="member-date"
              name="joined_date"
              disabled={busy}
              type="date"
              required
              value={joinedDate}
              max={todayLocal()}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="w-full bg-white border border-neutral-200 text-neutral-800 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none cursor-pointer"
            />
          </div>
          <footer className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Guardando…" : "Añadir"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default TeamMembersModal;
