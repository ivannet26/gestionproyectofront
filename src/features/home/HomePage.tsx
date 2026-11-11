import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useProjects } from "./hooks/useProjects";

export default function HomePage() {
  const { projects } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    if (projects.length > 0) {
      navigate(`/proyectos/${projects[0].id}`, { replace: true });
    }
  }, [projects, navigate]);

  return (
    <main
      id="main-content"
      className="flex min-h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
    >
      {projects.length === 0
        ? "No hay proyectos disponibles."
        : "Cargando proyecto..."}
    </main>
  );
}
