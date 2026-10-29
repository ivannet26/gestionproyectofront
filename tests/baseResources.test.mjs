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

test("resource distinguishes initial load, valid empty data, refresh and retained-content error; duplicate retries share work", async () => {
  const h = harness(), q = queued(), { useRemoteResource } = await h.resource();
  const render = () => h.render(() => useRemoteResource(q.run, "list"));
  assert.equal(render().loading, true); await flush(); assert.equal(q.calls.length, 1);
  q.calls[0].reject(Error("offline")); await flush();
  assert.equal(render().ready, false); assert.equal(render().loading, false); assert.equal(render().error, "offline");
  const one = render().refetch(), two = render().refetch(); assert.equal(one, two);
  await flush(); assert.equal(q.calls.length, 2);
  q.calls[1].resolve([]); await one; assert.equal(render().ready, true); assert.deepEqual(render().value, []);
  const next = render().refetch(); await flush(); assert.equal(render().refreshing, true);
  q.calls[2].reject(Error("later")); await next;
  assert.equal(render().ready, true); assert.deepEqual(render().value, []); assert.equal(render().error, "later");
  h.unmount();
});

test("worker area, active, availability and search filters reload and late success/error cannot replace the latest request", async () => {
  const h = harness(), q = queued(), resource = await h.resource();
  const { useWorkers } = await h.load("../src/features/workers/useWorkers.ts", {
    "../../hooks/useRemoteResource": resource, "../../core/services/workerService": { listWorkers: q.run },
  });
  let filters = { search: "A", disponible: false, area_id: 1, active: false };
  const render = () => h.render(() => useWorkers(filters));
  render(); await flush();
  assert.equal(q.calls[0].args[0].active, false); assert.equal(q.calls[0].args[0].area_id, 1);
  q.calls[0].resolve([{ id: 1 }]); await flush();
  filters = { ...filters, area_id: 2 }; render(); await flush();
  assert.equal(q.calls.length, 2); assert.equal(render().refreshing, true); assert.equal(render().data[0].id, 1);
  filters = { ...filters, active: true }; render(); await flush();
  q.calls[2].resolve([{ id: 3 }]); await flush(); assert.equal(render().data[0].id, 3);
  q.calls[1].reject(Error("old failure")); await flush();
  assert.equal(render().data[0].id, 3); assert.equal(render().error, "");
  filters = { ...filters, search: "B", disponible: true }; render(); await flush();
  filters = { ...filters, search: "C" }; render(); await flush();
  q.calls[4].resolve([{ id: 5 }]); await flush(); q.calls[3].resolve([{ id: 4 }]); await flush();
  assert.equal(render().data[0].id, 5);
  const count = q.calls.length; render(); render(); await flush(); assert.equal(q.calls.length, count);
  h.unmount();
});

test("session changes clear prior data, invalidate pending work, and expiration never starts another load", async () => {
  const h = harness(), q = queued(), { useRemoteResource } = await h.resource();
  const render = () => h.render(() => useRemoteResource(q.run, "private"));
  render(); await flush(); q.calls[0].resolve([{ id: 1 }]); await flush();
  render().refetch(); await flush();
  h.session(); assert.equal(render().value, null); await flush();
  q.calls[1].resolve([{ id: 99 }]); await flush(); assert.equal(render().value, null);
  q.calls[2].resolve([{ id: 2 }]); await flush(); assert.equal(render().value[0].id, 2);
  render().refetch(); await flush(); h.session("gm-session-expired"); assert.equal(render().value, null);
  await flush(); assert.equal(q.calls.length, 4);
  q.calls[3].reject(Error("prior login")); await flush();
  assert.equal(render().error, ""); assert.equal(render().pending, false);
  h.unmount(); const before = h.changes; h.session(); assert.equal(h.changes, before);
});

test("unmount before the scheduled effect sends no request and unmount during a read cannot update state", async () => {
  const h = harness(), q = queued(), { useRemoteResource } = await h.resource();
  h.render(() => useRemoteResource(q.run, "one")); h.unmount(); await flush(); assert.equal(q.calls.length, 0);
  const other = harness(), r = queued(), { useRemoteResource: useOther } = await other.resource();
  other.render(() => useOther(r.run, "two")); await flush(); other.unmount();
  const count = other.changes; r.calls[0].resolve([1]); await flush(); assert.equal(other.changes, count);
});

