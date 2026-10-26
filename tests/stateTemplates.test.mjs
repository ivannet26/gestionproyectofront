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

const groups = await load("../src/features/projects/stateGroups.ts");
const drafts = await load("../src/features/projects/TaskStatusConfiguration/stateDraft.ts", { "../stateGroups": groups });
const initial = [
  { code: "PENDIENTE", name: "PENDIENTE", category: "not_started", color: "#737373" },
  { code: "EN_CURSO", name: "EN CURSO", category: "active", color: "#2563eb" },
  { code: "COMPLETADA", name: "CERRADO", category: "closed", color: "#26834a" },
];
const configuration = { states: initial, usage: {}, template: "standard", revision: "a".repeat(64), can_configure: true };
class ApiError extends Error {
  constructor(message, payload) { super(message); this.payload = payload; }
}
const preset = { id: "scrum", name: "Scrum", preset: true, revision: 1, states: [
  { name: "ABIERTO", category: "not_started", color: "#737373" },
  { name: "COMPLETADO", category: "active", color: "#2563eb" },
  { name: "CERRADO", category: "closed", color: "#26834a" },
] };

test("drafts keep explicit categories and template originals; empty groups stay fixed", () => {
  const draft = drafts.templateDraft(preset);
  assert.equal(groups.categoryValue(draft[1]), "active");
  draft[1].name = "EDITADO";
  assert.equal(preset.states[1].name, "COMPLETADO");
  assert.equal(groups.stateCategories.length, 4);
  assert.equal(groups.stateCategories[2].value, "done");
  assert.equal(drafts.templateStates([]).length, 0);
  assert.equal(new Set(draft.map((state) => state.code)).size, draft.length);
});

test("reorder is immutable, supports same-category movement and rejects cross-category drops", () => {
  const states = [...initial, { ...initial[1], code: "S_2", name: "COMPLETADO" }];
  const moved = drafts.moveState(states, "S_2", "EN_CURSO");
  assert.equal(moved[1].code, "S_2");
  assert.equal(states[1].code, "EN_CURSO");
  assert.equal(drafts.moveState(states, "S_2", "PENDIENTE"), states);
  assert.match(drafts.draftError([{ ...initial[0], name: "" }]), /1 a 70/);
  assert.match(drafts.draftError([{ ...initial[0], name: "Duplicado" }, { ...initial[1], name: " duplicado " }]), /existe/);
  assert.equal(drafts.draftError([]), "");
});

async function harness(draftMode = false) {
  const values = [], effects = [], requests = [], configured = [], reads = [];
  let index = 0, effectIndex = 0, closed = 0, confirm = true;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in values)) values[slot] = typeof initial === "function" ? initial() : initial;
      return [values[slot], (next) => { values[slot] = typeof next === "function" ? next(values[slot]) : next; }];
    },
    useRef(initial) { const slot = index++; return values[slot] ??= { current: initial }; },
    useEffect(effect, deps) {
      const slot = effectIndex++;
      if (!effects[slot] || !deps.every((value, key) => value === effects[slot].deps[key])) {
        effects[slot]?.cleanup?.();
        effects[slot] = { deps, cleanup: effect() };
      }
    },
  };
  const services = {
    getProjectTaskStates: async () => { reads.push("states"); return configuration; },
    getTaskStatusTemplates: async () => { reads.push("templates"); return [preset]; },
    configureProjectTaskStates: (id, payload) => new Promise((resolve, reject) => requests.push({ kind: "apply", id, payload, resolve, reject })),
    saveTaskStatusTemplate: (id, payload, templateId) => new Promise((resolve, reject) => requests.push({ kind: "save", id, payload, templateId, resolve, reject })),
  };
  const { useTaskStatusConfiguration } = await load("../src/features/projects/TaskStatusConfiguration/useTaskStatusConfiguration.ts", {
    react, "../../auth/api": { ApiError, errorText: (error) => error.message }, "../services": services, "./stateDraft": drafts, "../stateGroups": groups,
  }, { window: { confirm: () => confirm, addEventListener() {}, removeEventListener() {} } });
  const render = () => {
    index = 0; effectIndex = 0;
    return useTaskStatusConfiguration(draftMode ? undefined : { id: 42, task_states: configuration, permissions: { manage: true } }, (result) => configured.push(result), () => closed++,
      draftMode ? { states: initial, templates: [preset], onApply: (states, name) => configured.push({ states, name }) } : undefined);
  };
  render();
  await new Promise((resolve) => setImmediate(resolve));
  return { render, requests, configured, reads, get closed() { return closed; }, setConfirm(value) { confirm = value; } };
}

