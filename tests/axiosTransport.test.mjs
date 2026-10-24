import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import axios from "axios";
import ts from "typescript";

const user = (id = 1) => ({ id, name: "Sintético", role: "ADMINISTRADOR", areas: [], all_areas: true, permissions: { manage_accounts: true } });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function clients(adapter, fetchAuth, base = "https://isolated.invalid/gm///") {
  const events = new EventTarget(), seen = [], authCalls = [];
  let refreshes = 0, expired = 0;
  events.addEventListener("gm-session-expired", () => expired++);
  const context = vm.createContext({ Headers, Response, Event, CustomEvent, URLSearchParams, document: { cookie: "" }, window: events,
    fetch: async (url, options) => {
      authCalls.push({ url, options });
      if (url.endsWith("refresh/")) refreshes++;
      if (fetchAuth) return fetchAuth(url, options, refreshes);
      if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic-csrf" });
      return response({ access: url.endsWith("login/") ? "initial" : "renewed", user: user() });
    },
  });
  async function load(file, dependencies = {}) {
    const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText;
    const module = new vm.SourceTextModule(code, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: base }; } });
    await module.link(name => {
      const exports = dependencies[name]; assert.ok(exports, name);
      return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate(); return module.namespace;
  }
  const api = await load("../src/features/auth/api.ts");
  const { httpClient } = await load("../src/core/api/httpClient.ts", { axios: { default: axios }, "../../features/auth/api": api });
  httpClient.defaults.adapter = async config => {
    seen.push({ url: config.url, method: config.method, data: config.data ? JSON.parse(config.data) : undefined, authorization: config.headers.get("Authorization"), config });
    const result = await adapter(config, seen);
    const reply = { status: 200, statusText: "synthetic", headers: {}, data: {}, ...result, config };
    if (reply.status >= 400) throw new axios.AxiosError("Synthetic HTTP failure", "ERR_BAD_RESPONSE", config, null, reply);
    return reply;
  };
  const services = await load("../src/features/projects/services.ts", { "../../core/api/httpClient": { httpClient } });
  return { api, httpClient, services, seen, authCalls, events, get refreshes() { return refreshes; }, get expired() { return expired; },
    login: () => api.login("synthetic@example.invalid", "synthetic"),
  };
}

test("project services use central Axios with current routes, methods, object payloads and data contracts", async () => {
  const client = await clients(async config => ({ data: { url: config.url } }));
  await client.login();
  const service = client.services;
  const payload = { state_code: "S_1", before_id: null, expected_revision: "revision" };
  assert.equal((await service.moveTask(3, 8, payload)).url, "projects/3/tasks/8/move/");
  await service.changeTaskState(3, 8, { state_code: "S_2" });
  await service.updateTask(3, 8, { name: "Nuevo" });
  await service.configureProjectTaskStates(3, { template: "custom", revision: "current", states: [] });
  await service.createTaskRelation({ projectId: 3, taskId: 8 }, 9, "Relación");
  await service.removeTaskRelation({ projectId: 3, taskId: 8 }, 4);
  await service.changeDependency(3, 8, 9, true);
  await service.setProjectFavorite(3, false);
  assert.equal((await service.getWorkerCandidates([2, 5], "QA y BIM")).url, "projects/workers/?area_ids=2%2C5&q=QA+y+BIM");
  await service.getTaskSubtasks({ projectId: 3, taskId: 8 }, 30);
  assert.deepEqual(client.seen.slice(0, 8).map(item => item.method), ["post", "post", "patch", "patch", "post", "delete", "delete", "delete"]);
  assert.deepEqual(client.seen[0].data, payload);
  assert.deepEqual(client.seen[1].data, { state_code: "S_2" });
  assert.equal(client.seen[9].url, "projects/3/tasks/8/subtasks/?cursor=30");
  assert.ok(client.seen.every(item => item.authorization === "Bearer initial"));
  assert.ok(client.seen.every(item => item.config.withCredentials));
  assert.equal(client.seen[0].config.headers.get("X-CSRFToken"), "synthetic-csrf");
  assert.equal(client.httpClient.defaults.baseURL, "https://isolated.invalid/gm/api/");
  assert.equal(client.refreshes, 0);
});

test("default GETs share only simultaneous work; configured and cancellable requests stay independent", async () => {
  const gate = deferred(), started = deferred();
  const client = await clients(async () => { started.resolve(); await gate.promise; return { data: [] }; });
  await client.login();
  const a = client.services.getTasks(3), b = client.services.getTasks(3);
  await started.promise; assert.equal(client.seen.length, 1);
  gate.resolve(); await Promise.all([a, b]);
  await client.services.getTasks(3); assert.equal(client.seen.length, 2);
  await Promise.all([
    client.httpClient.get("projects/3/tasks/", { signal: new AbortController().signal }),
    client.httpClient.get("projects/3/tasks/", { signal: new AbortController().signal }),
    client.httpClient.get("projects/4/tasks/"),
  ]);
  assert.equal(client.seen.length, 5);
});

test("simultaneous and late 401s share renewal and reuse the already replaced token", async () => {
  const late = deferred();
  const client = await clients(async config => {
    if (config.headers.get("Authorization") === "Bearer initial") {
      if (config.url.endsWith("4/")) await late.promise;
      return { status: 401, data: { detail: "Expirado" } };
    }
    return { data: { ok: true } };
  });
  await client.login();
  const first = client.services.getProject(3), delayed = client.services.getProject(4), simultaneous = client.services.getProject(5);
  await Promise.all([first, simultaneous]); late.resolve(); await delayed;
  assert.equal(client.refreshes, 1);
  assert.equal(client.seen.length, 6);
  assert.equal(client.seen.filter(item => item.authorization === "Bearer renewed").length, 3);
});

