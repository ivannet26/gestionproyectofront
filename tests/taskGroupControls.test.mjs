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

const Icon = () => React.createElement("svg", { "aria-hidden": true });
const { default: Expansion } = await load("../src/features/projects/TaskList/TaskGroupExpansionControl.tsx", {
  "../../../shared/icons/ChevronDownIcon": { default: Icon },
});
const assignees = await load("../src/features/projects/taskAssignees.ts");
const { taskHierarchy } = await load("../src/features/projects/TaskList/taskHierarchy.ts");
const { groupTasks } = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });

test("global expansion is icon-only, labeled, stateful and disabled with no groups", () => {
  const render = (expanded, disabled = false) => renderToStaticMarkup(React.createElement(Expansion, {
    expanded, disabled, controls: "group-1 group-2", onToggle() {},
  }));
  const expanded = render(true);
  assert.match(expanded, /aria-label="Contraer grupos" aria-expanded="true" aria-controls="group-1 group-2"/);
  assert.match(expanded, /rotate-180/);
  assert.match(expanded, /role="tooltip"/);
  assert.doesNotMatch(expanded.match(/<button[\s\S]*?<\/button>/)[0], />Contraer grupos</);
  assert.match(render(false), /aria-label="Expandir grupos" aria-expanded="false"/);
  assert.match(render(false, true), /disabled=""/);
});

test("global action handles open, closed and mixed groups without changing subtree or other-mode expansion", async () => {
  let state = [], index = 0, mode = "state", controls;
  const hooks = {
    useId: () => "list",
    useMemo: (calculate) => calculate(),
    useRef: (initial) => ({ current: initial }),
    useEffect(effect) { effect(); },
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], (next) => { state[slot] = typeof next === "function" ? next(state[slot]) : next; }];
    },
  };
  const configured = [1, 2].map((number) => ({ code: String(number), name: String(number) }));
  const groups = () => mode === "state"
    ? groupTasks([], taskHierarchy([], ""), { mode, order: "asc" }, configured, [], "2026-10-16")
    : [1, 2].map((number) => ({ key: `${mode}:${number}`, name: `${number}`, roots: [], members: new Set(), visible: new Set() }));
  const Marker = () => null;
  const { default: List } = await load("../src/features/projects/TaskList/TaskList.tsx", {
    react: hooks,
    "../TaskForm/TaskProperty": { default: Marker },
    "../../../shared/icons/ChevronDownIcon": { default: Icon },
    "../../../shared/icons/DotsIcon": { default: Icon },
    "../../../shared/icons/PlusIcon": { default: Icon },
    "../../../shared/icons/RelationIcon": { default: Icon },
    "../TaskForm/TaskIcon": { default: Icon },
    "./TaskCell": { default: Marker, StateIcon: Icon },
    "./QuickTaskRow": { default: Marker },
    "./stateInk": { stateInk: () => "#000000" },
    "./TaskGroupingControl": { default: Marker },
    "./TaskGroupExpansionControl": { default: Expansion },
    "./TaskStatusSettingsControl": { default: Marker },
    "./TaskGroupLabel": { default: Marker },
    "../ProjectWorkspace/ProjectToolbar": { default: Marker },
    "./TaskSearch": { default: Marker },
    "./TaskMoveControl": { default: Marker },
    "./useTaskMove": { useTaskMove: () => ({ permitted: () => false }) },
    "./useTaskPointerDrag": { useTaskPointerDrag: () => ({ onPointerDown() {}, onClickCapture() {}, onDragStart() {} }) },
    "../TaskStateForm/TaskStateForm": { default: Marker },
    "../Modal/Modal": { default: Marker },
    "./taskListInteractions.css": {},
    "./taskDropPosition": { taskDropPosition() {} },
    "./useTaskGrouping": { useTaskGrouping: (_tasks, search, _states, _priorities, preferences) => {
      assert.equal(search, ""); assert.equal(preferences.mode, mode);
      return { hierarchy: { roots: [], visible: new Set() }, groups: groups() };
    } },
  });
  const props = { project: { task_states: { states: [] }, permissions: {} }, tasks: [], catalogs: { priorities: [] }, search: "",
    get preferences() { return { mode, order: "asc", separatePeople: false, separateLabels: false }; },
    onGroupControls(value) { controls = value; },
  };
  function find(element, predicate) {
    if (!element || typeof element !== "object") return;
    if (Array.isArray(element)) return element.map((child) => find(child, predicate)).find(Boolean);
    if (predicate(element)) return element;
    return find(element.props?.children, predicate);
  }
  function render() { index = 0; return List(props); }
  const global = () => { render(); return { ...controls, onToggle: controls.toggle }; };
  assert.equal(global().expanded, true);
  assert.equal(controls.controls, "list-group-0 list-group-1");
  assert.equal(controls.disabled, false);
  assert.equal(find(render(), (element) => element.type === Expansion), undefined);
  const initialSubtasks = state[0], initialContext = state[2];
  global().onToggle();
  assert.equal(global().expanded, false);
  assert.deepEqual([...state[1]], ["state:1", "state:2"]);
  const firstHeading = find(render(), (element) => element.type === "h2");
  firstHeading.props.children.props.onClick();
  assert.equal(global().expanded, false);
  global().onToggle();
  assert.equal(global().expanded, true);
  assert.equal(state[1].size, 0);
  global().onToggle();
  mode = "labels";
  assert.equal(global().expanded, true);
  global().onToggle();
  global().onToggle();
  assert.deepEqual([...state[1]], ["state:1", "state:2"]);
  mode = "state";
  assert.equal(global().expanded, false);
  global().onToggle();
  assert.equal(global().expanded, true);
  assert.equal(state[0], initialSubtasks);
  assert.equal(state[2], initialContext);
  state = [];
});