test("project creation flow is strictly local and never reads or mutates a provisional project", async () => {
  const hook = await harness(true);
  hook.render().select(preset);
  assert.equal(await hook.render().saveTemplate("No guardar"), false);
  await hook.render().apply();
  assert.equal(hook.reads.length, 0);
  assert.equal(hook.requests.length, 0);
  assert.equal(hook.configured.length, 1);
  assert.equal(hook.configured[0].states[1].category, "active");
  assert.equal(hook.closed, 1);
  assert.equal(preset.states[1].name, "COMPLETADO");
});

test("canceling draft flow preserves outer draft and missing mandatory categories prevents confirmation", async () => {
  const hook = await harness(true);
  hook.render().setStates([initial[0]]);
  await hook.render().apply();
  assert.match(hook.render().error, /No iniciado|Activo|Cerrado/);
  assert.equal(hook.configured.length, 0);
  hook.render().close();
  assert.equal(hook.closed, 1);
  assert.equal(hook.requests.length, 0);
});

test("select and cancel never write; saving a template neither applies nor duplicates requests", async () => {
  const hook = await harness();
  hook.render().select(preset);
  assert.equal(hook.requests.length, 0);
  assert.equal(hook.render().states[1].category, "active");
  hook.setConfirm(false);
  hook.render().close();
  assert.equal(hook.closed, 0);
  const action = hook.render().saveTemplate("Copia");
  await hook.render().saveTemplate("Copia");
  assert.equal(hook.requests.length, 1);
  const request = hook.requests[0];
  assert.equal(request.kind, "save");
  assert.equal(request.templateId, undefined);
  assert.equal(request.payload.states[1].category, "active");
  request.resolve({ ...preset, id: 91, preset: false, name: "Copia" });
  assert.equal(await action, true);
  assert.equal(hook.configured.length, 0);
  assert.equal(hook.closed, 0);
  assert.equal(hook.render().selected.id, 91);
});

test("save-as allows empty drafts and creates a separate template without overwriting the selection", async () => {
  const hook = await harness();
  hook.render().select(null);
  assert.equal(hook.render().states.length, 0);
  const saving = hook.render().saveTemplate("Vacía");
  assert.equal(hook.requests[0].payload.states.length, 0);
  hook.requests[0].resolve({ id: 4, name: "Vacía", states: [], preset: false, revision: 3 });
  await saving;
  assert.equal(await hook.render().saveTemplate("Vacía"), false);
  assert.equal(hook.requests.length, 1);
  const copying = hook.render().saveTemplate("Copia vacía");
  assert.equal(hook.requests[1].templateId, undefined);
  assert.equal(hook.requests[1].payload.revision, undefined);
  hook.requests[1].resolve({ id: 5, name: "Copia vacía", states: [], preset: false, revision: 1 });
  await copying;
  assert.equal(hook.configured.length, 0);
});

