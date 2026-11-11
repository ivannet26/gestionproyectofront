import type { Task, ProjectTaskState } from "../../types";
import { themeColor } from "../../utils/themePresentation";

export function ganttTaskState(
  task: Task,
  states: ProjectTaskState[] = [],
): ProjectTaskState {
  const configured = states.find((state) => state.code === task.state_code);
  const tema = task.state_tema ?? configured?.tema;
  return {
    code: task.state_code,
    name: task.state_name,
    category: task.state_category ?? configured?.category,
    tema_id: task.state_tema_id ?? configured?.tema_id,
    tema,
    color:
      themeColor(tema?.color ?? task.state_color ?? configured?.color) ??
      "#737373",
  };
}
