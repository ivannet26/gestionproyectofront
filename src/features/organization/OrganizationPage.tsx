import AreasSection from "./Area/AreasSection";
import TeamsSection from "./Teams/TeamsSection";
import SpecialtiesSection from "./Specialties/SpecialtiesSection";
import ProjectsSection from "./Projects/ProjectsSection";

function OrganizationPage() {
  return (
    <main className="min-h-full bg-white text-neutral-800" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg font-medium text-neutral-800">
            Organización
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600">
            Áreas, equipos, especialidades y proyectos de la organización.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <AreasSection />
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <TeamsSection />
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <SpecialtiesSection />
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <ProjectsSection />
        </div>
      </div>
    </main>
  );
}

export default OrganizationPage;