test("team identity clears the former team, independently retains valid detail when members fail, and stale callbacks stay inert", async () => {
  const h = harness(), details = queued(), members = queued(), removal = queued(), resource = await h.resource();
  const { useTeamDetail } = await h.load("../src/features/organization/Teams/useTeamDetail.ts", {
    "../../../hooks/useRemoteResource": resource,
    "../../../core/services/organizationService": { getTeamById: details.run, listTeamMembers: members.run, removeTeamMember: removal.run },
  });
  let id = 1; const render = () => h.render(() => useTeamDetail(id));
  render(); await flush(); details.calls[0].resolve({ id: 1 }); members.calls[0].resolve([{ id: 11 }]); await flush();
  const oldRefetch = render().refetch; assert.equal(render().team.id, 1);
  id = 2; assert.equal(render().team, null); assert.equal(render().members.length, 0); await flush();
  details.calls[1].resolve({ id: 2 }); members.calls[1].reject(Error("members unavailable")); await flush();
  assert.equal(render().team.id, 2); assert.equal(render().people.ready, false); assert.equal(render().people.error, "members unavailable");
  const retry = render().people.refetch(); await flush(); assert.equal(details.calls.length, 2); assert.equal(members.calls.length, 3);
  members.calls[2].resolve([{ id: 22 }]); await retry;
  const pending = render().removeMember(22); assert.equal(removal.calls.length, 1);
  id = 3; render(); await flush(); removal.calls[0].resolve(); await pending; await oldRefetch(); await flush();
  assert.equal(details.calls.length, 3); assert.equal(members.calls.length, 4);
  details.calls[2].resolve({ id: 3 }); members.calls[3].resolve([]); await flush();
  assert.equal(render().team.id, 3); assert.equal(render().people.ready, true);
  h.unmount();
});

test("profile loads only own specialties and minimal options; partial failure permits own-list recovery without repeating successful reads", async () => {
  const h = harness(), mine = queued(), options = queued(), writes = queued(), resource = await h.resource();
  const { useProfile } = await h.load("../src/features/profile/ProfileModal/useProfile.ts", {
    "../../../hooks/useRemoteResource": resource,
    "../../../core/services/workerService": { listMySpecialties: mine.run, listMySpecialtyOptions: options.run, addMySpecialty: writes.run, removeMySpecialty: writes.run },
  });
  const render = () => h.render(() => useProfile()); render(); await flush();
  mine.calls[0].resolve([{ id: 1, name: "Own", level: 1 }]); options.calls[0].reject(Error("catalog unavailable")); await flush();
  assert.equal(render().specialties[0].id, 1); assert.equal(render().mine.ready, true); assert.equal(render().options.error, "catalog unavailable");
  const retry = render().options.refetch(); await flush(); options.calls[1].resolve([{ id: 1 }, { id: 2 }]); await retry;
  assert.equal(mine.calls.length, 1); assert.equal(render().catalog.length, 1); assert.equal(render().catalog[0].id, 2);
  const removal = render().dropSpecialty(1); writes.calls[0].resolve(); await flush(); mine.calls[1].reject(Error("saved but read failed")); await removal;
  assert.equal(writes.calls.length, 1); assert.equal(render().specialties[0].id, 1); assert.equal(render().mine.error, "saved but read failed");
  const recover = render().mine.refetch(); await flush(); mine.calls[2].resolve([]); await recover;
  assert.equal(writes.calls.length, 1); assert.equal(options.calls.length, 2); assert.equal(render().specialties.length, 0);
  h.unmount();
});

test("profile with missing own data cannot write even if options loaded", async () => {
  const h = harness(), mine = queued(), options = queued(), writes = queued(), resource = await h.resource();
  const { useProfile } = await h.load("../src/features/profile/ProfileModal/useProfile.ts", {
    "../../../hooks/useRemoteResource": resource,
    "../../../core/services/workerService": { listMySpecialties: mine.run, listMySpecialtyOptions: options.run, addMySpecialty: writes.run, removeMySpecialty: writes.run },
  });
  const render = () => h.render(() => useProfile()); render(); await flush();
  mine.calls[0].reject(Error("missing")); options.calls[0].resolve([{ id: 2 }]); await flush();
  await assert.rejects(render().addSpecialty(2), /Actualiza/); assert.equal(writes.calls.length, 0);
  h.unmount();
});

test("worker service sends all effective filters, including false, through the central client", async () => {
  const h = harness(), calls = [];
  const service = await h.load("../src/core/services/workerService.ts", {
    "../../core/api/httpClient": { httpClient: { get: async (url) => { calls.push(url); return { data: [] }; } } },
  });
  await service.listWorkers({ search: " A ", disponible: false, area_id: 2, active: false });
  const url = new URL(calls[0], "http://qa.invalid/");
  assert.equal(url.searchParams.get("search"), "A"); assert.equal(url.searchParams.get("disponible"), "false");
  assert.equal(url.searchParams.get("area_id"), "2"); assert.equal(url.searchParams.get("active"), "false");
  await service.listMySpecialtyOptions(); assert.equal(calls[1], "workers/me/specialty-options/");
});

