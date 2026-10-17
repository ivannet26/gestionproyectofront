import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

async function load(path, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = { react: React, "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, `Unexpected runtime import ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}
const assignees = await load("../src/features/projects/taskAssignees.ts");
const { taskHierarchy } = await load("../src/features/projects/TaskList/taskHierarchy.ts");
const { groupTasks, projectToday, taskDueGroup } = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });
const { default: Control } = await load("../src/features/projects/TaskList/TaskGroupingControl.tsx", {
  "../TaskForm/TaskProperty": { default: ({ value, children }) => React.createElement("div", null, React.createElement("button", null, value), children(() => {})) },
  "../TaskForm/TaskIcon": { default: ({ name }) => React.createElement("svg", { "data-icon": name, "aria-hidden": true }) },
  "../../../shared/icons/ChevronDownIcon": { default: () => React.createElement("svg", { "aria-hidden": true }) },
});
const states = [{ code: "EN_CURSO", name: "En marcha" }, { code: "PENDIENTE", name: "Por hacer" }, { code: "COMPLETADA", name: "Revisada" }];
const priorities = [{ code: 1, name: "Urgente" }, { code: 2, name: "Alta" }, { code: 3, name: "Normal" }, { code: 4, name: "Baja" }];
const defaults = { mode: "state", order: "asc", separatePeople: false, separateLabels: false };
const person = (id, name) => ({ id, name });
const label = (id, name, requirement_id = null) => ({ id, name, requirement_id, kind: "technical" });
const task = (id, changes = {}) => ({ id, name: `Tarea ${id}`, parent_id: null, state_code: "PENDIENTE", state_name: "Por hacer", priority: 3, due_date: "2026-10-16", responsible_id: null, responsible_name: null, labels: [], ...changes });
function groups(tasks, changes = {}, search = "") {
  return groupTasks(tasks, taskHierarchy(tasks, search), { ...defaults, ...changes }, states, priorities, "2026-10-16");
}
const members = (group) => Array.from(group.members);
const names = (items) => Array.from(items, (group) => group.name);

test("state follows configured codes and order, retains empty groups and reverses groups only", () => {
  const tasks = [task(4), task(1, { state_code: "EN_CURSO" }), task(3), task(2, { state_code: "COMPLETADA" })];
  const ascending = groups(tasks);
  assert.deepEqual(names(ascending), ["En marcha", "Por hacer", "Revisada"]);
  assert.deepEqual(members(ascending[1]), [4, 3]);
  const descending = groups(tasks, { order: "desc" });
  assert.deepEqual(names(descending), [...names(ascending)].reverse());
  assert.deepEqual(members(descending[1]), [4, 3]);
  assert.equal(groups([task(1)]).length, 3);
  assert.equal(groups([]).length, 3);
});

test("empty state groups come only from the supplied project configuration and retain names and codes", () => {
  const configured = [{ code: "EN_REVISION", name: "Validación del área" }, ...states];
  const empty = groupTasks([], taskHierarchy([], ""), defaults, configured, priorities, "2026-10-16");
  assert.deepEqual(names(empty), configured.map((state) => state.name));
  assert.deepEqual(Array.from(empty, (group) => group.stateCode), configured.map((state) => state.code));
  assert.ok(empty.every((group) => !group.members.size && !group.visible.size && !group.roots.length));
  assert.equal(groupTasks([], taskHierarchy([], ""), defaults, [], priorities, "2026-10-16").length, 0);
});

test("search with no results retains zero-count state groups without recovering excluded tasks", () => {
  const tasks = [task(1), task(2, { state_code: "EN_CURSO" })];
  const result = groups(tasks, {}, "inexistente");
  assert.deepEqual(names(result), states.map((state) => state.name));
  assert.ok(result.every((group) => !group.members.size && !group.visible.size && !group.roots.length));
  const filtered = groups(tasks.filter((item) => item.id === 2));
  assert.deepEqual(Array.from(filtered, (group) => group.members.size), [1, 0, 0]);
  assert.deepEqual(Array.from(filtered.flatMap((group) => members(group))), [2]);
});

test("moving or removing the last task keeps its source state visible and preserves zero-count reverse order", () => {
  const initial = groups([task(1)]);
  const moved = groups([task(1, { state_code: "EN_CURSO" })]);
  assert.deepEqual(Array.from(initial, (group) => group.members.size), [0, 1, 0]);
  assert.deepEqual(Array.from(moved, (group) => group.members.size), [1, 0, 0]);
  assert.deepEqual(Array.from(moved, (group) => group.key), Array.from(initial, (group) => group.key));
  assert.deepEqual(names(groups([], { order: "desc" })), [...states].reverse().map((state) => state.name));
  assert.ok(groups([]).every((group) => group.members.size === 0));
});

