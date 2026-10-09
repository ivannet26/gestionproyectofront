export interface ProjectArea {
  id: number;
  name: string;
}

export interface ProjectCatalogs {
  creation_date?: string;
  areas: ProjectArea[];
  states: { code: string; name: string }[];
  priorities: { code: number; name: string }[];
}

export type LabelKind = "technical" | "nontechnical";

export interface Label {
  name: string;
  kind: LabelKind;
}

export interface ProjectRequirement extends Label {
  id: number;
}

export interface TaskLabel extends Label {
  id: number;
  requirement_id: number | null;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  state_code: string;
  available: boolean;
  areas: ProjectArea[];
  worker_edit: boolean;
  worker_state: boolean;
  worker_create: boolean;
  permissions: { manage: boolean; create_tasks: boolean };
}

export interface Project extends ProjectSummary {
  participants: { id: number; name: string }[];
  requirements: ProjectRequirement[];
}

export interface WorkerCandidate {
  id: number;
  name: string;
  project_count: number;
}

export type ProjectMode = "available" | "assigned";

export interface ProjectDraft {
  name: string;
  description: string;
  endDate: string;
  areaIds: number[];
  mode: ProjectMode;
  workerIds: number[];
  workerContribute: boolean;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  end_date: string;
  area_ids: number[];
  mode: ProjectMode;
  worker_ids: number[];
  worker_contribute: boolean;
}

export interface Task {
  id: number;
  parent_id: number | null;
  name: string;
  state_code: string;
  priority: number;
  created_at: string;
  due_date: string;
  responsible_id: number | null;
  responsible_name: string | null;
  labels: TaskLabel[];
  dependencies: number[];
  transitions: { target: string; reason_required: boolean }[];
  permissions: {
    edit: boolean;
    state: boolean;
    assign: boolean;
    create_child: boolean;
    dependencies: boolean;
  };
}

export interface EditTaskPayload {
  name: string;
  priority: number;
  due_date: string;
  requirement_ids: number[];
  labels: Label[];
  responsible_id?: number | null;
}

export interface CreateTaskPayload extends EditTaskPayload {
  state_code: string;
  parent_id: number | null;
  reason: string;
}

export type TaskFormPayload = CreateTaskPayload | EditTaskPayload;

export interface TaskStatePayload {
  state_code: string;
  reason: string;
}

export type TaskActionKind = "edit" | "state" | "child" | "dependencies";

export type TaskAction =
  | { kind: "create" }
  | { kind: TaskActionKind; taskId: number };