test("resource status announces loading and errors, keeps retry available and does not claim an empty list", async () => {
  const h = harness(), { default: Status } = await h.load("../src/shared/ResourceStatus.tsx");
  const markup = renderToStaticMarkup(React.createElement(Status, { label: "equipos", loading: false, ready: true, error: "offline", refetch() {} }));
  assert.match(markup, /role="alert"/); assert.match(markup, /Reintentar equipos/); assert.match(markup, /última carga/);
  assert.doesNotMatch(markup, /No hay equipos|Cargando/);
});

test("member lookup cannot write after modal unmount, team replacement or session change", async () => {
  for (const change of ["unmount", "team", "session"]) {
    const h = harness(), reads = queued(), writes = queued(), notifications = [];
    const { useTeamMemberAddition } = await h.load("../src/features/organization/Teams/useTeamMemberAddition.ts", {
      "../../../core/services/workerService": { listWorkers: reads.run },
      "../../../core/services/organizationService": { addTeamMember: writes.run },
    });
    let team = 1;
    const render = () => h.render(() => useTeamMemberAddition(team, () => notifications.push(team)));
    const operation = render().add("QA-1", "2026-10-28");
    assert.equal(render().busy, true);
    if (change === "unmount") h.unmount();
    if (change === "team") { team = 2; render(); }
    if (change === "session") h.session("gm-session-expired");
    const changes = h.changes;
    reads.calls[0].resolve([{ id: 1, code: "QA-1" }]);
    assert.equal(await operation, false);
    assert.equal(writes.calls.length, 0); assert.equal(notifications.length, 0);
    assert.equal(h.changes, changes);
    h.unmount();
  }
});

test("member addition shares no duplicate submit, reports failure, and ignores late completion after close", async () => {
  const h = harness(), reads = queued(), writes = queued(), notifications = [];
  const { useTeamMemberAddition } = await h.load("../src/features/organization/Teams/useTeamMemberAddition.ts", {
    "../../../core/services/workerService": { listWorkers: reads.run },
    "../../../core/services/organizationService": { addTeamMember: writes.run },
  });
  const render = () => h.render(() => useTeamMemberAddition(1, () => notifications.push(1)));
  let operation = render().add("QA", "2026-10-28");
  assert.equal(await render().add("QA", "2026-10-28"), false);
  reads.calls[0].reject(Error("No se pudo buscar"));
  assert.equal(await operation, false); assert.equal(render().error, "No se pudo buscar");
  operation = render().add("QA", "2026-10-28");
  reads.calls[1].resolve([{ id: 2, code: "QA" }]); await flush();
  assert.equal(writes.calls[0].args[0], 1); assert.equal(writes.calls[0].args[1].worker_id, 2);
  writes.calls[0].resolve({}); assert.equal(await operation, true); assert.equal(notifications.length, 1);
  operation = render().add("QA", "2026-10-28");
  reads.calls[2].resolve([{ id: 2, code: "QA" }]); await flush();
  h.unmount(); const changes = h.changes; writes.calls[1].resolve({});
  assert.equal(await operation, false); assert.equal(h.changes, changes); assert.equal(notifications.length, 1);
});

test("team member active filter reloads only members and discards older filter results", async () => {
  const h = harness(), details = queued(), members = queued(), resource = await h.resource();
  const { useTeamDetail } = await h.load("../src/features/organization/Teams/useTeamDetail.ts", {
    "../../../hooks/useRemoteResource": resource,
    "../../../core/services/organizationService": { getTeamById: details.run, listTeamMembers: members.run, removeTeamMember: async () => {} },
  });
  let includeInactive = true;
  const render = () => h.render(() => useTeamDetail(1, includeInactive));
  render(); await flush(); details.calls[0].resolve({ id: 1 }); members.calls[0].resolve([{ id: 1 }]); await flush();
  includeInactive = false; render(); await flush();
  assert.equal(members.calls[1].args[1], false); assert.equal(details.calls.length, 1);
  includeInactive = true; render(); await flush();
  assert.equal(members.calls[2].args[1], true);
  members.calls[2].resolve([{ id: 3 }]); await flush();
  members.calls[1].resolve([{ id: 2 }]); await flush();
  assert.equal(render().members[0].id, 3); assert.equal(details.calls.length, 1);
  h.unmount();
});


test("confirmed mutation invalidates an older in-flight read without replaying it or replacing newer data", async () => {
  const h = harness(), q = queued(), { useRemoteResource } = await h.resource();
  const render = () => h.render(() => useRemoteResource(q.run, "mutated-list"));
  render(); await flush(); q.calls[0].resolve([{ id: 1 }]); await flush();
  const old = render().refetch(); await flush();
  const confirmed = render().refetch(true); await flush();
  assert.equal(q.calls.length, 3);
  q.calls[2].resolve([{ id: 2 }]); await confirmed;
  q.calls[1].resolve([{ id: 99 }]); await old;
  assert.equal(render().value[0].id, 2);
  assert.equal(render().pending, false);
  assert.equal(q.calls.length, 3);
  h.unmount();
});
