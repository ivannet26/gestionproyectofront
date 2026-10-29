import { useId } from "react";
import type { Project } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import UserIcon from "../../../shared/icons/UserIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";
import AssigneeSelector from "./AssigneeSelector";

export default function ResponsiblePicker({
  projectId,
  participants,
  teams,
  value,
  onChange,
  error,
  compact,
}: {
  projectId: number;
  participants: Project["participants"];
  teams?: Project["assignment_teams"];
  value: number[];
  onChange: (value: number[]) => void;
  error?: string;
  compact?: boolean;
}) {
  const instance = useId(),
    id = compact ? `${instance}-responsible` : "task-responsible";
  const selected = participants.filter((worker) => value.includes(worker.id));
  return (
    <TaskProperty
      id={id}
      label="Responsables"
      icon={UserIcon}
      error={error}
      compact={compact}
      selected={value.length > 0}
      content={compact ? <UserIcon className="size-4" /> : undefined}
      value={
        value.length
          ? selected.map((person) => person.name).join(", ") ||
            "Responsables no disponibles"
          : "Sin persona asignada"
      }
    >
      {(close) => (
        <>
          <AssigneeSelector
            project={{ id: projectId, participants, assignment_teams: teams }}
            value={value}
            onChange={onChange}
          />
          <button type="button" className={styles.done} onClick={close}>
            Listo
          </button>
        </>
      )}
    </TaskProperty>
  );
}
