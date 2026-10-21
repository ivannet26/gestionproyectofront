import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

async function load(path, dependencies = {}, globals) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = globals ? vm.createContext({ crypto: globalThis.crypto, ...globals }) : undefined;
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => {
    const exports = { react: React, "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, `Unexpected import ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const labels = await load("../src/features/projects/labelSelection.ts");
const avatar = await load("../src/shared/avatar.ts");
const labelList = await load("../src/features/projects/LabelList/LabelList.tsx");
const { default: LabelEditor } = await load("../src/features/projects/LabelEditor/LabelEditor.tsx", { "../LabelList/LabelList": labelList });
const { default: AssigneeSelector } = await load("../src/features/projects/ResponsiblePicker/AssigneeSelector.tsx", { "../../../shared/avatar": avatar });
const assignees = await load("../src/features/projects/taskAssignees.ts");
const grouping = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });
const dates = await load("../src/features/projects/TaskForm/taskDates.ts", { "../TaskList/taskGrouping": grouping });

test("label payload preserves catalog identity and retained historical rows, never name matching", () => {
  const value = labels.labelSelection([{ id: 4, name: "Antigua", kind: "technical" }, { name: "Renombrada", specialty_id: 7, kind: "specialty" }, { name: "Otra copia", specialty_id: 7, kind: "specialty" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(value)), { specialty_ids: [7], retained_label_ids: [4] });
});

test("specialty picker exposes multiple choices and readable removable history without classification or creation", () => {
  const html = renderToStaticMarkup(React.createElement(LabelEditor, { title: "Etiquetas", specialties: [{ id: 7, name: "Diseño" }], labels: [{ name: "Histórica", kind: "nontechnical", id: 4 }], onChange() {} }));
  assert.match(html, /Buscar especialidades/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /Histórica/);
  assert.doesNotMatch(html, /No técnica|Clasificación|Agregar especialidad/);
  const empty = renderToStaticMarkup(React.createElement(LabelEditor, { title: "Etiquetas", specialties: [], labels: [], onChange() {} }));
  assert.match(empty, /No hay especialidades registradas/);
  const missing = renderToStaticMarkup(React.createElement(LabelEditor, { title: "Etiquetas", labels: [], onChange() {} }));
  assert.match(missing, /role="alert"/);
});

test("shared assignee picker keeps selected people controlled and unique across search sources", () => {
  const html = renderToStaticMarkup(React.createElement(AssigneeSelector, {
    project: { participants: [{ id: 4, name: "Ángela QA" }], assignment_teams: [] }, value: [4], onChange() {},
  }));
  assert.match(html, /Buscar responsables mediante/);
  assert.match(html, /Trabajadores/);
  assert.match(html, /Equipos/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /1 responsables seleccionados/);
  assert.match(html, /Ángela QA/);
});

test("past comparison uses America Lima across UTC midnight without shifting date-only values", () => {
  const instant = new Date("2026-10-22T02:00:00Z");
  assert.equal(grouping.projectToday(instant), "2026-10-21");
  assert.equal(dates.isPastTaskDate("2026-10-20", instant), true);
  assert.equal(dates.isPastTaskDate("2026-10-21", instant), false);
  assert.equal(dates.isPastTaskDate(null, instant), false);
});

async function movementHarness() {
  const values = [], requests = [], accepted = [], effects = [];
  let index = 0, effectIndex = 0;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], next => { values[slot] = typeof next === "function" ? next(values[slot]) : next; }]; },
    useRef(initial) { const slot = index++; return values[slot] ??= { current: initial }; },
    useEffect(effect, deps) { const slot = effectIndex++; if (!effects[slot] || !deps.every((value, key) => value === effects[slot].deps[key])) { effects[slot]?.cleanup?.(); effects[slot] = { deps, cleanup: effect() }; } },
  };
  const { useTaskMove } = await load("../src/features/projects/TaskList/useTaskMove.ts", {
    react, "../../auth/api": { errorText: error => error.message },
    "../services": { moveTask(id, task, payload) { return new Promise((resolve, reject) => requests.push({ id, task, payload, resolve, reject })); }, getTasks: async () => [] },
  });
  const region = { current: null };
  return { requests, accepted, render() { index = 0; effectIndex = 0; return useTaskMove({ id: 42 }, result => accepted.push(result), region); }, unmount() { for (const effect of effects) effect.cleanup?.(); } };
}
const task = { id: 8, state_code: "OPEN", move_revision: "a".repeat(64), move_targets: ["ACTIVE", "BLOCKED"], permissions: { state: true }, transitions: [{ target: "ACTIVE", reason_required: false }, { target: "BLOCKED", reason_required: true }, { target: "INVALID", reason_required: false }] };

test("move applies immediately without a reason dialog while prohibited targets never write", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "INVALID", null);
  assert.equal(hook.requests.length, 0);
  hook.render().propose(task, "BLOCKED", null);
  assert.equal(hook.requests.length, 1);
  assert.equal(hook.requests[0].payload.reason, "");
  assert.equal(hook.render().confirmation, undefined);
  assert.equal(hook.accepted.length, 0);
  hook.unmount(); hook.requests[0].resolve([]); await new Promise(resolve => setImmediate(resolve));
});

test("new task dates start today or at a later project/parent boundary in Lima", () => {
  const instant = new Date("2026-10-22T02:00:00Z");
  assert.equal(dates.taskCreationStart("2026-10-07", null, instant), "2026-10-21");
  assert.equal(dates.taskCreationStart("2026-10-25", null, instant), "2026-10-25");
  assert.equal(dates.taskCreationStart("2026-10-07", "2026-10-26", instant), "2026-10-26");
});

test("movement guards duplicate requests, keeps original list on conflict, and discards detached results", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "ACTIVE", null); hook.render().propose(task, "ACTIVE", null);
  assert.equal(hook.requests.length, 1);
  assert.equal(hook.accepted.length, 0);
  hook.requests[0].reject(new Error("Conflicto 409")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.render().error, "Conflicto 409");
  assert.equal(hook.accepted.length, 0);
  hook.render().propose(task, "ACTIVE", 9);
  assert.equal(hook.requests[1].payload.before_id, 9);
  assert.equal(hook.requests[1].payload.expected_revision, task.move_revision);
  hook.unmount(); hook.requests[1].resolve([{ ...task, state_code: "ACTIVE" }]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.accepted.length, 0);
});
