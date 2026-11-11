import { useHome } from "./hooks/useHome";
import RecentTasksView from "./components/RecentTasksView";
import AllProjectsView from "./components/AllProjectsView";
import CreateTaskModal from "./components/CreateTaskModal";
import PublishModal from "./components/PublishModal";

export default function HomePage() {
  const home = useHome();
  const isAllProjects = home.pathname === "/mis-proyectos";

  return (
    <main id="main-content" className="min-h-full text-neutral-800 dark:text-neutral-100">
      {isAllProjects ? (
        <AllProjectsView projects={home.projects} />
      ) : (
        <RecentTasksView
          project={home.activeProject}
          projects={home.projects}
          tasks={home.tasks}
          stats={home.taskStats}
          search={home.taskSearch}
          onSearch={home.setTaskSearch}
          onSelectProject={home.setSelectedProjectId}
          onCreateTask={() => home.setCreateTaskOpen(true)}
        />
      )}

      {home.isCreateTaskOpen && home.activeProject && (
        <CreateTaskModal
          projectName={home.activeProject.name}
          submitting={home.isSavingTask}
          onClose={() => home.setCreateTaskOpen(false)}
          onSubmit={home.createTask}
        />
      )}

      {home.isPublishOpen && home.activeProject && (
        <PublishModal
          projectName={home.activeProject.name}
          submitting={home.isSavingPublication}
          onClose={() => home.setPublishOpen(false)}
          onSubmit={home.createPublication}
        />
      )}
    </main>
  );
}
