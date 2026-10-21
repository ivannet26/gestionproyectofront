import type { ProjectDraft, TeamOption } from "../types";

export default function ProjectTeamPicker({ draft, teams, loading, error, retry, onChange }: {
  draft: ProjectDraft; teams: TeamOption[]; loading: boolean; error: string; retry: () => Promise<void>; onChange: (changes: Partial<ProjectDraft>) => void;
}) {
  const ids = draft.teamIds ?? [];
  const people = new Set(teams.filter((team) => ids.includes(team.id)).flatMap((team) => team.members.filter((person) => person.eligible).map((person) => person.id)));
  return <div className="grid min-w-0 gap-2 text-xs">
    <div className="max-h-40 overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 p-2" role="group" aria-label="Equipos activos del área">
      {loading && <p role="status">Cargando equipos…</p>}
      {error && <p role="alert">{error} <button type="button" className="cursor-pointer underline" onClick={() => { void retry(); }}>Reintentar</button></p>}
      {!loading && !error && !teams.length && <p role="status">No hay equipos activos en el área.</p>}
      {teams.map((team) => <div key={team.id} className="border-b border-neutral-100 py-2 last:border-0"><label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" name="project_team" value={team.id} disabled={!team.eligible_count || loading} checked={ids.includes(team.id)} onChange={(event) => onChange({ teamIds: event.target.checked ? [...ids, team.id] : ids.filter((id) => id !== team.id) })} />
        <span className="min-w-0 break-words">{team.name}<small className="block text-neutral-600">{team.eligible_count} integrantes elegibles{!team.eligible_count ? " · No aporta participantes" : ""}</small></span>
      </label><details className="ml-5 mt-1"><summary className="cursor-pointer rounded py-1 text-neutral-700">Ver integrantes</summary><ul className="m-0 list-none space-y-1 p-0 text-neutral-600">{team.members.map((person) => <li key={person.id}>{person.name}</li>)}</ul></details></div>)}
    </div>
    <p className="m-0 text-neutral-600" role="status">{ids.length} equipos · {people.size} trabajadores únicos</p>
  </div>;
}
