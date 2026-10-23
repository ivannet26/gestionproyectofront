import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

async function load(path, dependencies) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = { react: React, "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, name);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

const project = { id: 42, permissions: { manage: true, create_tasks: true }, requirements: [], task_states: { states: [
  { code: "PENDIENTE", name: "Pendiente", category: "not_started" }, { code: "ACTIVO", name: "Activo", category: "active" },
] } };
let draft;
const { default: QuickRow } = await load("../src/features/projects/TaskList/QuickTaskRow.tsx", {
  "./useQuickTask": { useQuickTask: () => draft },
  "./useQuickTaskAlignment": { useQuickTaskAlignment() {} },
  "./TaskCell": { StateLabel: ({ name }) => React.createElement("span", null, name) },
  "../../../shared/Tooltip": { default: ({ label, children }) => React.createElement("span", { title: label }, children("hint")) },
  "../TaskForm/TaskOptionalProperties": { default: () => React.createElement("span", null, "Propiedades opcionales") },
  "../TaskForm/taskDates": { taskCreationStart: () => "2026-10-21" },
});
const renderQuick = (groupCode = "PENDIENTE") => renderToStaticMarkup(React.createElement(QuickRow, {
  project, catalogs: { priorities: [] }, groupCode, onClose() {}, onCreated() {},
}));

test("inline name has no permanent frame; repeated state does not create a visual status line", () => {
  draft = { name: "", state: project.task_states.states[0], busy: false, errors: {}, error: "" };
  const markup = renderQuick();
  assert.match(markup, /border-0 border-b-2 border-transparent bg-transparent/);
  assert.match(markup, /focus-visible:border-neutral-700/);
  assert.doesNotMatch(markup, /Estado:|Se creará en/);
  assert.match(markup, /items-center/);
  assert.ok(markup.indexOf("Cancelar") < markup.indexOf(">Guardar<"));
});

test("fallback state is explicitly named inside the row with accessible help, never another permanent paragraph", () => {
  const markup = renderQuick("ACTIVO");
  assert.match(markup, /aria-label="Se creará en Pendiente/);
  assert.match(markup, /aria-describedby="hint"/);
  assert.doesNotMatch(markup, /<p[^>]*>Estado:/);
});

test("inline errors and pending actions remain visible while preserving draft content", () => {
  draft = { ...draft, name: "Borrador conservado", busy: true, errors: { "task-name": "Nombre inválido" }, error: "No se pudo guardar" };
  const markup = renderQuick();
  assert.match(markup, /value="Borrador conservado"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /<fieldset[^>]*disabled/);
  assert.match(markup, /role="alert">Nombre inválido/);
  assert.match(markup, /role="alert"[^>]*>No se pudo guardar/);
  assert.match(markup, /Guardando…/);
});

test("Workspace success announcements occupy no visual space and refresh failures remain alerts", async () => {
  const Empty = () => null;
  let slot = 0, refreshError = "";
  const { default: Workspace } = await load("../src/features/projects/ProjectWorkspace/ProjectWorkspace.tsx", {
    react: { ...React, useState(initial) {
      const index = slot++;
      return React.useState(index === 0 ? project : index === 1 ? [] : index === 2 ? false : index === 4 ? "Guardado: Tarea" : index === 5 ? refreshError : initial);
    } },
    "react-router": { useSearchParams: () => [new URLSearchParams("vista=lista")], Link: Empty },
    "../../auth/api": { errorText: String },
    "../services": Object.fromEntries(["changeDependency", "changeTaskState", "createTask", "getProject", "getTasks", "updateTask"].map((name) => [name, async () => {}])),
    "../DependencyForm/DependencyForm": { default: Empty }, "../LabelList/LabelList": { default: Empty },
    "../Modal/Modal": { default: Empty }, "../TaskForm/TaskForm": { default: Empty }, "../TaskList/TaskList": { default: Empty },
    "./TaskBoard": { default: Empty },
    "../TaskList/taskHierarchy": { formatTaskDate: String }, "../TaskStateForm/TaskStateForm": { default: Empty },
    "./ProjectHeader": { default: Empty }, "../taskAssignees": { taskAssignees: () => [] },
    "./ProjectToolbar": { default: Empty }, "../../../shared/icons/PlusIcon": { default: Empty },
    "../TaskStatusConfiguration/TaskStatusConfiguration": { default: Empty },
    "../TaskDetail/TaskDetailDialog": { default: Empty },
    "../TaskDetail/useTaskDetail": { useTaskDetailNavigation: () => ({ target: null, openTaskDetail() {}, closeTaskDetail() {} }) },
  });
  const render = () => { slot = 0; return renderToStaticMarkup(React.createElement(Workspace, { projectId:42, catalogs:{ priorities:[] } })); };
  assert.match(render(), /<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">Guardado: Tarea<\/p>/);
  refreshError = "No se pudo actualizar la lista";
  assert.match(render(), /role="alert">No se pudo actualizar la lista/);
});