test("apply uses the project revision, does not save templates and retains draft after errors", async () => {
  const hook = await harness();
  hook.render().select(preset);
  const draft = hook.render().states;
  const failing = hook.render().apply();
  assert.equal(hook.requests[0].payload.revision, configuration.revision);
  assert.deepEqual(Object.keys(hook.requests[0].payload).sort(), ["revision", "states", "template"]);
  hook.requests[0].reject(new Error("La configuración cambió"));
  await failing;
  assert.equal(hook.render().states, draft);
  assert.equal(hook.render().error, "La configuración cambió");
  assert.equal(hook.configured.length, 0);
  const applying = hook.render().apply();
  hook.requests[1].resolve({ ...configuration, states: draft });
  await applying;
  assert.equal(hook.requests.every((request) => request.kind === "apply"), true);
  assert.equal(hook.configured.length, 1);
  assert.equal(hook.closed, 1);
});

test("backend category errors retain the draft and clear when edited without inventing states", async () => {
  const hook = await harness();
  hook.render().select(preset);
  const before = hook.render().states;
  const applying = hook.render().apply();
  hook.requests[0].reject(new ApiError("Inválido", { categories: { done: ["Añade un estado en Completado para conservar las tareas de esta categoría"] } }));
  await applying;
  assert.equal(hook.render().states, before);
  assert.equal(hook.render().error, "");
  assert.match(hook.render().categoryErrors.done, /Añade un estado en Completado/);
  assert.equal(hook.configured.length, 0);
  assert.equal(hook.closed, 0);
  hook.render().setStates(states => [...states, { code: "draft_done", category: "done", name: "VALIDADO" }]);
  assert.equal(Object.keys(hook.render().categoryErrors).length, 0);
});

test("Scrum COMPLETADO remains overdue when active; Done and Closed follow explicit metadata", async () => {
  const assignees = await load("../src/features/projects/taskAssignees.ts");
  const { taskDueGroup } = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });
  const task = { state_code: "S_123", state_name: "COMPLETADO", state_category: "active", due_date: "2026-01-01" };
  assert.equal(taskDueGroup(task, "2026-10-16").key, "overdue");
  assert.equal(taskDueGroup({ ...task, state_category: "done" }, "2026-10-16").key, "completed");
  assert.equal(taskDueGroup({ ...task, state_category: "closed" }, "2026-10-16").key, "completed");
  assert.equal(taskDueGroup({ ...task, state_code: "CANCELADA", state_category: "closed" }, "2026-10-16").key, "overdue");
});

test("dialog retains all four categories and actions without inheritance controls or extra footer links", async () => {
  const Icon = () => React.createElement("svg", { "aria-hidden": true });
  const { default: Dialog } = await load("../src/features/projects/TaskStatusConfiguration/TaskStatusConfigurationDialog.tsx", {
    "../Modal/Modal": { default: ({ title, children }) => React.createElement("section", { "aria-label": title }, children) },
    "../TaskForm/TaskIcon": { default: Icon },
    "../../../shared/icons/ChevronDownIcon": { default: Icon }, "../../../shared/icons/DotsIcon": { default: Icon },
    "../../../shared/icons/InfoIcon": { default: Icon }, "../../../shared/icons/PlusIcon": { default: Icon },
    "../../../shared/icons/CheckIcon": { default: Icon }, "../../../shared/icons/SettingsIcon": { default: Icon },
    "../TaskList/TaskCell": { StateIcon: Icon },
    "../stateGroups": groups, "./stateDraft": drafts,
    "./useTaskStatusConfiguration": { useTaskStatusConfiguration: () => ({ configuration, states: initial, templates: [preset], categoryErrors: {}, loading: false, selected: null, error: "" }) },
  });
  const markup = renderToStaticMarkup(React.createElement(Dialog, { project: { permissions: { manage: true } } }));
  for (const category of groups.stateCategories) assert.ok(markup.includes(`aria-label="${category.label}"`));
  assert.equal((markup.match(/>Añadir estado</g) ?? []).length, 4);
  assert.equal((markup.match(/>Guardar como plantilla</g) ?? []).length, 1);
  assert.doesNotMatch(markup, /Reasignar estados utilizados|Motivo|Selecciona un estado de destino/);
  assert.match(markup, /Aplicar cambios/);
  assert.doesNotMatch(markup, /Heredar|Más información sobre los estados/);
});
