import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadModule(path, dependencies) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = dependencies[name];
    assert.ok(exports, `Unexpected import: ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

async function harness(initialFavorite = false) {
  const state = [];
  const effects = [];
  const requests = [];
  let index = 0;
  let updates = 0;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], (next) => { updates++; state[slot] = next; }];
    },
    useRef(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = { current: initial };
      return state[slot];
    },
    useEffect(effect) { if (!effects.length) effects.push(effect()); },
  };
  const { useProjectFavorite } = await loadModule("../src/features/projects/useProjectFavorite.ts", {
    react,
    "../auth/api": { errorText: (error) => error.message },
    "./services": { setProjectFavorite(id, favorite) {
      return new Promise((resolve, reject) => requests.push({ id, favorite, resolve, reject }));
    } },
  });
  return {
    requests,
    render() { index = 0; return useProjectFavorite(42, initialFavorite); },
    unmount() { effects[0](); },
    get updates() { return updates; },
  };
}

test("favorite waits for confirmation and blocks duplicate submissions before rerender", async () => {
  const hook = await harness();
  const initial = hook.render();
  const first = initial.toggle();
  await initial.toggle();
  assert.equal(hook.requests.length, 1);
  assert.equal(hook.requests[0].id, 42);
  assert.equal(hook.requests[0].favorite, true);
  assert.equal(hook.render().favorite, false);
  assert.equal(hook.render().pending, true);
  hook.requests[0].resolve({ is_favorite: true });
  await first;
  assert.equal(hook.render().favorite, true);
  assert.equal(hook.render().pending, false);
});

test("favorite can be removed and restores the action after completion", async () => {
  const hook = await harness(true);
  const operation = hook.render().toggle();
  assert.equal(hook.requests[0].favorite, false);
  hook.requests[0].resolve({ is_favorite: false });
  await operation;
  assert.equal(hook.render().favorite, false);
  assert.equal(hook.render().error, "");
});

test("failed requests retain the previous preference and allow retry", async () => {
  const hook = await harness(true);
  const operation = hook.render().toggle();
  hook.requests[0].reject(new Error("Servicio no disponible"));
  await operation;
  assert.equal(hook.render().favorite, true);
  assert.equal(hook.render().error, "Servicio no disponible");
  const retry = hook.render().toggle();
  assert.equal(hook.render().error, "");
  hook.requests[1].resolve({ is_favorite: false });
  await retry;
  assert.equal(hook.render().favorite, false);
});

test("late completion cannot update an unmounted project header", async () => {
  const hook = await harness();
  const operation = hook.render().toggle();
  hook.unmount();
  const updates = hook.updates;
  hook.requests[0].resolve({ is_favorite: true });
  await operation;
  assert.equal(hook.updates, updates);
});

test("preference state is not shared between user or project mounts", async () => {
  const first = await harness(true);
  const second = await harness(false);
  assert.equal(first.render().favorite, true);
  assert.equal(second.render().favorite, false);
});

test("favorite service uses existing authenticated transport and idempotent methods", async () => {
  const calls = [];
  const { setProjectFavorite } = await loadModule("../src/features/projects/services.ts", {
    "../auth/api": { apiRequest: (...args) => { calls.push(args); return Promise.resolve({ is_favorite: true }); } },
  });
  await setProjectFavorite(42, true);
  await setProjectFavorite(42, false);
  assert.deepEqual(calls.map(([path, options, retry, namespace]) => [path, options.method, retry, namespace]), [
    ["42/favorite/", "PUT", true, "projects"],
    ["42/favorite/", "DELETE", true, "projects"],
  ]);
});
