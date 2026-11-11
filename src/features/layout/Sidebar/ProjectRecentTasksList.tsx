import { Link } from "react-router";
import { useProjectTasks } from "../../home/hooks/useProjectTasks";
import StateIcon from "../../home/shared/task-status/StateIcon";

interface ProjectRecentTasksListProps {
  projectId: number;
}

export default function ProjectRecentTasksList({
  projectId,
}: ProjectRecentTasksListProps) {
  const { tasks } = useProjectTasks(projectId);
  const recentTasks = tasks.slice(0, 6);

  if (recentTasks.length === 0) {
    return (
      <p className="m-0 px-3 py-1 text-xs text-neutral-400 dark:text-neutral-500">
        Sin tareas recientes
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {recentTasks.map((task) => (
        <li key={task.id}>
          <Link
            to={`/proyectos/${projectId}?tarea=${task.id}`}
            title={task.name}
            className="badge"
          >
            <StateIcon
              code={task.state_code}
              name={task.state_name}
              category={task.state_category}
              color={task.state_color}
              tema={task.state_tema}
            />
            <span className="min-w-0 flex-1 truncate">{task.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
