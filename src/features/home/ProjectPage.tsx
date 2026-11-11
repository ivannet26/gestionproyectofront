import { useLocation, useParams } from "react-router";
import { useProject } from "./hooks/useProject";
import ProjectHeader from "./components/ProjectHeader";
import ListView from "./views/List/ListView";
import BoardView from "./views/Board/BoardView";
import OverviewView from "./views/Overview/OverviewView";
import GanttView from "./views/TaskGantt/GanttView";

export default function ProjectPage() {
  const { projectId } = useParams();
  const { search } = useLocation();
  const { project, setProject, toggleFavorite } = useProject(Number(projectId));

  if (!project) return null;

  const viewKey = new URLSearchParams(search).get("vista") ?? "lista";

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col text-neutral-800 dark:text-neutral-100">
      <ProjectHeader
        project={project}
        viewKey={viewKey}
        onToggleFavorite={toggleFavorite}
      />

      {viewKey === "tablero" && (
        <BoardView project={project} onProjectChange={setProject} />
      )}
      {viewKey === "overview" && <OverviewView projectId={project.id} />}
      {viewKey === "gantt" && (
        <GanttView project={project} onProjectChange={setProject} />
      )}
      {viewKey !== "tablero" &&
        viewKey !== "overview" &&
        viewKey !== "gantt" && (
          <ListView project={project} onProjectChange={setProject} />
        )}
    </main>
  );
}
