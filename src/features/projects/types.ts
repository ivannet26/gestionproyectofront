export interface ProjectArea {
  id: number;
  name: string;
}

export interface ProjectCatalogs {
  specialties?: Specialty[];
  task_templates?: TaskStatusTemplate[];
  creation_date?: string;
  areas: ProjectArea[];
  states: ProjectTaskState[];
  priorities: { code: number; name: string }[];
}

export interface Specialty { id: number; name: string }
export interface TeamOption {
  id: number; name: string; eligible_count: number;
  members: { id: number; name: string; eligible: boolean; reason: string }[];
}
export type LabelKind = "technical" | "nontechnical" | "specialty";

export interface Label {
  id?: number;
  specialty_id?: number | null;
  requirement_id?: number | null;
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

export interface ProjectsMenuProps {
  isCollapsed: boolean;
  currentPath: string;
  canCreateProject: boolean;
  projectCreationDisabled: boolean;
  onCreateProject: () => void;
  canCreateTasks: boolean;
  onCreateTask: (id: number, project: ProjectSummary) => void;
}

export interface Project extends ProjectSummary {
  team_ids?: number[];
  assignment_teams?: TeamOption[];
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

export interface ProjectTaskConfiguration {
  tasks?: Task[];
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
}

export interface WorkerCandidate {
  id: number;
  name: string;
  project_count: number;
}

export type ProjectMode = "available" | "assigned";

export interface ProjectDraft {
  participantSource?: "workers" | "teams";
  teamIds?: number[];
  initialTaskStates?: ProjectTaskState[];
  name: string;
  description: string;
  endDate: string;
  areaIds: number[];
  mode: ProjectMode;
  workerIds: number[];
  workerContribute: boolean;
}

export interface CreateProjectPayload {
  participant_source?: "workers" | "teams";
  team_ids?: number[];
  initial_task_states?: Pick<ProjectTaskState, "name" | "category" | "color">[];
  name: string;
  description: string;
  end_date: string | null;
  area_ids: number[];
  mode: ProjectMode;
  worker_ids: number[];
  worker_contribute: boolean;
}

export interface Task {
  updated_at?: string;
  move_revision?: string;
  move_targets?: string[];
  manual_position?: string | null;
  id: number;
  parent_id: number | null;
  name: string;
  description: string;
  state_code: string;
  state_name: string;
  state_category?: StateCategory;
  state_color?: string;
  priority: number | null;
  created_at: string;
  start_date: string;
  due_date: string | null;
  calendar_revision: string;
  calendar_receipt?: { intent_id: string; applied_revision: string; replayed: boolean };
  estimated_minutes?: number | null;
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
    relations?: boolean;
  };
}

export interface EditTaskPayload {
  estimated_minutes?: number | null;
  start_date?: string;
  name: string;
  description?: string;
  priority?: number | null;
  due_date?: string | null;
  requirement_ids?: number[];
  labels?: Label[];
  specialty_ids?: number[];
  retained_label_ids?: number[];
  responsible_id?: number | null;
  responsible_ids?: number[];
}

export type TaskCalendarPatch = Partial<EditTaskPayload> & {
  expected_calendar_revision: string;
  calendar_intent_id: string;
} & ({ start_date: string; due_date?: string | null } | { start_date?: string; due_date: string | null });
export type TaskNonCalendarPatch = Partial<Omit<EditTaskPayload, "start_date" | "due_date">> & {
  start_date?: never; due_date?: never; expected_calendar_revision?: never; calendar_intent_id?: never;
};
export type TaskPatchPayload = TaskCalendarPatch | TaskNonCalendarPatch;

export interface TaskIdentity { projectId: number; taskId: number }
export interface TaskDetailData { task: Task; parent: Task | null }
export interface TaskPage<T> { items: T[]; next_cursor: number | null }
export interface SubtaskPage extends TaskPage<Task> { total: number; completed: number }
export type RelationKind = "blocks" | "blocked_by" | "custom";
export interface TaskRelation {
  id: string; kind: RelationKind; name: string; target_id: number; target_name: string;
  relation_id?: number; predecessor_id?: number; successor_id?: number;
}
export interface TaskActivityEvent {
  id: number; operation_id: string; actor_id: number; actor_name: string; action: string; field: string;
  old_value: unknown; new_value: unknown; related_task_id: number | null; created_at: string;
}
export interface TaskActivityGroup { id: string; events: TaskActivityEvent[] }

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

export interface CreateTaskPayload extends Partial<Omit<EditTaskPayload, "name">> {
  name: string;
  state_code: string;
  parent_id: number | null;
  reason: string;
}

export type TaskFormPayload = CreateTaskPayload | TaskPatchPayload;

export interface TaskStatePayload {
  state_code: string;
  reason?: string;
}

export type TaskActionKind = "edit" | "state" | "child" | "dependencies" | "detail";

export type TaskAction =
  | { kind: "create"; stateCode?: string }
  | { kind: TaskActionKind; taskId: number };

export interface TaskCreationRequest {
  projectId: number;
  sequence: number;
}


export interface ProjectListFilters {
  project_id?: number;
  search?: string;
  area_id?: number;
  state_code?: string;
  available?: boolean;
  associated?: boolean;
}