test("400, 403 and 409 preserve ApiError status and fields without replaying writes", async () => {
  let status = 400;
  const client = await clients(async () => ({ status, data: { state_code: ["Destino inválido"], categories: { done: ["Añade un estado"] } } }));
  await client.login();
  for (status of [400, 403, 409]) {
    await assert.rejects(client.services.changeTaskState(3, 8, { state_code: "S_2" }), error => {
      assert.ok(error instanceof client.api.ApiError);
      assert.equal(error.status, status);
      assert.deepEqual(error.payload.categories, { done: ["Añade un estado"] });
      assert.equal(error.message, "Destino inválido"); return true;
    });
  }
  assert.equal(client.seen.length, 3); assert.equal(client.refreshes, 0);
});

test("ambiguous network failures do not replay a mutation and failed GETs are not cached", async () => {
  const client = await clients(async config => { throw new axios.AxiosError("Conexión interrumpida", "ERR_NETWORK", config); });
  await client.login();
  await assert.rejects(client.services.moveTask(3, 8, { state_code: "S_2", before_id: null, expected_revision: "original" }), error => error.status === undefined && error.message === "Conexión interrumpida");
  assert.equal(client.seen.length, 1);
  await assert.rejects(client.services.getTasks(3));
  await assert.rejects(client.services.getTasks(3));
  assert.equal(client.seen.length, 3); assert.equal(client.refreshes, 0);
});

test("logout discards an in-flight Axios result and clears its deduplication identity", async () => {
  const gate = deferred(), started = deferred();
  const client = await clients(async () => { started.resolve(); await gate.promise; return { data: { old: true } }; });
  await client.login();
  const old = client.services.getProject(3);
  await started.promise; client.api.clearAccess();
  const fresh = client.services.getProject(3);
  const rejected = assert.rejects(old, /La sesión cambió/);
  gate.resolve(); await Promise.all([rejected, fresh]);
  assert.equal(client.seen.length, 2); assert.equal(client.refreshes, 1);
});

test("logout before asynchronous interceptors run cannot send an old read or write under the new session", async () => {
  const client = await clients(async () => ({ data: {} }));
  await client.login();
  const oldRead = client.services.getProject(3);
  const oldWrite = client.services.updateTask(3, 8, { name: "No enviar" });
  client.api.clearAccess();
  await Promise.all([assert.rejects(oldRead, /La sesión cambió/), assert.rejects(oldWrite, /La sesión cambió/)]);
  assert.equal(client.seen.length, 0); assert.equal(client.refreshes, 0);
});

test("failed renewal expires the one shared session and never dispatches the replay", async () => {
  const client = await clients(async () => ({ status: 401, data: { detail: "Expirado" } }), async url => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    if (url.endsWith("login/")) return response({ access: "initial", user: user() });
    return response({ detail: "Sesión expirada" }, 401);
  });
  await client.login();
  await assert.rejects(client.services.getProject(3), error => error.status === 401);
  assert.equal(client.refreshes, 1); assert.equal(client.expired, 1);
  assert.equal(client.seen.length, 1); assert.equal(client.api.getAccessToken(), null);
});

test("a second 401 terminates after one replay rather than creating a retry cycle", async () => {
  const client = await clients(async () => ({ status: 401, data: { detail: "Sin autorización" } }));
  await client.login();
  await assert.rejects(client.services.getProject(3), error => error.status === 401);
  assert.equal(client.refreshes, 1); assert.equal(client.expired, 1); assert.equal(client.seen.length, 2);
});

test("permission changes during renewal prevent a replay under a different authorization epoch", async () => {
  const client = await clients(async () => ({ status: 401, data: { detail: "Expirado" } }), async url => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    return response({ access: "access", user: url.endsWith("login/") ? user() : { ...user(), role: "TRABAJADOR" } });
  });
  await client.login();
  await assert.rejects(client.services.getProject(3), /La sesión cambió/);
  assert.equal(client.refreshes, 1); assert.equal(client.expired, 0); assert.equal(client.seen.length, 1);
});

test("confirmed mutations invalidate shared GET work without reusing an older response", async () => {
  const gate = deferred(), started = deferred(); let reads = 0;
  const client = await clients(async config => {
    if (config.method !== "get") return { data: { id: 8, state_code: "NEW" } };
    const position = ++reads;
    if (position === 1) { started.resolve(); await gate.promise; }
    return { data: [{ id: 8, state_code: position === 1 ? "OLD" : "NEW" }] };
  });
  await client.login();
  const old = client.services.getTasks(3); await started.promise;
  await client.services.changeTaskState(3, 8, { state_code: "NEW" });
  const fresh = await client.services.getTasks(3);
  assert.equal(fresh[0].state_code, "NEW"); assert.equal(reads, 2);
  gate.resolve(); await old;
});

test("cold Axios and fetch calls use the same renewal promise and same-origin base fallback", async () => {
  const gate = deferred(); let started;
  const client = await clients(async () => ({ data: [] }), async url => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    if (url.endsWith("refresh/")) { started = true; await gate.promise; return response({ access: "shared", user: user() }); }
    return response({ ok: true });
  }, "");
  const fromAxios = client.services.getTasks(3);
  await flush(); assert.equal(started, true);
  const fromAuth = client.api.refreshSession();
  gate.resolve(); await Promise.all([fromAxios, fromAuth]);
  assert.equal(client.refreshes, 1);
  assert.equal(client.httpClient.defaults.baseURL, "/api/");
});
