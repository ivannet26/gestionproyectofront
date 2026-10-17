import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/projects/ProjectNavigation/groupProjectsByArea.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const module = new vm.SourceTextModule(compiled);
await module.link(() => { throw new Error("Unexpected runtime import"); });
await module.evaluate();
const { groupProjectsByArea } = module.namespace;
const project = (id, areaId, name, has_associated_workers = true, changes = {}) => ({
  id, areas: [{ id: areaId, name }], has_associated_workers, ...changes,
});

test("groups by area ID rather than duplicate names and preserves project order", () => {
  const groups = groupProjectsByArea([project(1, 7, "Sistemas"), project(2, 8, "Sistemas"), project(3, 7, "Sistemas")]);
  assert.deepEqual(Array.from(groups, (area) => [area.id, Array.from(area.projects, (item) => item.id)]), [[7, [1, 3]], [8, [2]]]);
});

test("only associated authorized input projects create groups regardless of publication or state", () => {
  const groups = groupProjectsByArea([
    project(1, 7, "Visible", true, { state_code: "FINALIZADO", available: true }),
    project(2, 7, "Visible", false, { state_code: "EN_CURSO", available: false }),
    project(3, 8, "Oculta", false),
    { id: 4, areas: [{ id: 9, name: "No confirmada" }] },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 7);
  assert.deepEqual(Array.from(groups[0].projects, (item) => item.id), [1]);
});

test("does not fabricate a missing area or reconcile multiple associations", () => {
  assert.equal(groupProjectsByArea([
    project(1, 7, "A", true, { areas: [] }),
    project(2, 7, "A", true, { areas: [{ id: 7, name: "A" }, { id: 8, name: "B" }] }),
  ]).length, 0);
  assert.equal(groupProjectsByArea([]).length, 0);
});

test("does not mutate the authorized input or derive extra projects from areas", () => {
  const input = [project(1, 7, "Área")];
  Object.freeze(input[0].areas[0]);
  Object.freeze(input[0].areas);
  Object.freeze(input[0]);
  Object.freeze(input);
  assert.equal(groupProjectsByArea(input)[0].projects[0], input[0]);
});
