import { useId } from "react";
import type { Project } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";
import AssigneeSelector from "./AssigneeSelector";

export default function ResponsiblePicker({ participants, teams, value, onChange, error, compact }: {
  participants: Project["participants"]; teams?: Project["assignment_teams"]; value: number[];
  onChange: (value: number[]) => void; error?: string; compact?: boolean;
}) {
  const instance = useId(), id = compact ? `${instance}-responsible` : "task-responsible";
  const selected = participants.filter((worker) => value.includes(worker.id));
  return <TaskProperty id={id} label="Responsables" icon="person" error={error}
    compact={compact} selected={value.length > 0} content={compact ? <TaskIcon name="person" /> : undefined}
    value={value.length ? selected.map((person) => person.name).join(", ") || "Responsables no disponibles" : "Sin persona asignada"}>
    {(close) => <><AssigneeSelector project={{ participants, assignment_teams: teams }} value={value} onChange={onChange} />
      <button type="button" className={styles.done} onClick={close}>Listo</button></>}
  </TaskProperty>;
}
