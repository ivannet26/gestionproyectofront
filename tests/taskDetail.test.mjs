import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as React from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

async function load(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(code);
  await module.link(name => {
    const values = { react: React, 'react/jsx-runtime': runtime, ...dependencies }[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); });
  });
  await module.evaluate();
  return module.namespace;
}
const formatting = await load('../src/features/projects/TaskDetail/detailFormat.ts');
const hierarchy = await load('../src/features/projects/TaskList/taskHierarchy.ts');
const Empty = () => null;

test('duration is integer minutes with readable hours and Lima activity times', () => {
  assert.equal(formatting.formatEstimate(95), '1 h 35 min');
  assert.equal(formatting.formatEstimate(60), '1 h');
  assert.equal(formatting.formatEstimate(null), 'Añadir estimación');
  assert.match(formatting.formatActivityDate('2026-10-20T03:00:00Z'), /19 oct.*2026/);
  assert.equal(formatting.activityValue({ name: 'Estado anterior' }), 'Estado anterior');
  assert.equal(formatting.activityValue([{ first_names: 'Ángela', last_names: 'QA' }]), 'Ángela QA');
});

test('activity groups complete operations, escapes content and exposes granular before/after events', async () => {
  const { default: Activity } = await load('../src/features/projects/TaskDetail/TaskActivity.tsx', {
    './detailFormat': formatting, '../TaskList/taskHierarchy': hierarchy,
  });
  const event = { actor_name: '<Autor QA>', created_at: '2026-10-20T15:00:00Z', action: 'changed', field: 'name', old_value: 'Anterior', new_value: 'Nuevo' };
  const markup = renderToStaticMarkup(React.createElement(Activity, { page: { items: [{ id: 'op1', events: [{ ...event, id: 1 }, { ...event, id: 2, field: 'estimated_minutes', old_value: null, new_value: 95 }] }], next_cursor: 1 }, retry() {}, loadMore() {} }));
  assert.match(markup, /Mostrar más \(1\)/); assert.match(markup, /Ocultar \(1\)/);
  assert.match(markup, /&lt;Autor QA&gt;/); assert.match(markup.replace(/<[^>]*>/g, ""), /de Anterior a Nuevo/);
  assert.match(markup, /1 h 35 min/); assert.match(markup, /Cargar actividad anterior/);
  assert.doesNotMatch(markup, /textarea|Comentar|Buscar|Seguir/);
});

test('explicit day/hour/minute grammar preserves canonical minutes without rounding', () => {
  for (const [input, minutes] of [['2 d', 960], ['4 h', 240], ['1 d 4 h', 720], ['2 días', 960], ['4 horas', 240], ['1 día 4 horas', 720], ['  1 DÍA  4 HORAS  ', 720], ['90 min', 90], ['1 h 30 minutos', 90], ['', null], ['2147483647 min', 2147483647]]) {
    assert.equal(formatting.parseEstimate(input), minutes, input);
  }
  for (const input of ['0 min', '-1 h', '1.5 h', '2,5 h', '1 semana', '1 h resto', 'h', '1 d 4', '1 h 2 h', '2147483648 min', '999999999999999999999 d']) assert.throws(() => formatting.parseEstimate(input), undefined, input);
  assert.throws(() => formatting.parseEstimate('90'), /unidad/);
  assert.equal(formatting.formatEstimate(720), '1 d 4 h');
  for (const minutes of [1, 59, 60, 90, 479, 480, 525, 720, 2147483647]) assert.equal(formatting.parseEstimate(formatting.formatEstimate(minutes)), minutes);
});

test('collapsed activity is inert and hidden but retains groups in its mounted tree', async () => {
  const { default: Activity } = await load('../src/features/projects/TaskDetail/TaskActivity.tsx', { './detailFormat': formatting, '../TaskList/taskHierarchy': hierarchy });
  const markup = renderToStaticMarkup(React.createElement(Activity, { id: 'activity', visible: false, page: { items: [{ id: 'op', events: [{ id: 1, action: 'created', actor_name: 'QA', created_at: '2026-10-20T15:00:00Z' }] }] } }));
  assert.match(markup, /id="activity" hidden="" inert=""/);
  assert.match(markup, /QA/);
});

test('empty activity explicitly identifies missing historical events without inventing them', async () => {
  const { default: Activity } = await load('../src/features/projects/TaskDetail/TaskActivity.tsx', { './detailFormat': formatting, '../TaskList/taskHierarchy': hierarchy });
  const markup = renderToStaticMarkup(React.createElement(Activity, { page: { items: [] }, loading: false, error: '' }));
  assert.match(markup, /No hay actividad registrada/);
  assert.match(markup, /No se reconstruyen eventos anteriores/);
  assert.doesNotMatch(markup, /<li/);
});

