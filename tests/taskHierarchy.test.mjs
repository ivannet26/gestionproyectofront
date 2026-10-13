import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/projects/TaskList/taskHierarchy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const module = new vm.SourceTextModule(compiled);
await module.link(() => { throw new Error("Unexpected import"); });
await module.evaluate();
const { taskHierarchy } = module.namespace;
const task = (id, parent_id = null, name = `Tarea ${id}`, state_code = "PENDIENTE") => ({ id, parent_id, name, state_code, labels: [], responsible_name: "Persona sintética" });

test("children stay under their parent despite a different state", () => {
  const tree = taskHierarchy([task(1), task(2, 1, "Hija", "COMPLETADA"), task(3, 2), task(4)]);
  assert.deepEqual(tree.roots.map(t => t.id), [1, 4]);
  assert.equal(tree.descendants(1), 2);
  assert.equal(tree.children.get(1)[0].state_code, "COMPLETADA");
});
test("search includes matching descendants and their ancestors, not unrelated siblings", () => {
  const tree = taskHierarchy([task(1), task(2, 1, "Inspección"), task(3, 1)], "inspección");
  assert.deepEqual([...tree.visible].sort(), [1, 2]);
  assert.equal(tree.descendants(1), 1);
});
test("an authorized orphan is visible without inventing its hidden parent", () => {
  const tree = taskHierarchy([task(2, 999)]);
  assert.deepEqual(tree.roots.map(t => t.id), [2]);
  assert.equal(tree.visible.has(999), false);
});
test("searches real labels and assignees and handles an empty list", () => {
  assert.equal(taskHierarchy([]).roots.length, 0);
  assert.equal(taskHierarchy([task(1)], "sintética").roots.length, 1);
  assert.equal(taskHierarchy([{ ...task(1), labels: [{ name: "Concreto" }] }], "concreto").roots.length, 1);
});
