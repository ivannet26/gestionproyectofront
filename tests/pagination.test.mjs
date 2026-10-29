import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise((resolve) => setImmediate(resolve));
function queued() {
  const calls = [];
  const run = (...args) => { const item = { ...deferred(), args }; calls.push(item); return item.promise; };
  return { calls, run };
}
function harness() {
  const slots = [];
  let index = 0, changes = 0, epoch = 0;
  const window = new EventTarget(), context = vm.createContext({ window, Event, console, URLSearchParams });
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const hooks = { ...React,
    useState(initial) { const n = index++; if (!(n in slots)) slots[n] = typeof initial === "function" ? initial() : initial; return [slots[n], (next) => { changes++; slots[n] = typeof next === "function" ? next(slots[n]) : next; }]; },
    useRef(initial) { const n = index++; return slots[n] ??= { current: initial }; },
    useMemo(fn, deps) { const n = index++; if (!same(slots[n]?.deps, deps)) slots[n] = { deps, value: fn() }; return slots[n].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const n = index++; if (!same(slots[n]?.deps, deps)) { slots[n]?.cleanup?.(); slots[n] = { deps, cleanup: fn() }; } },
  };
  const auth = { errorText: (error) => error.message, sessionVersion: () => epoch };
  async function load(file, dependencies = {}) {
    const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = new vm.SourceTextModule(source, { context });
    await module.link((name) => {
      const exports = { react: hooks, "react/jsx-runtime": jsx, ...dependencies }[name] ?? (name.endsWith("auth/api") ? auth : null);
      assert.ok(exports, name);
      return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate(); return module.namespace;
  }
  const resource = () => load("../src/hooks/useRemoteResource.ts");
  return { load, resource, render(fn) { index = 0; return fn(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    session(type = "gm-session-updated") { epoch++; window.dispatchEvent(new Event(type)); },
    get changes() { return changes; },
  };
}


const page = (id, next_cursor = null) => ({ results: [{ id }], total: 79, cursor: "page-" + id, next_cursor });
async function pagingHarness() {
  const h = harness(), resource = await h.resource();
  const { useCursorPage } = await h.load("../src/hooks/useCursorPage.ts", { "./useRemoteResource": resource });
  return { h, useCursorPage };
}

test("cursor navigation keeps a bounded page and goes back with the original snapshot cursor", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const render = () => h.render(() => useCursorPage(q.run, "directory"));
  render(); await flush(); assert.equal(q.calls[0].args[0], null);
  q.calls[0].resolve(page(1, "next-1")); await flush();
  render().navigation.next(); render(); await flush();
  assert.equal(q.calls[1].args[0], "next-1"); assert.equal(render().data[0].id, 1);
  assert.equal(render().refreshing, true);
  q.calls[1].resolve(page(2)); await flush();
  assert.equal(render().navigation.hasNext, false); assert.equal(render().navigation.hasPrevious, true);
  render().navigation.previous(); render(); await flush();
  assert.equal(q.calls[2].args[0], "page-1");
  q.calls[2].resolve(page(1, "next-1")); await flush(); assert.equal(render().data.length, 1);
  h.unmount();
});

test("filter changes discard earlier pages, errors and stale navigation callbacks", async () => {
  const { h, useCursorPage } = await pagingHarness(), a = queued(), b = queued();
  let load = a.run, scope = "A";
  const render = () => h.render(() => useCursorPage(load, scope));
  render(); await flush(); a.calls[0].resolve(page(1, "A-next")); await flush();
  const stale = render().navigation.next; render().navigation.next(); render(); await flush();
  load = b.run; scope = "B"; assert.equal(render().data.length, 0); await flush();
  a.calls[1].reject(Error("old page")); await flush();
  b.calls[0].resolve(page(3)); await flush();
  stale(); render(); await flush();
  assert.equal(a.calls.length, 2); assert.equal(b.calls.length, 1);
  assert.equal(render().data[0].id, 3); assert.equal(render().error, "");
  h.unmount();
});

test("page retry retains valid data and does not start duplicate reads", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const render = () => h.render(() => useCursorPage(q.run, "directory"));
  render(); await flush(); q.calls[0].resolve(page(1, "next")); await flush();
  render().navigation.next(); render(); await flush(); q.calls[1].reject(Error("offline")); await flush();
  assert.equal(render().data[0].id, 1); assert.equal(render().error, "offline");
  const a = render().refetch(), b = render().refetch(); assert.equal(a, b);
  await flush(); assert.equal(q.calls.length, 3); assert.equal(q.calls[2].args[0], "next");
  q.calls[2].resolve(page(2)); await a; assert.equal(render().data[0].id, 2);
  h.unmount();
});

test("confirmed collection reload restarts the snapshot and last-page state remains explicit", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const render = () => h.render(() => useCursorPage(q.run, "directory"));
  render(); await flush(); q.calls[0].resolve(page(1, "next")); await flush();
  render().navigation.next(); render(); await flush();
  q.calls[1].resolve({ ...page(2), results: [], total: 25 }); await flush();
  assert.equal(render().ready, true); assert.equal(render().navigation.count, 0);
  assert.equal(render().navigation.total, 25); assert.equal(render().navigation.hasPrevious, true);
  await render().reload(); render(); await flush(); assert.equal(q.calls[2].args[0], null);
  q.calls[2].resolve(page(3)); await flush(); assert.equal(render().data[0].id, 3);
  assert.equal(render().navigation.hasPrevious, false);
  h.unmount();
});

test("session change resets cursors and logout or unmount cannot publish a pending page", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const render = () => h.render(() => useCursorPage(q.run, "directory"));
  render(); await flush(); q.calls[0].resolve(page(1, "next")); await flush();
  render().navigation.next(); render(); await flush();
  h.session(); assert.equal(render().data.length, 0); await flush();
  assert.equal(q.calls[2].args[0], null); q.calls[1].resolve(page(9)); await flush();
  assert.equal(render().data.length, 0);
  h.session("gm-session-expired"); render(); await flush();
  q.calls[2].resolve(page(8)); await flush(); assert.equal(render().data.length, 0);
  h.unmount(); const changes = h.changes; await flush(); assert.equal(h.changes, changes);
});

