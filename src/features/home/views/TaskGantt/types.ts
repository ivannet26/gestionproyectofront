import type { ReactNode } from "react";
import type {
  Task,
  Project,
  ProjectCatalogs,
  TaskActionKind,
  ProjectTaskState,
} from "../../types";

export interface TaskGanttProps {
  project: Project;
  catalogs: ProjectCatalogs;
  onCreated: (task: Task) => void;
  onMoved?: (tasks: Task[]) => void;
  tasks: Task[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenTask: (taskId: number, section?: "relations") => void;
  onAction?: (kind: TaskActionKind, taskId: number) => void;
  createAction?: ReactNode;
  protection?: { active: boolean; setActive: (active: boolean) => void };
  actionsDisabled?: boolean;
}

export interface GanttRow {
  id: number;
  parent: number;
  text: string;
  type: "task" | "gm-open-ended";
  open: boolean;
  start?: Date;
  end?: Date;
  duration?: number;
  gmHasChildren: boolean;
  gmParentId: number | null;
  gmStartDate: string;
  gmSchedule?: import("../../types").TaskSchedule;
  gmDueDate: string | null;
  gmStateName: string;
  gmState: ProjectTaskState;
  gmCreatedAt: string;
  gmResponsible: string;
  gmContext?: boolean;
  gmEditable?: boolean;
  gmCalendarPending?: boolean;
  gmPaint?: string;
}
