import AreasSection from "./AreasSection";
import TeamsSection from "./TeamsSection";
import SpecialtiesSection from "./SpecialtiesSection";

function OrganizationPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div className="max-w-[680px]">
          <h2 className="m-0 text-xl font-semibold text-neutral-900">Organización</h2>
          <p className="m-0 mt-1 text-sm text-neutral-600">Áreas, equipos y especialidades de la organización.</p>
        </div>
      </header>
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="flex-1 min-w-[280px] overflow-y-auto bg-white border border-neutral-200 shadow-none px-0 py-4 max-h-[640px]">
          <AreasSection />
        </div>
        <div className="flex-1 min-w-[280px] overflow-y-auto bg-white border border-neutral-200 shadow-none px-0 py-4 max-h-[580px]">
          <TeamsSection />
        </div>
        <div className="flex-1 min-w-[280px] overflow-y-auto bg-white border border-neutral-200 shadow-none px-0 py-4 max-h-[520px]">
          <SpecialtiesSection />
        </div>
      </div>
    </main>
  );
}

export default OrganizationPage;