test("other grouping modes still omit empty groups and do not acquire project state groups", () => {
  for (const mode of ["assignees", "priority", "labels", "due_date"]) {
    assert.equal(groups([], { mode }).length, 0);
    assert.equal(groups([task(1)], { mode }, "inexistente").length, 0);
    const result = groups([task(1)], { mode });
    assert.equal(result.length, 1);
    assert.equal(result[0].members.size, 1);
    assert.equal(result[0].key.startsWith(`${mode}:`), true);
    assert.equal(result[0].stateCode, undefined);
  }
});

test("assignee combinations use IDs regardless of order and distinguish identical names", () => {
  const a = person(1, "Ana"), b = person(2, "Bruno"), other = person(3, "Ana");
  const result = groups([task(1, { assignees: [a, b] }), task(2, { assignees: [b, a] }), task(3, { assignees: [a] }), task(4, { assignees: [other] }), task(5)], { mode: "assignees" });
  assert.equal(result.length, 4);
  assert.deepEqual(members(result.find((group) => group.tokens.length === 2)), [1, 2]);
  assert.equal(result.filter((group) => group.name === "Ana").length, 2);
  assert.deepEqual(members(result.find((group) => group.name === "Sin persona asignada")), [5]);
});

test("one-person mode intentionally repeats the same task object without mutating source records", () => {
  const a = person(1, "Ana"), b = person(2, "Bruno");
  const shared = task(1, { assignees: [a, b, a] });
  const tasks = [shared, task(2, { responsible_id: 1, responsible_name: "Ana" })];
  const original = JSON.stringify(tasks);
  const result = groups(tasks, { mode: "assignees", separatePeople: true });
  assert.deepEqual(names(result), ["Ana", "Bruno"]);
  assert.equal(result[0].roots[0], shared);
  assert.equal(result[1].roots[0], shared);
  assert.deepEqual(members(result[0]), [1, 2]);
  assert.equal(new Set(result.flatMap((group) => members(group))).size, 2);
  assert.equal(JSON.stringify(tasks), original);
});

test("label identity is shared requirement ID or real label ID, never the visible name", () => {
  const result = groups([
    task(1, { labels: [label(11, "Python", 70), label(12, "SQL", 80)] }),
    task(2, { labels: [label(22, "SQL", 80), label(21, "Python", 70)] }),
    task(3, { labels: [label(31, "Python")] }), task(4),
  ], { mode: "labels" });
  assert.equal(result.length, 3);
  assert.deepEqual(members(result.find((group) => group.tokens.length === 2)), [1, 2]);
  assert.deepEqual(members(result.find((group) => group.name === "Sin etiquetas")), [4]);
  const separate = groups([task(1, { labels: [label(1, "Mismo"), label(2, "Mismo")] })], { mode: "labels", separateLabels: true });
  assert.equal(separate.length, 2);
  assert.notEqual(separate[0].key, separate[1].key);
});

test("one-label mode and name ordering do not alter the order of tasks", () => {
  const tasks = [task(7, { labels: [label(10, "Zulu", 1), label(11, "Álgebra", 2)] }), task(3, { labels: [label(20, "Zulu", 1)] })];
  const ascending = groups(tasks, { mode: "labels", separateLabels: true });
  assert.deepEqual(names(ascending), ["Álgebra", "Zulu"]);
  assert.deepEqual(members(ascending[1]), [7, 3]);
  assert.deepEqual(names(groups(tasks, { mode: "labels", separateLabels: true, order: "desc" })), ["Zulu", "Álgebra"]);
});

test("priorities follow criticality, retain unknown codes and include genuinely absent priorities", () => {
  const tasks = [task(1, { priority: null }), task(2, { priority: 4 }), task(3, { priority: 1 }), task(4, { priority: 3 }), task(5, { priority: 2 })];
  assert.deepEqual(names(groups(tasks, { mode: "priority" })), ["Urgente", "Alta", "Normal", "Baja", "Sin prioridad"]);
  assert.deepEqual(names(groups(tasks, { mode: "priority", order: "desc" })), ["Sin prioridad", "Baja", "Normal", "Alta", "Urgente"]);
  assert.equal(groups([task(1, { priority: 0 })], { mode: "priority" })[0].name, "Prioridad 0");
});