test('subtask finished indicator uses category, not a Scrum display name; global counts survive paging', async () => {
  const { default: Subtasks } = await load('../src/features/projects/TaskDetail/TaskSubtasks.tsx', {
    '../TaskList/TaskCell': { PriorityLabel: ({ name }) => name },
    '../TaskForm/TaskIcon': { default: ({ name }) => React.createElement('i', { 'data-icon': name }) },
    '../TaskList/QuickTaskRow': { default: Empty }, '../../../shared/Tooltip': { default: Empty },
    '../../../shared/avatar': { avatarFor: String }, '../taskAssignees': { taskAssignees: () => [] },
  });
  const task = { id: 1, permissions: { create_child: false } };
  const markup = renderToStaticMarkup(React.createElement(Subtasks, { target: { taskId: 1, projectId: 1 }, task, project: {}, catalogs: { priorities: [] },
    page: { total: 35, completed: 3, next_cursor: 30, items: [{ id: 2, name: 'COMPLETADO', state_name: 'COMPLETADO', state_category: 'active' }] } }));
  assert.match(markup, /Completadas: 3 de 35/); assert.match(markup, /value="3"/);
  assert.match(markup, /data-icon="state"/); assert.doesNotMatch(markup, /data-icon="check"/);
  assert.match(markup, /Cargar más subtareas/); assert.doesNotMatch(markup, /Añadir tarea/);
});

function hooks() {
  const slots = []; let index = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  return { react: {
    useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], next => { slots[slot] = typeof next === 'function' ? next(slots[slot]) : next; }]; },
    useRef(initial) { const slot = index++; return slots[slot] ??= { current: initial }; },
    useCallback(fn, deps) { const slot = index++; if (!same(slots[slot]?.deps, deps)) slots[slot] = { fn, deps }; return slots[slot].fn; },
    useEffect(effect, deps) { const slot = index++; if (!same(slots[slot]?.deps, deps)) { slots[slot]?.cleanup?.(); slots[slot] = { deps, cleanup: effect() }; } },
  }, render(fn) { index = 0; return fn(); }, unmount() { for (const slot of slots) slot?.cleanup?.(); } };
}
const services = Object.fromEntries(['changeTaskState', 'getTaskActivity', 'getTaskDetail', 'getTaskRelations', 'getTaskSubtasks', 'updateTask'].map(name => [name, async () => ({ items: [], next_cursor: null })]));
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('late detail responses and unmounted loads cannot overwrite a new resource', async () => {
  const harness = hooks(), first = deferred(), second = deferred();
  const { useTaskResource } = await load('../src/features/projects/TaskDetail/useTaskDetail.ts', { react: harness.react, '../services': services, '../../auth/api': { errorText: error => error.message } });
  const oldLoad = () => first.promise, newLoad = () => second.promise;
  harness.render(() => useTaskResource(oldLoad)); await flush();
  const changed = harness.render(() => useTaskResource(newLoad));
  assert.equal(changed.value, null); assert.equal(changed.loading, true);
  await flush();
  second.resolve({ id: 2 }); await flush(); first.resolve({ id: 1 }); await flush();
  assert.equal(harness.render(() => useTaskResource(newLoad)).value.id, 2);
  harness.unmount();
});

test('stale pagination cannot append after a refresh, and retry keeps valid content', async () => {
  const harness = hooks(), requests = [];
  const { useTaskPage } = await load('../src/features/projects/TaskDetail/useTaskDetail.ts', { react: harness.react, '../services': services, '../../auth/api': { errorText: error => error.message } });
  const query = cursor => { const request = deferred(); requests.push({ ...request, cursor }); return request.promise; };
  const render = () => harness.render(() => useTaskPage(query));
  render(); await flush(); requests[0].resolve({ items: [1], next_cursor: 1 }); await flush();
  const more = render().loadMore(); const refresh = render().refresh();
  requests[2].resolve({ items: [9], next_cursor: null }); await refresh;
  requests[1].resolve({ items: [2], next_cursor: null }); await more;
  assert.deepEqual(Array.from(render().value.items), [9]);
  const failed = render().refresh(); requests[3].reject(Error('Conexión interrumpida')); await failed;
  assert.equal(render().error, 'Conexión interrumpida'); assert.deepEqual(Array.from(render().value.items), [9]);
  harness.unmount();
});

test('browser verification expressions are executable before starting isolated services', () => {
  const source = ts.createSourceFile('browser.mjs', readFileSync(new URL('./verify-task-detail-browser.mjs', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visit(node) {
    if (ts.isCallExpression(node) && ['wait', 'evaluate'].includes(node.expression.getText(source)) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) new vm.Script(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
});
