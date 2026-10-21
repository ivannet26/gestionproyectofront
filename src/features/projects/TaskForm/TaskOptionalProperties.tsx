import { useId } from "react";
import type { Label, Project, ProjectCatalogs } from "../types";
import type { FieldErrors } from "../formErrors";
import ResponsiblePicker from "../ResponsiblePicker/ResponsiblePicker";
import LabelEditor from "../LabelEditor/LabelEditor";
import { Calendar } from "../CreateProjectModal/ProjectEndDateSelector";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import TaskProperty from "./TaskProperty";
import TaskIcon from "./TaskIcon";
import PriorityOptions from "./PriorityOptions";
import TaskDateValue from "./TaskDateValue";
import { isPastTaskDate } from "./taskDates";

export default function TaskOptionalProperties({ project, catalogs, responsible, dueDate, priority, labels,
  onResponsible, onDate, onPriority, onLabels, errors, compact = false, min, max, readOnlyResponsible = "Tú", canAssign = project.permissions.manage }: {
  project: Project; catalogs: ProjectCatalogs; responsible: number[]; dueDate: string; priority: number | null; labels: Label[];
  onResponsible: (value: number[]) => void; onDate: (value: string) => void;
  onPriority: (value: number | null) => void; onLabels: (value: Label[]) => void;
  errors: FieldErrors; compact?: boolean; min?: string; max?: string; canAssign?: boolean; readOnlyResponsible?: string;
}) {
  const instance = useId();
  const id = (field: string) => compact ? `${instance}-${field}` : `task-${field}`;
  return <>
    {canAssign ? <ResponsiblePicker compact={compact} participants={project.participants} teams={project.assignment_teams} value={responsible}
      error={errors["task-responsible"]} onChange={onResponsible} />
      : <TaskProperty id={id("responsible")} label="Responsable · Asignación administrada" value={compact ? "Tus tareas se asignan a ti según los permisos actuales" : readOnlyResponsible}
        icon="person" compact={compact} disabled content={compact ? <TaskIcon name="person" /> : undefined}>{() => null}</TaskProperty>}
    <TaskProperty id={id("due")} label={`Fecha límite${isPastTaskDate(dueDate) ? " · Fecha anterior a hoy" : ""}`} value={dueDate ? formatTaskDate(dueDate) : "Sin fecha límite"}
      icon="date" compact={compact} selected={Boolean(dueDate)} content={compact ? <span className={isPastTaskDate(dueDate) ? "text-red-700" : ""}><TaskIcon name="date" /></span> : <><TaskIcon name="date" /><TaskDateValue value={dueDate} /></>} error={errors["task-due"]}>
      {(close) => <Calendar value={dueDate} min={min ?? project.start_date ?? undefined} max={max ?? project.end_date ?? undefined}
        label="Fecha límite" onChange={onDate} close={close} />}
    </TaskProperty>
    <TaskProperty id={id("priority")} label="Prioridad" value={catalogs.priorities.find((item) => item.code === priority)?.name ?? "Sin prioridad"}
      icon="priority" compact={compact} selected={priority !== null} content={compact ? <TaskIcon name="priority" /> : undefined} error={errors["task-priority"]}>
      {(close) => <PriorityOptions priorities={catalogs.priorities} value={priority} onChange={(value) => { onPriority(value); close(); }} />}
    </TaskProperty>
    <TaskProperty id={id("labels")} label="Etiquetas" value={labels.length ? `${labels.length} seleccionadas` : "Sin etiquetas"}
      icon="labels" compact={compact} selected={labels.length > 0} content={compact ? <TaskIcon name="labels" /> : undefined} error={errors["task-labels"]}>
      {() => <LabelEditor title="Etiquetas de la tarea" compact labels={labels} onChange={onLabels} specialties={catalogs.specialties} />}
    </TaskProperty>
  </>;
}