test("temporal groups are exclusive and completion uses the real code, not labels or percentage", () => {
  const tasks = [task(1, { due_date: "2026-10-15" }), task(2), task(3, { due_date: "2026-10-17" }), task(4, { due_date: null }), task(5, { due_date: "2020-01-01", state_code: "COMPLETADA", state_name: "Texto arbitrario" }), task(6, { due_date: "2020-01-01", state_code: "CANCELADA", progress: 100 })];
  const result = groups(tasks, { mode: "due_date" });
  assert.deepEqual(names(result), ["Con atraso", "En plazo", "Sin fecha límite", "Completadas"]);
  assert.deepEqual(members(result[0]), [1, 6]);
  assert.deepEqual(members(result[1]), [2, 3]);
  assert.deepEqual(members(result[3]), [5]);
  assert.equal(result.reduce((count, group) => count + group.members.size, 0), 6);
  assert.equal(taskDueGroup(task(8, { state_name: "Completada" }), "2026-10-16").key, "on-time");
});

test("project day uses America/Lima without UTC date shifts at midnight", () => {
  assert.equal(projectToday(new Date("2026-10-17T04:59:59Z")), "2026-10-16");
  assert.equal(projectToday(new Date("2026-10-17T05:00:00Z")), "2026-10-17");
  assert.equal(projectToday(new Date("2026-01-01T01:00:00Z")), "2025-12-31");
});

test("subtasks keep real ancestors as non-counted context instead of becoming orphans", () => {
  const tasks = [task(1), task(2, { parent_id: 1, state_code: "COMPLETADA" }), task(3, { parent_id: 2, priority: 1 })];
  const result = groups(tasks);
  const completed = result.find((group) => group.stateCode === "COMPLETADA");
  assert.deepEqual(members(completed), [2]);
  assert.deepEqual(Array.from(completed.visible), [2, 1]);
  assert.deepEqual(Array.from(completed.roots, (task) => task.id), [1]);
  assert.equal(completed.members.has(1), false);
  assert.equal(new Set(result.flatMap((group) => members(group))).size, 3);
  assert.equal(tasks[1].parent_id, 1);
});

test("authorized orphans are not supplied hidden parents; search and duplicate IDs stay correct", () => {
  const orphan = task(2, { parent_id: 999, name: "Coincidencia" });
  const tasks = [orphan, orphan, task(3, { name: "No mostrar" })];
  const hierarchy = taskHierarchy(tasks, "Coincidencia");
  assert.equal(hierarchy.roots.length, 1);
  const result = groups(tasks, {}, "Coincidencia");
  const pending = result.find((group) => group.stateCode === "PENDIENTE");
  assert.deepEqual(members(pending), [2]);
  assert.deepEqual(Array.from(pending.visible), [2]);
  assert.equal(pending.roots[0].parent_id, 999);
});

test("editing one shared record reclassifies all visual appearances", () => {
  const shared = task(1, { assignees: [person(1, "Ana"), person(2, "Bruno")] });
  const old = groups([shared], { mode: "assignees", separatePeople: true });
  assert.equal(old.length, 2);
  const changed = { ...shared, name: "Nombre actualizado", assignees: [person(2, "Bruno")] };
  const next = groups([changed], { mode: "assignees", separatePeople: true });
  assert.deepEqual(names(next), ["Bruno"]);
  assert.equal(next[0].roots[0].name, "Nombre actualizado");
});

test("grouping menu exposes exactly five modes, order, and only the relevant independent switch", () => {
  const render = (settings) => renderToStaticMarkup(React.createElement(Control, { preferences: { ...defaults, ...settings }, onChange() {} }));
  const state = render({});
  assert.equal((state.match(/role="menuitemradio"/g) ?? []).length, 5);
  assert.equal((state.match(/aria-checked="true"/g) ?? []).length, 1);
  assert.match(state, /role="menuitemradio" aria-checked="true"[^>]*>[\s\S]*?data-icon="state"/);
  assert.match(state, /data-icon="check"/);
  assert.doesNotMatch(state, /role="switch"|Eliminar|Tipo de tarea|Lenguaje/);
  assert.doesNotMatch(state, /Expandir todos|Contraer todos|No cambia el orden/);
  assert.match(state, /Orden de los grupos/);
  const people = render({ mode: "assignees", separatePeople: true, separateLabels: false });
  assert.match(people, /Una persona por grupo/);
  assert.match(people, /role="switch"[^>]*aria-checked="true"/);
  assert.doesNotMatch(people, /Una etiqueta por grupo/);
  const labels = render({ mode: "labels", separatePeople: true, separateLabels: false });
  assert.match(labels, /Una etiqueta por grupo/);
  assert.match(labels, /role="switch"[^>]*aria-checked="false"/);
  assert.doesNotMatch(labels, /Una persona por grupo/);
});
