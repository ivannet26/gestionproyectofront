import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/auth/api.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const user = (id = 1) => ({ id, name: "Sintético", role: "ADMINISTRADOR", areas: [], all_areas: false, permissions: { manage_accounts: true } });
const response = (payload, status = 200) => new Response(JSON.stringify(payload), { status });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function client(fetch, events = new EventTarget()) {
  const context = vm.createContext({ fetch, Headers, Response, Event, CustomEvent, document: { cookie: "" }, window: events });
  const module = new vm.SourceTextModule(compiled, { context, initializeImportMeta: meta => { meta.env = { VITE_API_BASE_URL: "http://isolated.invalid" }; } });
  await module.link(() => { throw new Error("Unexpected import"); });
  await module.evaluate();
  return module.namespace;
}

test("shares only simultaneous default GETs and refetches after completion", async () => {
  let calls = 0;
  const gate = deferred();
  const api = await client(async () => { calls++; await gate.promise; return response([{ id: 1 }]); });
  const a = api.apiRequest("admin/accounts/");
  const b = api.apiRequest("admin/accounts/");
  gate.resolve();
  await Promise.all([a, b]);
  assert.equal(calls, 1);
  await api.apiRequest("admin/accounts/");
  assert.equal(calls, 2);
});

test("staggered 401 responses retry the already renewed access without rotating twice", async () => {
  let refreshes = 0;
  const late = deferred();
  const api = await client(async (url, options) => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    if (url.endsWith("refresh/")) { refreshes++; return response({ access: "new-access", user: user() }); }
    if (!options.headers.get("Authorization")) {
      if (url.endsWith("late/")) await late.promise;
      return response({ detail: "Expired" }, 401);
    }
    return response({ ok: true });
  });
  const early = api.apiRequest("early/");
  const delayed = api.apiRequest("late/");
  await early;
  late.resolve();
  await delayed;
  assert.equal(refreshes, 1);
});

test("does not share POSTs, different namespaces or cancellable GETs", async () => {
  let calls = 0;
  const api = await client(async () => { calls++; return response({ ok: true }); });
  await Promise.all([
    api.apiRequest("same/", { method: "POST" }), api.apiRequest("same/", { method: "POST" }),
    api.apiRequest("same/"), api.apiRequest("same/", {}, true, "projects"),
    api.apiRequest("same/", { signal: new AbortController().signal }),
  ]);
  assert.equal(calls, 5);
});

test("rejects old reads and does not reuse them after clearing the session", async () => {
  const gate = deferred();
  let calls = 0;
  const api = await client(async () => { calls++; await gate.promise; return response({ ok: true }); });
  const old = api.apiRequest("accounts/");
  api.clearAccess();
  const fresh = api.apiRequest("accounts/");
  gate.resolve();
  await assert.rejects(old);
  await fresh;
  assert.equal(calls, 2);
});

test("failed refresh still expires the session and rejects protected data", async () => {
  const api = await client(async url => url.endsWith("csrf/") ? response({ csrf_token: "synthetic" }) : response({ detail: "Expired" }, 401));
  await assert.rejects(api.apiRequest("me/"), error => error.status === 401);
});

test("failed reads are removed instead of caching errors", async () => {
  let calls = 0;
  const api = await client(async () => { calls++; return response({ detail: "Unavailable" }, 503); });
  await assert.rejects(api.apiRequest("accounts/"));
  await assert.rejects(api.apiRequest("accounts/"));
  assert.equal(calls, 2);
});

test("a late refresh cannot replace a newer login", async () => {
  const started = deferred();
  const gate = deferred();
  const api = await client(async (url, options) => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    if (url.endsWith("refresh/")) { started.resolve(); await gate.promise; return response({ access: "old-access", user: user(1) }); }
    if (url.endsWith("login/")) return response({ access: "new-login", user: user(2) });
    return response({ authorization: options.headers.get("Authorization") });
  });
  const old = api.refreshSession();
  await started.promise;
  const logged = await api.login("synthetic@example.invalid", "synthetic");
  assert.equal(logged.id, 2);
  gate.resolve();
  await assert.rejects(old);
  assert.equal((await api.apiRequest("me/")).authorization, "Bearer new-login");
});

test("changed authorization invalidates old reads and notifies the interface", async () => {
  let profile = user();
  const gate = deferred();
  const events = new EventTarget();
  let updated;
  events.addEventListener("gm-session-updated", event => { updated = event.detail; });
  const api = await client(async url => {
    if (url.endsWith("csrf/")) return response({ csrf_token: "synthetic" });
    if (url.endsWith("login/") || url.endsWith("refresh/")) return response({ access: "synthetic-access", user: profile });
    await gate.promise;
    return response({ ok: true });
  }, events);
  await api.login("synthetic@example.invalid", "synthetic");
  const old = api.apiRequest("accounts/");
  profile = { ...user(), role: "TRABAJADOR", areas: [{ id: 2, name: "Área sintética" }], permissions: { manage_accounts: false } };
  assert.equal((await api.refreshSession()).role, "TRABAJADOR");
  assert.equal(updated.role, "TRABAJADOR");
  const fresh = api.apiRequest("accounts/");
  gate.resolve();
  await assert.rejects(old);
  await fresh;
});
