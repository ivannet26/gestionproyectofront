import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

async function load(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(code);
  await module.link(name => {
    const values = { react: React, 'react/jsx-runtime': jsx, ...dependencies }[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); });
  });
  await module.evaluate();
  return module.namespace;
}
const hierarchyModule = await load('../src/features/projects/TaskList/taskHierarchy.ts');
const assignees = await load('../src/features/projects/taskAssignees.ts');
const grouping = await load('../src/features/projects/TaskList/taskGrouping.ts', { '../taskAssignees': assignees });
const { taskStatePresentation } = await load('../src/features/projects/TaskList/taskStatePresentation.ts');
const dates = await load('../src/features/projects/TaskForm/taskDates.ts', { '../TaskList/taskGrouping': grouping });
const { default: DateValue } = await load('../src/features/projects/TaskForm/TaskDateValue.tsx', { './taskDates': dates, '../TaskList/taskHierarchy': hierarchyModule });
const states = ['P', 'E', 'C', 'B'].map(code => ({ code, name: code }));
const task = (id, state_code, parent_id = null) => ({ id, parent_id, state_code, state_name: state_code, name: `Tarea ${id}`, labels: [], priority: null });
const preferences = { mode: 'state', order: 'asc', separatePeople: false, separateLabels: false };
function presentation(tasks, expanded = [], search = '') {
  const hierarchy = hierarchyModule.taskHierarchy(tasks, search);
  const groups = grouping.groupTasks(tasks, hierarchy, preferences, states, [], '2026-10-27');
  return taskStatePresentation(tasks, groups, new Set(expanded), Boolean(search));
}

test('expanded ancestors show several descendant levels with real states once and counts retain own-state membership', () => {
  const tasks = [task(1, 'P'), task(2, 'E', 1), task(3, 'C', 2), task(4, 'B', 1), task(5, 'C')];
  const before = JSON.stringify(tasks);
  const groups = presentation(tasks, [1, 2]);
  assert.deepEqual(Array.from(groups[0].displayed), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(groups[0].members), [1]);
  assert.deepEqual(Array.from(groups[2].displayed), [5]);
  assert.equal(groups[1].elsewhere, 1);
  assert.equal(groups[2].elsewhere, 1);
  assert.deepEqual(groups.flatMap(group => [...group.displayed]).sort(), [1, 2, 3, 4, 5]);
  assert.equal(groups.reduce((sum, group) => sum + group.members.size, 0), tasks.length);
  assert.equal(JSON.stringify(tasks), before);
});

test('collapse, expand, search and state regrouping only change placement and never assign another parent or state', () => {
  const tasks = [task(1, 'P'), task(2, 'E', 1), task(3, 'C', 2), task(4, 'E', 1)];
  const original = JSON.stringify(tasks);
  for (const expanded of [[], [1], [1, 2], [], [1, 2]]) {
    const groups = presentation(tasks, expanded);
    assert.equal(new Set(groups.flatMap(group => [...group.displayed])).size, 4);
    assert.equal(JSON.stringify(tasks), original);
  }
  const closed = presentation(tasks);
  assert.deepEqual(Array.from(closed[1].displayed), [2, 4]);
  assert.ok(closed[1].visible.has(1));
  assert.equal(closed[1].displayed.has(1), false);
  const filtered = presentation(tasks, [], 'Tarea 3');
  assert.deepEqual(Array.from(filtered[0].displayed), [1, 2, 3]);
  assert.equal(filtered.some(group => group.displayed.has(4)), false);
  const moved = tasks.map(item => item.id === 2 ? { ...item, state_code: 'B' } : item);
  assert.equal(presentation(moved, [1, 2])[0].displayed.has(2), true);
  assert.equal(moved[2].state_code, 'C');
  assert.equal(moved[2].parent_id, 2);
});

test('missing authorized ancestors stay absent and references never count as persisted tasks', () => {
  const tasks = [task(1, 'P'), task(2, 'E', 99), task(3, 'C', 2)];
  const groups = presentation(tasks, [99, 2]);
  assert.deepEqual(groups[1].roots.map(item => item.id), [2]);
  assert.equal(groups.some(group => group.visible.has(99)), false);
  assert.equal(groups.reduce((sum, group) => sum + group.members.size, 0), 3);
});

test('red date compares each current calendar value with creation day in Lima, independent of elapsed time', () => {
  assert.equal(dates.isBeforeTaskCreation('2026-10-22', '2026-10-26T12:00:00-05:00'), true);
  assert.equal(dates.isBeforeTaskCreation('2026-10-22', '2026-10-20T12:00:00-05:00'), false);
  assert.equal(dates.isBeforeTaskCreation('2026-10-26', '2026-10-26T12:00:00-05:00'), false);
  assert.equal(dates.isBeforeTaskCreation('2026-10-28', '2026-10-26T12:00:00-05:00'), false);
  assert.equal(dates.taskCreationDay('2026-10-26T02:00:00Z'), '2026-10-25');
  assert.equal(dates.isBeforeTaskCreation('2026-10-25', '2026-10-26T02:00:00Z'), false);
  assert.equal(dates.isBeforeTaskCreation(null, '2026-10-26T12:00:00Z'), false);
  assert.equal(dates.isBeforeTaskCreation('2026-10-22', undefined), false);
  assert.equal(dates.isBeforeTaskCreation('2026-10-22', 'unknown'), false);
});

test('date edits evaluate their own current value without claiming the original creation value', () => {
  const props = { createdAt: '2026-10-26T12:00:00-05:00' };
  const early = renderToStaticMarkup(React.createElement(DateValue, { ...props, value: '2026-10-22' }));
  const due = renderToStaticMarkup(React.createElement(DateValue, { ...props, value: '2026-10-28' }));
  const corrected = renderToStaticMarkup(React.createElement(DateValue, { ...props, value: '2026-10-26' }));
  assert.match(early, /data-before-creation="true".*text-red-700/);
  assert.match(early, /Fecha actual anterior al día de creación/);
  assert.doesNotMatch(due, /text-red|data-before-creation/);
  assert.doesNotMatch(corrected, /text-red|data-before-creation/);
  assert.doesNotMatch(early, /Fecha anterior a hoy|fecha original/i);
});
