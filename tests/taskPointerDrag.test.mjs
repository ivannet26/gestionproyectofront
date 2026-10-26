import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

class Surface extends EventTarget {
  constructor(tag = "div", parent = null, attributes = {}) {
    super(); Object.assign(this, { tag, parent, ...attributes });
    this.listeners = new Map();
  }
  addEventListener(type, handler, options) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(handler); this.listeners.set(type, listeners);
    super.addEventListener(type, handler, options);
  }
  removeEventListener(type, handler, options) {
    this.listeners.get(type)?.delete(handler);
    super.removeEventListener(type, handler, options);
  }
  get listenerCount() { return [...this.listeners.values()].reduce((total, items) => total + items.size, 0); }
  closest(selector) {
    for (let node = this; node; node = node.parent) {
      if (selector.startsWith("[popover]")) { if (node.popover || node.editable) return node; }
      else if (["button", "input", "textarea", "select", "a", "summary"].includes(node.tag)) return node;
    }
    return null;
  }
  matches() { return this.tag === "button" && this.dragSurface === true; }
  contains(element) { for (let node = element; node; node = node.parent) if (node === this) return true; return false; }
}

async function harness() {
  const document = new Surface(), window = new Surface(), scroller = new Surface();
  document.getSelection = () => ({ removeAllRanges() {} });
  const region = { current: scroller }, row = new Surface("tr", scroller);
  const slots = [];
  let index = 0, drop = { state: "ACTIVE", before: 9, top: 10, left: 0, width: 200 };
  const calls = { start: [], track: [], over: [], end: [], propose: [], refresh: [] };
  let movement = Object.fromEntries(Object.keys(calls).map(name => [name, (...args) => calls[name].push(args)]));
  let locate = (x, y, task) => ({ ...drop, x, y, task: task.id });
  const react = {
    useRef(initial) { const slot = index++; return slots[slot] ??= { current: initial }; },
    useEffect(effect, deps) {
      const slot = index++;
      if (!slots[slot] || !deps.every((value, key) => Object.is(value, slots[slot].deps[key]))) {
        slots[slot]?.cleanup?.(); slots[slot] = { deps, cleanup: effect() };
      }
    },
  };
  const source = ts.transpileModule(readFileSync(new URL("../src/features/projects/TaskList/useTaskPointerDrag.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  const context = vm.createContext({ document, window, Element: Surface, setTimeout, clearTimeout });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(name => {
    assert.equal(name, "react");
    return new vm.SyntheticModule(Object.keys(react), function () { for (const [key, value] of Object.entries(react)) this.setExport(key, value); }, { context });
  });
  await module.evaluate();
  const task = { id: 4, parent_id: 2 };
  const render = () => { index = 0; return module.namespace.useTaskPointerDrag({ movement, locate, region }); };
  const down = (target = row, props = {}) => render().onPointerDown({ target, currentTarget: row, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, clientX: 10, clientY: 10, ...props }, task, props.enabled ?? true);
  const dispatch = (type, props = {}, target = document) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, buttons: type === "pointerup" ? 0 : 1, clientX: 16, clientY: 10, ...props });
    target.dispatchEvent(event); return event;
  };
  const click = detail => {
    const event = { detail, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    render().onClickCapture(event); return event;
  };
  return { calls, row, document, window, scroller, task, render, down, dispatch, click,
    setDrop(value) { drop = value; }, setMovement(value) { movement = value; render(); }, setLocate(value) { locate = value; render(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

test("a normal click remains a click and six pixels activates one confirmed movement", async () => {
  const hook = await harness();
  hook.down(); hook.dispatch("pointermove", { clientX: 15 }); hook.dispatch("pointerup", { clientX: 15 });
  assert.equal(hook.calls.start.length, 0); assert.equal(hook.calls.propose.length, 0);
  assert.equal(hook.click(1).prevented, false);
  hook.down(); hook.dispatch("pointermove");
  assert.equal(hook.calls.start.length, 1); assert.equal(hook.calls.track.length, 1);
  hook.dispatch("pointerup"); hook.dispatch("pointerup");
  assert.equal(hook.calls.end.length, 1); assert.equal(hook.calls.propose.length, 1);
  assert.equal(hook.calls.propose[0][0], hook.task);
  assert.equal(hook.calls.propose[0][0].parent_id, 2);
  assert.deepEqual(hook.calls.propose[0].slice(1), ["ACTIVE", 9]);
  const draggedClick = hook.click(1);
  assert.equal(draggedClick.prevented, true); assert.equal(draggedClick.stopped, true);
  hook.down(); hook.dispatch("pointerup");
  assert.equal(hook.click(1).prevented, false);
  hook.unmount();
});

test("interactive fields, non-primary pointers and touch never start drag; the explicit title surface may drag", async () => {
  const hook = await harness();
  for (const tag of ["button", "input", "textarea", "select", "a", "summary"]) {
    hook.down(new Surface(tag, hook.row)); hook.dispatch("pointermove"); hook.dispatch("pointerup");
  }
  for (const attributes of [{ popover: true }, { editable: true }]) {
    hook.down(new Surface("span", hook.row, attributes)); hook.dispatch("pointermove"); hook.dispatch("pointerup");
  }
  for (const props of [{ pointerType: "touch" }, { button: 2 }, { isPrimary: false }, { enabled: false }]) {
    hook.down(hook.row, props); hook.dispatch("pointermove"); hook.dispatch("pointerup");
  }
  assert.equal(hook.calls.start.length, 0);
  const title = new Surface("button", hook.row, { dragSurface: true });
  hook.down(new Surface("span", title)); hook.dispatch("pointermove"); hook.dispatch("pointerup");
  assert.equal(hook.calls.start.length, 1); assert.equal(hook.calls.propose.length, 1);
  hook.unmount();
});

test("Escape, pointer cancellation and blur cancel without writing or blocking the next ordinary click", async () => {
  for (const kind of ["Escape", "pointercancel", "blur"]) {
    const hook = await harness();
    hook.down(); hook.dispatch("pointermove");
    if (kind === "Escape") assert.equal(hook.dispatch("keydown", { key: "Escape" }).defaultPrevented, true);
    else hook.dispatch(kind, {}, kind === "blur" ? hook.window : hook.document);
    hook.dispatch("pointerup");
    assert.equal(hook.calls.propose.length, 0); assert.equal(hook.calls.end.length, 1);
    assert.equal(hook.document.listenerCount + hook.window.listenerCount + hook.scroller.listenerCount, 0);
    assert.equal(hook.click(0).prevented, false);
    hook.down(); hook.dispatch("pointerup"); assert.equal(hook.click(1).prevented, false);
    hook.unmount();
  }
});

test("stationary pointer scrolling and release recalculate position using current callbacks without duplicate listeners", async () => {
  const hook = await harness();
  hook.down(); hook.dispatch("pointermove");
  const listeners = hook.document.listenerCount;
  hook.setDrop({ state: "EMPTY", before: null });
  hook.dispatch("scroll", {}, hook.scroller);
  assert.equal(hook.calls.over.at(-1)[0].state, "EMPTY");
  hook.setLocate((x, y, task) => ({ state: "CLOSED", before: null, x, y, task: task.id }));
  assert.equal(hook.document.listenerCount, listeners);
  hook.dispatch("pointerup", { clientX: 40, clientY: 100 });
  assert.deepEqual(hook.calls.propose[0].slice(1), ["CLOSED", null]);
  assert.equal(hook.document.listenerCount, 0);
  hook.unmount();
});

test("unmount removes an active gesture; a denied proposal has no automatic refresh, replay or native drag", async () => {
  const hook = await harness();
  hook.down(); hook.dispatch("pointermove"); hook.unmount();
  hook.dispatch("pointerup");
  assert.equal(hook.calls.propose.length, 0); assert.equal(hook.document.listenerCount, 0);
  const second = await harness();
  let writes = 0;
  second.setMovement({ start() {}, track() {}, over() {}, end() {}, propose() { writes++; }, refresh() { throw Error("Unexpected replay"); }, error: "Conflicto 409" });
  second.down(); second.dispatch("pointermove"); second.dispatch("pointerup"); second.dispatch("pointerup");
  assert.equal(writes, 1);
  let prevented = false;
  second.render().onDragStart({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  second.unmount();
});

test("returning after a release outside the document cancels the gesture without saving", async () => {
  const hook = await harness();
  hook.down(); hook.dispatch("pointermove");
  hook.dispatch("pointermove", { buttons: 0 }); hook.dispatch("pointerup");
  assert.equal(hook.calls.propose.length, 0); assert.equal(hook.calls.end.length, 1);
  assert.equal(hook.document.listenerCount + hook.window.listenerCount + hook.scroller.listenerCount, 0);
  hook.unmount();
});
