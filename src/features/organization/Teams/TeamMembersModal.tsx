import { useState } from "react";
import { useTeamMemberAddition } from "./useTeamMemberAddition";
import Form from "../../../shared/Form/Form";
import Input from "../../../shared/Input/Input";
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
    <Form title={`Añadir a ${team.name}`} submitLabel="Añadir" submitting={busy} onClose={onClose} onSubmit={handleAdd}>
      {error && <p className="col-span-2 m-0 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100" role="alert">{error}</p>}
      <div className="col-span-2 grid gap-1.5">
        <label htmlFor="member-code" className="text-xs text-neutral-800 dark:text-neutral-100">Código de trabajador</label>
        <Input disabled={busy} id="member-code" name="code" type="text" required value={code} maxLength={50} placeholder="Ej. T-001" onChange={(e) => setCode(e.target.value)} />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label htmlFor="member-date" className="text-xs text-neutral-800 dark:text-neutral-100">Fecha de ingreso</label>
        <Input disabled={busy} id="member-date" name="joined_date" type="date" required value={joinedDate} max={todayLocal()} onChange={(e) => setJoinedDate(e.target.value)} />
      </div>
    </Form>
  );
}

export default TeamMembersModal;
