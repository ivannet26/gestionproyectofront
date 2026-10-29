import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

async function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = vm.createContext({ window: new EventTarget(), Promise });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(name => {
    const exports = { react: React, "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, `Unexpected import ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

function hooks() {
  const slots = [];
  let index = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, key) => Object.is(value, b[key]));
  return {
    react: { ...React,
      useState(initial) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = typeof initial === "function" ? initial() : initial;
        return [slots[slot], next => { slots[slot] = typeof next === "function" ? next(slots[slot]) : next; }];
      },
      useRef(initial) { const slot = index++; return slots[slot] ??= { current: initial }; },
      useCallback(fn, deps) {
        const slot = index++;
        if (!same(slots[slot]?.deps, deps)) slots[slot] = { value: fn, deps };
        return slots[slot].value;
      },
      useMemo(fn, deps) {
        const slot = index++;
        if (!same(slots[slot]?.deps, deps)) slots[slot] = { value: fn(), deps };
        return slots[slot].value;
      },
      useEffect(effect, deps) {
        const slot = index++;
        if (!same(slots[slot]?.deps, deps)) {
          slots[slot]?.cleanup?.();
          slots[slot] = { deps, cleanup: effect() };
        }
      },
    },
    render(fn) { index = 0; return fn(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

function find(element, type) {
  if (!element || typeof element !== "object") return undefined;
  if (element.type === type) return element;
  for (const child of [element.props?.element, ...React.Children.toArray(element.props?.children)]) {
    const found = find(child, type);
    if (found) return found;
  }
}

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));

test("overlapping loading leases survive legacy hide and release each operation only once", async () => {
  const harness = hooks();
  const state = await load("../src/context/loadingState.ts");
  const { LoadingProvider } = await load("../src/context/LoadingContext.tsx", { react: harness.react, "./loadingState": state });
  const render = () => harness.render(() => LoadingProvider({ children: null }).props.value);
  const initial = render();
  assert.equal(initial.isLoading, true);
  const first = initial.startLoading(), second = initial.startLoading();
  initial.hideLoading();
  assert.equal(render().isLoading, true);
  first(); first();
  render().hideLoading();
  assert.equal(render().isLoading, true);
  assert.equal(render().startLoading, initial.startLoading);
  second();
  assert.equal(render().isLoading, false);
  const third = render().startLoading();
  render().showLoading(); third(); third();
  assert.equal(render().isLoading, true);
  render().hideLoading();
  assert.equal(render().isLoading, false);
});

async function shellHarness() {
  const harness = hooks(), projects = [], catalogs = [];
  const Empty = () => null, ProjectRoute = () => null, Sidebar = () => null;
  let pathname = "/proyectos/42", active = 0, bootReleased = false;
  const loading = { hideLoading() { bootReleased = true; }, startLoading() { active++; let open = true; return () => { if (open) { open = false; active--; } }; } };
  const resource = await load("../src/hooks/useRemoteResource.ts", {
    react: harness.react, "../features/auth/api": { errorText: error => error.message, sessionVersion: () => 1 },
  });
  const { default: AppShell } = await load("../src/features/layout/AppShell/AppShell.tsx", {
    react: harness.react,
    "react-router": { Route: Empty, Routes: Empty, useLocation: () => ({ pathname }), useNavigate: () => () => {} },
    "../../../routes": { appRoutes: [{ path: "/proyectos/:projectId", Component: ProjectRoute }], DashboardPage: () => null, ProjectList: () => null, ProjectRoute, PublicationsPage: () => null, projectPath: id => `/proyectos/${id}` },
    "../../auth/api": { errorText: error => error.message },
    "../../../hooks/useLoading": { useLoading: () => loading },
    "../../../hooks/useRemoteResource": resource,
    "../../projects/projectDirectoryEvents": { projectDirectoryChanged() {} },
    "../../projects/useProjectDirectory": { useProjectDirectory: (filters, enabled = true) => {
      const [data, setData] = harness.react.useState([]);
      const [pending, setPending] = harness.react.useState(enabled);
      const [error, setError] = harness.react.useState("");
      const current = harness.react.useRef(true);
      const refetch = () => {
        if (!enabled || !current.current) return Promise.resolve();
        setPending(true);
        const item = deferred(); projects.push(item);
        return item.promise.then((page) => { if (current.current) setData(page); })
          .catch((failure) => { if (current.current) setError(failure.message); })
          .finally(() => { if (current.current) setPending(false); });
      };
      harness.react.useEffect(() => {
        current.current = true;
        if (enabled) void refetch();
        return () => { current.current = false; };
      }, [enabled]);
      return { data, loading: pending && !data.length, pending, error, refetch, reload: refetch, navigation: {} };
    } },
    "../../projects/CreateProjectModal/CreateProjectModal": { default: Empty },
    "../../dashboard/DashboardPage/DashboardPage": { default: Empty },
    "../../projects/Modal/Modal": { default: Empty },
    "../../projects/ProjectList/ProjectList": { default: Empty },
    "../../projects/ProjectRoute/ProjectRoute": { default: ProjectRoute },
    "../../projects/services": {
      getProject: async () => ({ id: 42 }),
      getProjects: () => { const item = deferred(); projects.push(item); return item.promise; },
      getProjectCatalogs: () => { const item = deferred(); catalogs.push(item); return item.promise; },
    },
    "../NotAvailable/NotAvailable": { default: Empty }, "../Sidebar/Sidebar": { default: Sidebar },
    "../../publications/PublicationsPage": { default: Empty },
  });
  const user = { role: "ADMINISTRADOR", permissions: { manage_accounts: true } };
  const tree = () => harness.render(() => AppShell({ user, onLogout() {}, logoutError: "" }));
  return { projects, catalogs, route: () => find(tree(), ProjectRoute).props, sidebar: () => find(tree(), Sidebar).props,
    get active() { return active; }, get bootReleased() { return bootReleased; }, navigate(next) { pathname = next; tree(); }, unmount: harness.unmount };
}

test("catalog requests stay independent of lazy project navigation and retain errors and retry", async () => {
  const shell = await shellHarness();
  assert.equal(shell.route().catalogLoading, true); await flush();
  assert.equal(shell.projects.length, 0); assert.equal(shell.catalogs.length, 1);
  assert.equal(shell.active, 0);
  assert.equal(shell.bootReleased, true);
  shell.catalogs[0].reject(Error("Catálogos no disponibles"));
  await flush();
  const failed = shell.route();
  assert.equal(shell.bootReleased, true);
  assert.equal(failed.catalogError, "Catálogos no disponibles");
  assert.equal(failed.catalogLoading, false);
  assert.equal(shell.active, 0);
  failed.onRetryCatalogs(); await flush();
  assert.equal(shell.route().catalogLoading, true);
  assert.equal(shell.projects.length, 0); assert.equal(shell.catalogs.length, 2);
  const confirmed = { areas: [{ id: 1 }], states: [{ code: "OPEN" }], priorities: [] };
  shell.catalogs[1].resolve(confirmed); await flush();
  const ready = shell.route();
  assert.equal(ready.catalogs, confirmed); assert.equal(ready.catalogLoading, false); assert.equal(ready.catalogError, "");
  assert.equal("onRetryProjects" in shell.sidebar(), false);
  assert.equal("directoryNavigation" in shell.sidebar(), false);
  assert.equal(shell.projects.length, 0);
  shell.unmount(); assert.equal(shell.active, 0);
});

test("late catalog responses from a departed route are discarded and a returning route can retry", async () => {
  const shell = await shellHarness();
  shell.route(); await flush();
  shell.navigate("/inicio");
  shell.catalogs[0].resolve({ areas: [{ id: 99 }], states: [], priorities: [] });
  await flush();
  shell.navigate("/proyectos/42"); await flush();
  assert.equal(shell.catalogs.length, 2);
  assert.equal(shell.route().catalogs.areas.length, 0);
  assert.equal(shell.route().catalogLoading, true);
  const current = { areas: [{ id: 2 }], states: [], priorities: [] };
  shell.catalogs[1].resolve(current); await flush();
  assert.equal(shell.route().catalogs, current);
  shell.unmount();
});

test("project route forwards catalog loading, errors and retry without disguising failure as an empty catalog", async () => {
  const Workspace = () => null, Missing = () => null;
  let projectId = "42", locationState = null;
  const { default: ProjectRoute } = await load("../src/features/projects/ProjectRoute/ProjectRoute.tsx", {
    "react-router": {
      useParams: () => ({ projectId }),
      useLocation: () => ({ state: locationState }),
    },
    "../../../hooks/useRemoteResource": { useRemoteResource: () => ({ value: null }) },
    "../../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
    "../../../core/services/projectService": { getProjectCatalogs: async () => ({ areas: [], states: [], priorities: [] }) },
    "../../layout/NotAvailable/NotAvailable": { default: Missing },
    "../ProjectWorkspace/ProjectWorkspace": { default: Workspace },
  });
  const props = { catalogs: { states: [] }, catalogLoading: false, catalogError: "Sin conexión", onRetryCatalogs() {} };
  const result = ProjectRoute(props);
  assert.equal(result.type, Workspace); assert.equal(result.props.projectId, 42);
  assert.equal(result.props.catalogLoading, false); assert.equal(result.props.catalogError, "Sin conexión");
  assert.equal(result.props.onRetryCatalogs, props.onRetryCatalogs);
  assert.equal(result.props.taskCreationSequence, undefined);
  locationState = { taskCreationRequest: { projectId: 42, sequence: 7 } };
  assert.equal(ProjectRoute(props).props.taskCreationSequence, 7);
  projectId = "invalid";
  assert.equal(ProjectRoute(props).type, Missing);
});


test("optional directory failure cannot block login or add sidebar retry controls", async () => {
  const shell = await shellHarness();
  shell.route(); await flush(); assert.equal(shell.bootReleased, true); assert.equal(shell.projects.length, 0);
  shell.navigate("/proyectos"); assert.equal(shell.projects.length, 1);
  shell.projects[0].reject(Error("Listado no disponible")); await flush();
  assert.equal(shell.bootReleased, true); assert.equal("onRetryProjects" in shell.sidebar(), false);
  shell.navigate("/proyectos/42"); assert.equal(shell.projects.length, 1);
  shell.unmount(); shell.catalogs[0].resolve({ areas: [], states: [], priorities: [] }); await flush();
});
