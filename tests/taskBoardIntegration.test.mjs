import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as runtime from "react/jsx-runtime";
import ts from "typescript";

async function boardHarness(tasks, failure) {
  const writes = [], states = [];
  const Dnd = () => null, Empty = () => null;
  const react = { ...React, useState: initial => [initial, value => states.push(value)], useRef: initial => ({ current: initial }), useMemo: fn => fn(), useCallback: fn => fn };
  const source = ts.transpileModule(readFileSync(new URL("../src/features/projects/TaskBoard/TaskBoard.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(source);
  await module.link(name => {
    const exports = name === "react" ? react : name === "react/jsx-runtime" ? runtime : name === "@dnd-kit/core" ? {
      DndContext: Dnd, DragOverlay: Empty, KeyboardSensor: Empty, PointerSensor: Empty,
      useDroppable: () => ({}), useDraggable: () => ({}), useSensor: () => ({}), useSensors: () => [],
    } : name.endsWith("/taskHierarchy") ? { formatTaskDate: String } : name.endsWith("/taskAssignees") ? { taskAssignees: () => [] }
      : name.endsWith("/stateInk") ? { stateInk: () => "#fff" } : { default: Empty };
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
  });
  await module.evaluate();
  const tree = module.namespace.default({ project: { task_states: { states: [{ code: "OPEN" }, { code: "ACTIVE" }] } }, tasks, catalogs: {}, onAction() {},
    onState: async (task, payload) => { writes.push({ id: task.id, payload }); if (failure) throw failure; } });
  const context = React.Children.toArray(tree.props.children).find(child => child.type === Dnd);
  return { writes, states, drag: async (id, state) => { context.props.onDragEnd({ active: { id }, over: state ? { id: state } : null }); await new Promise(resolve => setImmediate(resolve)); }, cancel: context.props.onDragCancel };
}

const task = id => ({ id, parent_id: id === 1 ? null : 1, state_code: "OPEN", permissions: { state: true }, transitions: [{ target: "ACTIVE" }] });

test("Kanban changes only the dragged identity without cascading state or inventing a reason", async () => {
  const tasks = [task(1), task(2)], original = structuredClone(tasks);
  const board = await boardHarness(tasks);
  await board.drag(1, "ACTIVE");
  assert.equal(board.writes.length, 1); assert.equal(board.writes[0].id, 1);
  assert.deepEqual(Object.keys(board.writes[0].payload), ["state_code"]);
  assert.equal(board.writes[0].payload.state_code, "ACTIVE");
  assert.deepEqual(tasks, original);
});

test("Kanban rejects unavailable destinations and readonly tasks and cancellation writes nothing", async () => {
  const board = await boardHarness([task(1), { ...task(2), permissions: { state: false } }]);
  await board.drag(1, "UNKNOWN"); await board.drag(2, "ACTIVE"); await board.drag(1, "OPEN"); await board.drag(1, null); board.cancel();
  assert.equal(board.writes.length, 0);
});

test("a rejected Kanban write leaves the confirmed collection untouched and is never replayed", async () => {
  const tasks = [task(1), task(2)], original = structuredClone(tasks);
  const board = await boardHarness(tasks, Error("Conflicto 409"));
  await board.drag(1, "ACTIVE");
  assert.equal(board.writes.length, 1); assert.deepEqual(tasks, original);
  assert.ok(board.states.some(value => typeof value === "string" && value.includes("409")));
});
