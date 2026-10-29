import { useOrganizationProjects } from "./useOrganizationProjects";
import ProjectAreaNavigation from "../../projects/ProjectNavigation/ProjectAreaNavigation";

export default function ProjectsSection() {
  const directory = useOrganizationProjects();
  return <section aria-label="Proyectos" className="flex h-full min-w-0 flex-col">
    <div className="mb-3 flex items-center justify-between"><h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">Proyectos</h3></div>
    <ProjectAreaNavigation directory={directory} organization />
  </section>
}
