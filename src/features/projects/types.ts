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
  has_associated_workers: boolean;
  areas: ProjectArea[];
  worker_edit: boolean;
  worker_state: boolean;
  worker_create: boolean;
  permissions: { manage: boolean; create_tasks: boolean };
}

export interface ProjectNavigationProps {
  projects: ProjectSummary[];
  currentPath: string;
  loading: boolean;
  error: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
  onRetry?: () => void;
}

export interface ProjectAreaGroup extends ProjectArea {
  projects: ProjectSummary[];
}

export interface ProjectsMenuProps
  extends Omit<ProjectNavigationProps, "loading" | "error" | "onRetry"> {
  isCollapsed: boolean;
  projectsLoading: boolean;
  projectError: string;
  onRetryProjects: () => void;
  canCreateProject: boolean;
  projectCreationDisabled: boolean;
  onCreateProject: () => void;
}

export interface Project extends ProjectSummary {
  is_favorite: boolean;
  participants: { id: number; name: string }[];
  requirements: ProjectRequirement[];
  task_states: ProjectTaskConfiguration;
}

export interface ProjectHeaderProps {
  project: Project;
  view: string;
  busy: boolean;
  taskCount: number;
  onCreateTask: () => void;
}

export interface ProjectFavoriteState {
  is_favorite: boolean;
}

export type StateCategory = "not_started" | "active" | "done" | "closed";

export interface ProjectTaskState {
  code: string;
  name: string;
  category?: StateCategory;
  color?: string;
}

export interface TaskStatusTemplate {
  id: number | string;
  name: string;
  preset: boolean;
  revision: number;
  states: { name: string; category: StateCategory; color: string }[];
}

export interface StateReassignment {
  source: string;
  target: string;
  reason: string;
}

export interface ProjectTaskConfiguration {
  template: "standard" | "custom";
  states: ProjectTaskState[];
  available_states: ProjectTaskState[];
  revision: string;
  can_configure: boolean;
  usage?: Record<string, number>;
}

export interface ProjectTaskConfigurationPayload {
  template: "standard" | "custom";
  revision: string;
  states: ProjectTaskState[];
  reassignments?: StateReassignment[];
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
  end_date: string | null;
  area_ids: number[];
  mode: ProjectMode;
  worker_ids: number[];
  worker_contribute: boolean;
}

export interface Task {
  id: number;
  parent_id: number | null;
  name: string;
  description: string;
  state_code: string;
  state_name: string;
  state_category?: StateCategory;
  state_color?: string;
  priority: number;
  created_at: string;
  start_date: string;
  due_date: string;
  responsible_id: number | null;
  responsible_name: string | null;
  assignees?: TaskAssignee[];
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
  start_date?: string;
  name: string;
  description?: string;
  priority: number;
  due_date: string;
  requirement_ids: number[];
  labels: Label[];
  responsible_id?: number | null;
  responsible_ids?: number[];
}

export interface TaskAssignee {
  id: number;
  name: string;
}

export type TaskGroupingMode = "state" | "assignees" | "priority" | "labels" | "due_date";
export type TaskGroupOrder = "asc" | "desc";

export interface TaskGroupingPreferences {
  mode: TaskGroupingMode;
  order: TaskGroupOrder;
  separatePeople: boolean;
  separateLabels: boolean;
}

export interface TaskGroupToken {
  id: string;
  name: string;
  kind?: LabelKind;
}

export interface TaskListGroup {
  key: string;
  name: string;
  stateCode?: string;
  stateCategory?: StateCategory;
  stateColor?: string;
  priority?: number;
  tokens: TaskGroupToken[];
  rank: number;
  members: Set<number>;
  visible: Set<number>;
  roots: Task[];
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

export type TaskActionKind = "edit" | "state" | "child" | "dependencies" | "detail";

export type TaskAction =
  | { kind: "create"; stateCode?: string }
  | { kind: TaskActionKind; taskId: number };

export interface TaskCreationRequest {
  projectId: number;
  sequence: number;
}
