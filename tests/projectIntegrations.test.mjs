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
const avatar = await load("../src/shared/avatarInitials.ts");
const labelList = await load("../src/features/projects/LabelList/LabelList.tsx");
const { default: LabelEditor } = await load("../src/features/projects/LabelEditor/LabelEditor.tsx", { "../LabelList/LabelList": labelList });
const { default: AssigneeSelector } = await load("../src/features/projects/ResponsiblePicker/AssigneeSelector.tsx", { "../../../shared/avatarInitials": avatar, "./useAssignmentTeams": { useAssignmentTeams: () => ({ teams: [], error: "", loading: false, retry() {} }) } });
const assignees = await load("../src/features/projects/taskAssignees.ts");
const grouping = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });
const dates = await load("../src/features/projects/TaskForm/taskDates.ts", { "../TaskList/taskGrouping": grouping });
const { taskDropPosition } = await load("../src/features/projects/TaskList/taskDropPosition.ts");
const { reconcileTasks } = await load("../src/features/projects/taskCollection.ts");

test("drop resolution uses sibling anchors only, includes descendant blocks and handles first/last/empty positions", () => {
  const tasks = [{ id: 1, parent_id: null, state_code: "OPEN" }, { id: 2, parent_id: 1, state_code: "ACTIVE" }, { id: 3, parent_id: 1, state_code: "ACTIVE" }, { id: 4, parent_id: null, state_code: "ACTIVE" }, { id: 5, parent_id: 2, state_code: "ACTIVE" }];
  const moving = { id: 6, parent_id: 1, state_code: "OPEN" };
  const rows = [{ reference: 1, top: 0, bottom: 20 }, { id: 2, top: 20, bottom: 60 }, { id: 5, top: 60, bottom: 90 }, { id: 3, top: 90, bottom: 130 }, { id: 4, top: 130, bottom: 170 }];
  assert.equal(taskDropPosition(moving, "ACTIVE", tasks, rows, 10, 170).before, 2);
  assert.equal(taskDropPosition(moving, "ACTIVE", tasks, rows, 75, 170).before, 3);
  assert.equal(taskDropPosition(moving, "ACTIVE", tasks, rows, 160, 170).y, 130);
  assert.equal(taskDropPosition(moving, "ACTIVE", tasks, rows, 160, 170).before, null);
  assert.equal(taskDropPosition(moving, "OTHER", tasks, [{ id: 1, top: 0, bottom: 40 }], 5, 40).y, 40);
  assert.equal(taskDropPosition(moving, "OTHER", tasks, [], 5, 40).before, null);
});

test("confirmed collection replaces each identity once and refuses stale state metadata without mutating attributes", () => {
  const base = { id: 1, name: "Original", parent_id: 9, start_date: "2026-10-07", state_code: "OPEN", updated_at: "2026-10-22T13:00:00.000001Z" };
  const newer = { ...base, state_code: "ACTIVE", state_name: "En marcha", state_category: "active", state_color: "#1678bd", updated_at: "2026-10-22T13:00:00.000003Z" };
  let current = reconcileTasks([base], [newer, newer]);
  assert.equal(current.length, 1);
  current = reconcileTasks(current, [{ ...base, updated_at: "2026-10-22T13:00:00.000002Z" }], true);
  assert.equal(current[0].state_code, "ACTIVE");
  assert.equal(current[0].state_name, "En marcha");
  assert.equal(current[0].start_date, base.start_date);
  assert.equal(current[0].parent_id, 9);
  assert.equal(base.state_code, "OPEN");
});

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

test("creation-day comparison uses America Lima across UTC midnight without shifting date-only values", () => {
  const instant = new Date("2026-10-22T02:00:00Z");
  assert.equal(grouping.projectToday(instant), "2026-10-21");
  assert.equal(dates.isBeforeTaskCreation("2026-10-20", instant.toISOString()), true);
  assert.equal(dates.isBeforeTaskCreation("2026-10-21", instant.toISOString()), false);
  assert.equal(dates.isBeforeTaskCreation(null, instant.toISOString()), false);
});

