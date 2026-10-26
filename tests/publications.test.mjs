import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL(
    "../src/features/publications/utils/publication.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const module = new vm.SourceTextModule(compiled);
await module.link(() => {
  throw new Error("Unexpected runtime import");
});
await module.evaluate();
const {
  closingHint,
  daysUntil,
  isoToday,
  publicationFeedback,
  publicationMatchesFilters,
  validatePublicationDraft,
} = module.namespace;

const publication = (id, changes = {}) => ({
  id,
  project: { id: 1, code: "P-001", name: "Mantenimiento" },
  title: "Técnico de mantenimiento",
  description: "Oferta de prueba",
  vacancies: 4,
  filled_vacancies: 1,
  available_vacancies: 3,
  weekly_hours: "40.00",
  opening_date: "2026-10-20",
  closing_date: "2026-10-28",
  state: "ABIERTA",
  requirements: [],
  allowed_states: ["CERRADA", "CANCELADA"],
  permissions: { edit: true, change_state: true },
  ...changes,
});

const draft = (changes = {}) => ({
  projectId: "1",
  title: "Técnico de mantenimiento",
  description: "Mantenimiento preventivo de equipos.",
  vacancies: "2",
  weeklyHours: "40",
  openingDate: "2026-10-24",
  closingDate: "2026-11-24",
  requirements: [{ specialty_id: 1, minimum_level: 2 }],
  ...changes,
});

test("valida fechas, rangos y requisitos como el backend", () => {
  assert.deepEqual(
    validatePublicationDraft(draft(), {
      requireProject: true,
      today: "2026-10-24",
    }),
    {},
  );
  assert.ok(
    validatePublicationDraft(draft({ closingDate: "2026-10-23" }), {
      requireProject: true,
      today: "2026-10-24",
    }).closing_date,
  );
  assert.ok(
    validatePublicationDraft(
      draft({ closingDate: "2026-10-23" }),
      { requireProject: true, state: "ABIERTA", today: "2026-10-24" },
    ).closing_date,
  );
  assert.ok(
    validatePublicationDraft(
      draft({ openingDate: "2026-02-30" }),
      { requireProject: true },
    ).opening_date,
  );
  assert.ok(
    validatePublicationDraft(
      draft({
        requirements: [
          { specialty_id: 1, minimum_level: 1 },
          { specialty_id: 1, minimum_level: 2 },
        ],
      }),
      { requireProject: true },
    ).requirements,
  );
  assert.ok(
    validatePublicationDraft(
      draft({ vacancies: "0", weeklyHours: "169", title: "" }),
      { requireProject: true },
    ).vacancies,
  );
  assert.ok(
    validatePublicationDraft(draft({ projectId: "" }), {
      requireProject: true,
    }).project_id,
  );
});

test("filtra por proyecto, estado y búsqueda sin distinguir mayúsculas", () => {
  const item = publication(1);
  assert.equal(publicationMatchesFilters(item, {}), true);
  assert.equal(
    publicationMatchesFilters(item, { search: "MANTENIMIENTO" }),
    true,
  );
  assert.equal(publicationMatchesFilters(item, { search: "obras" }), false);
  assert.equal(publicationMatchesFilters(item, { state: "ABIERTA" }), true);
  assert.equal(publicationMatchesFilters(item, { state: "CERRADA" }), false);
  assert.equal(publicationMatchesFilters(item, { project_id: 1 }), true);
  assert.equal(publicationMatchesFilters(item, { project_id: 2 }), false);
});

test("usa la fecha de Lima, no la del navegador, para la vigencia", () => {
  assert.equal(isoToday(new Date("2026-10-25T02:00:00Z")), "2026-10-24");
  assert.equal(isoToday(new Date("2026-10-25T05:00:00Z")), "2026-10-25");
});

test("calcula días de cierre", () => {
  assert.equal(daysUntil("2026-10-25", "2026-10-24"), 1);
  assert.equal(daysUntil("2026-10-24", "2026-10-24"), 0);
  assert.equal(closingHint("2026-10-24", "2026-10-24"), "Cierra hoy");
  assert.equal(closingHint("2026-10-25", "2026-10-24"), "Cierra mañana");
});

test("resume el estado en feedback útil y prioriza la urgencia", () => {
  const feedback = (changes = {}) =>
    publicationFeedback(publication(1, changes), "2026-10-24").label;
  assert.equal(feedback(), "Vacantes disponibles");
  assert.equal(feedback({ opening_date: "2026-10-23" }), "Recién publicado");
  assert.equal(feedback({ closing_date: "2026-10-25" }), "Cierra pronto");
  assert.equal(feedback({ available_vacancies: 1 }), "Últimas vacantes");
  assert.equal(feedback({ available_vacancies: 0 }), "Cupos completos");
  assert.equal(feedback({ state: "BORRADOR" }), "Sin publicar");
  assert.equal(feedback({ state: "CERRADA" }), "Proceso cerrado");
  assert.equal(feedback({ state: "CANCELADA" }), "Proceso cancelado");
});
