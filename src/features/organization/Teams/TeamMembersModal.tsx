import { useEffect, useState } from "react";
import TrashIcon from "../../../shared/icons/TrashIcon";
import {
  addTeamMember,
  listTeamMembers,
  removeTeamMember,
} from "../../../core/services/organizationService";
import { listWorkers } from "../../../core/services/workerService";
import type {
  Team,
  TeamMember,
} from "../../../core/interfaces/organization.interface";
import type { Worker } from "../../../core/interfaces/worker.interface";

interface TeamMembersModalProps {
  team: Team;
  onClose: () => void;
  onChanged: () => void;
}

function TeamMembersModal({ team, onClose, onChanged }: TeamMembersModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [candidates, setCandidates] = useState<Worker[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    try {
      setMembers(await listTeamMembers(team.id));
    } catch {
      setError("No se pudo cargar los miembros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetchMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchInput.trim();
    setSearchTerm(term);
    if (!term) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    try {
      setCandidates(await listWorkers({ search: term }));
      setError("");
    } catch {
      setError("No se pudo buscar trabajadores.");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await addTeamMember(team.id, { worker_id: Number(selectedId) });
      setSelectedId("");
      setError("");
      await fetchMembers();
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo agregar.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`¿Quitar a ${member.worker_name} del equipo?`)) return;
    setBusy(true);
    try {
      await removeTeamMember(team.id, member.id);
      setError("");
      await fetchMembers();
      onChanged();
    } catch {
      setError("No se pudo quitar al miembro.");
    } finally {
      setBusy(false);
    }
  };

  const memberWorkerIds = new Set(members.map((member) => member.worker));
  const available = candidates.filter(
    (worker) => !memberWorkerIds.has(worker.id),
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white border border-neutral-200 rounded-xl">
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
          <h3 className="m-0 text-base font-semibold text-neutral-900">
            {team.name} · {members.length}
          </h3>
          <button
            type="button"
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-md text-xl cursor-pointer leading-none"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="grid gap-3 p-4">
          {error && (
            <p
              className="m-0 border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
              role="alert"
            >
              {error}
            </p>
          )}
          {loading ? (
            <p role="status" className="m-0 text-sm text-neutral-600">
              Cargando miembros…
            </p>
          ) : members.length === 0 ? (
            <p role="status" className="m-0 text-sm text-neutral-600">
              Sin miembros en el equipo.
            </p>
          ) : (
            <ul className="m-0 p-0 list-none">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 py-3 border-b border-neutral-200 last:border-b-0"
                >
                  <span className="flex-1 min-w-0 text-sm text-neutral-900">
                    {member.worker_name}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {member.joined_date}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemove(member)}
                    aria-label={`Quitar a ${member.worker_name}`}
                    className="p-2 text-neutral-600 hover:text-neutral-900 bg-white cursor-pointer disabled:opacity-50"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder="Buscar trabajador por nombre o código"
              aria-label="Buscar trabajador"
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 min-w-0 min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              disabled={searching}
              className="min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm cursor-pointer disabled:opacity-50"
            >
              Buscar
            </button>
          </form>
          {searchTerm !== "" && (
            <form onSubmit={handleAdd} className="flex items-center gap-2">
              <select
                value={selectedId}
                aria-label="Trabajador a añadir"
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 min-w-0 min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              >
                <option value="">Selecciona un trabajador…</option>
                {available.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.first_names} {worker.last_names} · {worker.code}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy || !selectedId}
                className="min-h-[40px] px-4 py-2 bg-neutral-900 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Añadir
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamMembersModal;