async function movementHarness() {
  const values = [], requests = [], accepted = [], effects = [], frames = [];
  let reads = 0, focus = 0;
  const sourceTasks = [task, { ...task, id: 9, state_code: "ACTIVE" }];
  let serverTasks = sourceTasks;
  const document = Object.assign(new EventTarget(), { body: {}, querySelector: () => ({ focus() { focus++; } }) });
  document.activeElement = document.body;
  let index = 0, effectIndex = 0;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], next => { values[slot] = typeof next === "function" ? next(values[slot]) : next; }]; },
    useRef(initial) { const slot = index++; return values[slot] ??= { current: initial }; },
    useEffect(effect, deps) { const slot = effectIndex++; if (!effects[slot] || !deps.every((value, key) => value === effects[slot].deps[key])) { effects[slot]?.cleanup?.(); effects[slot] = { deps, cleanup: effect() }; } },
  };
  const { useTaskMove } = await load("../src/features/projects/TaskList/useTaskMove.ts", {
    react, "../../auth/api": { errorText: error => error.message },
    "../services": { moveTask(id, task, payload) { return new Promise((resolve, reject) => requests.push({ id, task, payload, resolve, reject })); }, getTasks: async () => { reads++; return serverTasks; } },
  }, { document, window: new EventTarget(), requestAnimationFrame: callback => frames.push(callback), cancelAnimationFrame() {} });
  const region = { current: null };
  return { requests, accepted, render() { index = 0; effectIndex = 0; return useTaskMove({ id: 42 }, result => accepted.push(result), region, sourceTasks); }, reads: () => reads, focus: () => focus, flushFrames() { for (const frame of frames.splice(0)) frame(); }, setServerTasks(value) { serverTasks = value; }, unmount() { for (const effect of effects) effect.cleanup?.(); } };
}
const task = { id: 8, parent_id: null, state_code: "OPEN", move_revision: "a".repeat(64), move_targets: ["ACTIVE", "BLOCKED"], permissions: { state: true }, transitions: [{ target: "ACTIVE", reason_required: false }, { target: "BLOCKED", reason_required: true }, { target: "INVALID", reason_required: false }] };

test("move applies immediately without a reason dialog while prohibited targets never write", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "INVALID", null);
  assert.equal(hook.requests.length, 0);
  hook.render().propose(task, "BLOCKED", null);
  assert.equal(hook.requests.length, 1);
  assert.equal(hook.requests[0].payload.reason, undefined);
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
  assert.match(hook.render().error, /Conflicto 409/);
  assert.match(hook.render().error, /Se detuvo un/);
  assert.equal(hook.reads(), 0);
  assert.equal(hook.accepted.length, 0);
  hook.setServerTasks([{ ...task, move_revision: "fresh-after-conflict" }, { ...task, id: 9, state_code: "ACTIVE" }]);
  hook.render().propose(task, "ACTIVE", 9);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.reads(), 1);
  assert.equal(hook.requests[1].payload.before_id, 9);
  assert.equal(hook.requests[1].payload.expected_revision, "fresh-after-conflict");
  hook.unmount(); hook.requests[1].resolve([{ ...task, state_code: "ACTIVE" }]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.accepted.length, 1);
});


test("consecutive movements are serialized with the confirmed revision and never cancel a newer gesture", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "ACTIVE", null);
  hook.render().prepare(); hook.render().start(task, 10, 10);
  hook.render().propose(task, "BLOCKED", null);
  assert.equal(hook.requests.length, 1); assert.equal(hook.render().queued, 1);
  const confirmed = [{ ...task, state_code: "ACTIVE", move_revision: "confirmed-b" }];
  hook.requests[0].resolve(confirmed); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.requests.length, 2);
  assert.equal(hook.requests[1].payload.expected_revision, "confirmed-b");
  assert.equal(hook.render().dragging.id, task.id);
  hook.flushFrames(); assert.equal(hook.focus(), 0);
  hook.requests[1].resolve([{ ...task, state_code: "BLOCKED", move_revision: "confirmed-c" }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.render().busy, false); assert.equal(hook.accepted.length, 2);
  hook.unmount();
});

test("a failed write stops waiting movements explicitly and a new drop reads the server before saving", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "ACTIVE", null); hook.render().propose(task, "BLOCKED", null);
  hook.render().start(task, 20, 20);
  hook.requests[0].reject(new Error("Red interrumpida")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.requests.length, 1); assert.equal(hook.render().queued, 0);
  assert.equal(hook.render().busy, false); assert.equal(hook.render().dragging.id, task.id);
  assert.match(hook.render().error, /Se detuvo un/); assert.equal(hook.reads(), 0);
  hook.render().end(); hook.render().start(task, 25, 25);
  assert.match(hook.render().error, /Red interrumpida/);
  hook.setServerTasks([{ ...task, move_revision: "server-after-ambiguous-write" }]);
  hook.render().propose(task, "BLOCKED", null); await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.requests[1].payload.expected_revision, "server-after-ambiguous-write");
  hook.unmount(); hook.requests[1].resolve([]); await new Promise(resolve => setImmediate(resolve));
});

test("a queued anchor which changed state is rejected instead of moving to an arbitrary position", async () => {
  const hook = await movementHarness();
  hook.render().propose(task, "ACTIVE", null); hook.render().propose(task, "ACTIVE", 9);
  hook.requests[0].resolve([{ ...task, state_code: "ACTIVE", move_revision: "new" }, { ...task, id: 9, state_code: "BLOCKED" }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(hook.requests.length, 1); assert.match(hook.render().error, /posición de destino cambió/);
  hook.unmount();
});
