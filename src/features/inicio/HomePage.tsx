import { useInicio } from "./hooks/useInicio";
import RecentTasksView from "./components/RecentTasksView";
import AllProjectsView from "./components/AllProjectsView";
import CreateTaskModal from "./components/CreateTaskModal";
import PublishModal from "./components/PublishModal";

export default function HomePage() {
  const inicio = useInicio();
  const isAllProjects = inicio.pathname === "/mis-proyectos";

  return (
    <main id="main-content" className="min-h-full text-neutral-800 dark:text-neutral-100">
      {isAllProjects ? (
        <AllProjectsView projects={inicio.projects} />
      ) : (
        <RecentTasksView
          project={inicio.activeProject}
          projects={inicio.projects}
          tasks={inicio.tasks}
          stats={inicio.taskStats}
          search={inicio.taskSearch}
          onSearch={inicio.setTaskSearch}
          onSelectProject={inicio.setSelectedProjectId}
          onCreateTask={() => inicio.setCreateTaskOpen(true)}
        />
      )}

      {inicio.isCreateTaskOpen && inicio.activeProject && (
        <CreateTaskModal
          projectName={inicio.activeProject.name}
          submitting={inicio.isSavingTask}
          onClose={() => inicio.setCreateTaskOpen(false)}
          onSubmit={inicio.createTask}
        />
      )}

      {inicio.isPublishOpen && inicio.activeProject && (
        <PublishModal
          projectName={inicio.activeProject.name}
          submitting={inicio.isSavingPublication}
          onClose={() => inicio.setPublishOpen(false)}
          onSubmit={inicio.createPublication}
        />
      )}
    </main>
  );
}