test("disabled directory does not load and preserves the selected page across route departures", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  let enabled = true;
  const render = () => h.render(() => useCursorPage(q.run, "directory", enabled));
  render(); await flush(); q.calls[0].resolve(page(1, "next")); await flush();
  render().navigation.next(); render(); await flush(); q.calls[1].resolve(page(2)); await flush();
  enabled = false; render(); await flush(); assert.equal(q.calls.length, 2);
  enabled = true; render(); await flush(); assert.equal(q.calls[2].args[0], "next");
  q.calls[2].resolve(page(2)); await flush(); h.unmount();
});

test("project directory forwards every server filter and search changes cannot reuse the last page", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const { useProjectDirectory } = await h.load("../src/features/projects/useProjectDirectory.ts", {
    "../../hooks/useCursorPage": { useCursorPage }, "./services": { getProjects: q.run },
  });
  let filters = { search: "viejo", associated: true, available: false, area_id: 1, state_code: "OPEN" };
  const render = () => h.render(() => useProjectDirectory(filters));
  render(); await flush(); assert.equal(q.calls[0].args[0].available, false);
  assert.equal(q.calls[0].args[0].area_id, 1); q.calls[0].resolve(page(1, "next")); await flush();
  render().navigation.next(); render(); await flush(); assert.equal(q.calls[1].args[1], "next");
  filters = { ...filters, search: "nuevo", area_id: 2 }; render(); await flush();
  assert.equal(q.calls[2].args[1], null); q.calls[1].resolve(page(8)); q.calls[2].resolve(page(3)); await flush();
  assert.equal(render().data[0].id, 3); h.unmount();
});

test("accounts keep valid list data if the secondary catalog fails and send active=false to the service", async () => {
  const { h, useCursorPage } = await pagingHarness(), resource = await h.resource(), lists = queued(), areas = queued();
  const { useAccounts } = await h.load("../src/features/accounts/useAccounts.ts", {
    "../../hooks/useCursorPage": { useCursorPage }, "../../hooks/useRemoteResource": resource,
    "../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
    "../../core/services/accountService": { listAccounts: lists.run, listAccountAreas: areas.run, resendAccountInvitation: async () => ({ detail: "ok" }) },
  });
  const render = () => h.render(() => useAccounts({ search: "QA", active: false }));
  render(); await flush(); lists.calls[0].resolve(page(1)); areas.calls[0].reject(Error("areas failed")); await flush();
  assert.equal(render().accounts[0].id, 1); assert.equal(render().areaResource.error, "areas failed");
  assert.equal(lists.calls[0].args[0].active, false); h.unmount();
});

