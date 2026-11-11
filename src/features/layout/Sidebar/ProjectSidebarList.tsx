import { useProjects } from "../../home/hooks/useProjects";
import ProjectAreaNavigation from "./ProjectAreaNavigation";

interface ProjectSidebarListProps {
  currentPath: string;
}

function ProjectSidebarList({ currentPath }: ProjectSidebarListProps) {
  const { projects } = useProjects();

  return (
    <ProjectAreaNavigation
      projects={projects}
      currentPath={currentPath}
      canCreateTasks={false}
      onCreateTask={() => {}}
    />
  );
}

export default ProjectSidebarList;
