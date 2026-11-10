import type { ComponentType } from "react";
import { useLocation } from "react-router";
import AreasSection from "./Area/AreasSection";
import TeamsSection from "./Teams/TeamsSection";
import SpecialtiesSection from "./Specialties/SpecialtiesSection";
import ProjectsSection from "./Projects/ProjectsSection";

const sections: Record<string, ComponentType> = {
  "/organizaciones": TeamsSection,
  "/organizaciones/especialidades": SpecialtiesSection,
  "/organizaciones/proyectos": ProjectsSection,
  "/organizaciones/areas": AreasSection,
};

export default function OrganizacionesPage() {
  const { pathname } = useLocation();
  const Section = sections[pathname] ?? TeamsSection;

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg text-neutral-800 dark:text-neutral-100">
            Organización
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Áreas, equipos, especialidades y proyectos de la organización.
          </p>
        </div>
      </header>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
        <Section />
      </div>
    </main>
  );
}