test("administrative mutation failures are surfaced without replay or automatic page reload", async () => {
  const { h, useCursorPage } = await pagingHarness(), lists = queued(), writes = queued();
  const { useRecoveryRequests } = await h.load("../src/features/recovery-requests/useRecoveryRequests.ts", {
    "../../hooks/useCursorPage": { useCursorPage }, "../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
    "../../core/services/accountService": { listRecoveryRequests: lists.run, issueAccountReset: writes.run },
  });
  const render = () => h.render(() => useRecoveryRequests());
  render(); await flush(); lists.calls[0].resolve(page(1)); await flush();
  const operation = render().issueReset(1); await render().issueReset(1);
  assert.equal(writes.calls.length, 1); writes.calls[0].reject(Error("409 en curso")); await operation;
  assert.equal(render().mutationError, "409 en curso"); assert.equal(render().busy, false);
  assert.equal(lists.calls.length, 1); h.unmount();
});

test("pager announces real filtered totals and gives an empty last page a usable previous action", async () => {
  const h = harness();
  const { default: Pager } = await h.load("../src/shared/PageNavigation.tsx");
  const html = renderToStaticMarkup(React.createElement(Pager, { label: "cuentas", navigation: {
    total: 25, count: 0, hasPrevious: true, hasNext: false, pending: false, next() {}, previous() {}, reload() {},
  } }));
  assert.match(html, /Paginación de cuentas/); assert.match(html, /0 en esta página · 25 resultados/);
  assert.match(html, /Anterior/); assert.match(html, /Actualizar listado/);
  assert.ok(!html.includes("200 proyectos"));
});


test("invitation hook preserves persisted-account failure semantics and never repeats an ambiguous write", async () => {
  const h = harness(), writes = queued(), events = [];
  class ApiError extends Error {}
  const auth = { ApiError, errorText: (e) => e.message, sessionVersion: () => 0 };
  const { useInvitation } = await h.load("../src/features/accounts/useInvitation.ts", {
    "../auth/api": auth,
    "../../hooks/useToast": { useToast: () => ({ addToast: (event) => events.push(event.title) }) },
    "../../core/services/accountService": { inviteAccount: writes.run },
  });
  let updated = 0, closed = 0;
  const render = () => h.render(() => useInvitation(() => { updated++; }, () => { closed++; }));
  const operation = render().invite({ email: "qa@example.invalid" });
  await render().invite({ email: "qa@example.invalid" }); assert.equal(writes.calls.length, 1);
  const failure = new ApiError("Cuenta pendiente"); failure.status = 503; failure.payload = { account_id: 12 };
  writes.calls[0].reject(failure); assert.equal(await operation, true);
  assert.equal(updated, 1); assert.equal(closed, 0); assert.equal(render().busy, false);
  const ambiguous = render().invite({ email: "otro@example.invalid" });
  writes.calls[1].reject(new ApiError("Red ambigua")); assert.equal(await ambiguous, false);
  assert.equal(updated, 1); assert.equal(writes.calls.length, 2);
  const late = render().invite({ email: "tarde@example.invalid" });
  h.unmount(); writes.calls[2].resolve({ detail: "ok" }); await late;
  assert.equal(updated, 1); assert.equal(closed, 0); assert.equal(events.length, 2);
});

test("collection reload supersedes a pending first-page read instead of sharing pre-mutation data", async () => {
  const { h, useCursorPage } = await pagingHarness(), q = queued();
  const render = () => h.render(() => useCursorPage(q.run, "directory"));
  render(); await flush();
  const older = q.calls[0], reload = render().reload();
  render(); await flush();
  assert.equal(q.calls.length, 2);
  assert.equal(q.calls[1].args[0], null);
  q.calls[1].resolve(page(2)); await flush();
  assert.equal(render().data[0].id, 2);
  older.resolve(page(1)); await reload; await flush();
  assert.equal(render().data[0].id, 2);
  assert.equal(render().error, "");
  h.unmount();
});
