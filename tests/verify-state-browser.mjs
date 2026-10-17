import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const origin = "http://127.0.0.1:4177";
const output = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(output, "Set GM_BROWSER_REPORT_DIR to an existing output directory");
const profile = await mkdtemp(path.join(tmpdir(), "gm-status-browser-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
let debugEvaluate;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [], errors = [], checks = [];
const activeNames = {
  normal: ["EN PROGRESO"], kanban: ["EN PROGRESO", "EN REVISIÓN"],
  marketing: ["CONCEPTO", "EN PROGRESO", "EN EJECUCIÓN", "EN REVISIÓN"],
  contenido: ["LISTO", "REDACTANDO", "APROBACIÓN", "RECHAZADO", "PUBLICADO"],
  scrum: ["PENDIENTE", "EN PROGRESO", "COMPLETADO", "EN REVISIÓN", "ACEPTADO", "RECHAZADO", "BLOQUEADO"],
};
let templates = Object.entries(activeNames).map(([id, names]) => ({ id, name: id[0].toUpperCase() + id.slice(1), preset: true, revision: 1,
  states: [{ name: "ABIERTO", category: "not_started", color: "#737373" },
    ...names.map((name) => ({ name, category: "active", color: "#2563eb" })),
    { name: "CERRADO", category: "closed", color: "#26834a" }],
}));
let configuration = { template: "custom", revision: "a".repeat(64), can_configure: true, usage: { PENDIENTE: 2 }, states: [
  { code: "PENDIENTE", name: "PENDIENTE", category: "not_started", color: "#737373" },
  { code: "EN_CURSO", name: "EN CURSO", category: "active", color: "#2563eb" },
  { code: "COMPLETADA", name: "CERRADO", category: "closed", color: "#26834a" },
] };
configuration.available_states = configuration.states;
const user = { id: 1, name: "Administrador sintético", role: "ADMINISTRADOR", areas: [{ id: 1, name: "Desarrollo y pruebas" }], all_areas: true, permissions: { manage_accounts: true } };
const project = () => ({ id: 42, name: "Proyecto sintético", description: "Prueba aislada de interfaz", areas: user.areas,
  start_date: "2026-10-07", end_date: "2026-12-07", state_code: "PLANIFICADO", available: true, has_associated_workers: true,
  worker_edit: true, worker_state: true, worker_create: true, is_favorite: false,
  permissions: { manage: true, create_tasks: true }, participants: [{ id: 1, name: "Ana Prueba" }, { id: 2, name: "Luis Prueba" }], requirements: [], task_states: configuration });
let tasks = [1, 2].map((id) => ({ id, parent_id: id === 2 ? 1 : null, name: id === 1 ? "Tarea sintética" : "Subtarea sintética", description: "",
  state_code: "PENDIENTE", state_name: "PENDIENTE", state_category: "not_started", state_color: "#737373", priority: 2,
  created_at: "2026-10-07T12:00:00Z", start_date: "2026-10-07", due_date: "2026-12-07", responsible_id: 1, responsible_name: "Ana Prueba",
  assignees: [{ id: 1, name: "Ana Prueba" }, { id: 2, name: "Luis Prueba" }], labels: [], dependencies: [], transitions: [],
  permissions: { edit: true, state: true, assign: true, create_child: true, dependencies: id === 1 } }));

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await pause(100); }
  }
  assert.ok(port, "Chrome did not start");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  }
  socket.addEventListener("message", async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const call = pending.get(message.id); pending.delete(message.id);
      if (message.error) call?.reject(new Error(JSON.stringify(message.error))); else call?.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Page.javascriptDialogOpening") await send("Page.handleJavaScriptDialog", { accept: true });
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    let payload = [];
    requests.push({ method: request.method, path: url.pathname });
    if (url.pathname.endsWith("/csrf/")) payload = { csrf_token: "synthetic-csrf" };
    else if (url.pathname.endsWith("/refresh/")) payload = { access: "synthetic-access", user };
    else if (url.pathname === "/api/projects/catalogs/") payload = { creation_date: "2026-10-16", areas: user.areas, states: configuration.states, priorities: [{ code: 1, name: "Urgente" }, { code: 2, name: "Alta" }, { code: 3, name: "Normal" }, { code: 4, name: "Baja" }] };
    else if (url.pathname === "/api/projects/") payload = [project()];
    else if (url.pathname === "/api/projects/42/") payload = project();
    else if (url.pathname.endsWith("/tasks/")) payload = tasks;
    else if (url.pathname.endsWith("/task-states/")) {
      if (request.method === "PATCH") {
        const data = JSON.parse(request.postData);
        configuration = { ...configuration, template: "custom", states: data.states, revision: "b".repeat(64) };
        for (const mapping of data.reassignments) tasks = tasks.map((task) => {
          const target = data.states.find((state) => state.code === mapping.target);
          return task.state_code === mapping.source ? { ...task, state_code: target.code, state_name: target.name, state_category: target.category, state_color: target.color } : task;
        });
      }
      payload = configuration;
    } else if (url.pathname.includes("/state-templates/")) {
      if (request.method === "POST") { payload = { ...JSON.parse(request.postData), id: 91, revision: 1, preset: false }; templates = [...templates, payload]; }
      else payload = templates;
    }
    await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [
      { name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: origin },
      { name: "Access-Control-Allow-Credentials", value: "true" }, { name: "Access-Control-Allow-Headers", value: "Authorization,Content-Type,X-CSRFToken" },
      { name: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,PUT,DELETE,OPTIONS" },
    ], body: Buffer.from(JSON.stringify(payload)).toString("base64") });
  });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "http://localhost:8000/*" }] });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  };
  debugEvaluate = evaluate;
  const waitFor = async (expression) => { for (let count = 0; count < 100; count++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(50); } throw new Error(`Timed out: ${expression}`); };
  const key = async (value, extra = {}) => { const code = value === "Enter" ? { code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 } : {}; await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, ...code, ...extra }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, ...extra }); };
  const clickText = async (text) => evaluate(`Array.from(document.querySelectorAll('dialog[open] button')).find(b=>b.textContent.trim()===${JSON.stringify(text)})?.click()`);
  const input = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Input missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const screen = async (name) => { const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(path.join(output, name), Buffer.from(result.data, "base64")); };
  const layout = () => evaluate(`(()=>{const d=Array.from(document.querySelectorAll('dialog[open]')).at(-1),f=d?.querySelector('footer');return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,dialog:d?.getBoundingClientRect().toJSON(),footer:f?.getBoundingClientRect().toJSON()}})()`);
  const footerVisible = () => evaluate(`(()=>{const f=document.querySelector('dialog[open] footer'),r=f.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&hit?.closest('footer')===f})()`);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${origin}/proyectos/42` });
  await waitFor(`document.querySelector('[aria-label="Ajustes de estados"]')`);
  await send("Page.bringToFront");
  assert.equal(await evaluate(`(()=>{const a=document.querySelector('[aria-label="Ajustes de estados"]').getBoundingClientRect(),b=document.querySelector('[aria-label="Contraer grupos"]').getBoundingClientRect();return a.right<=b.left&&Math.abs(a.y-b.y)<2})()`), true);
  checks.push("settings button immediately left of global expansion");
  await evaluate(`document.querySelector('[aria-label="Ajustes de estados"]').focus()`); await key("Enter", { windowsVirtualKeyCode: 13 });
  await waitFor(`document.querySelector('dialog[open] [aria-label="Añadir estado a Activo"]')`);
  checks.push("keyboard opens settings dialog");
  await evaluate(`document.querySelector('button[aria-haspopup="dialog"][aria-controls$="-templates"]').click()`);
  await input('[aria-label="Buscar plantillas"]', "no existe");
  await waitFor(`document.body.textContent.includes('No hay plantillas que coincidan.')`);
  await input('[aria-label="Buscar plantillas"]', ""); await clickText("Nueva plantilla");
  await waitFor(`document.querySelectorAll('dialog[open] ol li').length===0`);
  assert.equal(await evaluate(`document.querySelectorAll('dialog[open] button[aria-label^="Añadir estado a"]').length`), 4);
  checks.push("new template has four empty editable categories without writes");
  await evaluate(`document.querySelector('button[aria-haspopup="dialog"][aria-controls$="-templates"]').click()`);
  await input('[aria-label="Buscar plantillas"]', "Scrum"); await clickText("Scrum");
  await waitFor(`document.querySelector('dialog[open] [aria-label="Opciones de COMPLETADO"]')`);
  assert.equal(await evaluate(`document.querySelector('dialog[open] [aria-label="Opciones de COMPLETADO"]').closest('section').getAttribute('aria-label')`), "Activo");
  checks.push("search and Scrum COMPLETADO in Active, no automatic writes");
  assert.equal(requests.filter((item) => ["PATCH", "POST"].includes(item.method) && item.path.startsWith("/api/projects/")).length, 0);
  await screen("task-status-desktop.png");
  const desktop = await layout(); assert.equal(desktop.overflow, false); assert.ok(desktop.footer.bottom <= 980);
  await evaluate(`document.querySelector('[aria-label="Añadir estado a Activo"]').click()`);
  await input('[aria-label="Nombre del estado"]', "CONTROL SINTÉTICO"); await key("Enter", { windowsVirtualKeyCode: 13 });
  await waitFor(`document.querySelector('[aria-label="Opciones de CONTROL SINTÉTICO"]')`);
  await evaluate(`document.querySelector('[aria-label^="Reordenar CONTROL SINTÉTICO"]').focus()`); await key("ArrowUp", { modifiers: 1 });
  await waitFor(`document.querySelector('[aria-live="polite"]').textContent.includes('posición')`);
  checks.push("add state and keyboard reorder within Active");
  await evaluate(`Array.from(document.querySelector('section[aria-label="Activo"]').querySelectorAll('button')).find(b=>b.textContent.trim()==='Añadir estado').click()`);
  await input('[aria-label="Nombre del estado"]', "TEMPORAL SINTÉTICO"); await key("Enter", { windowsVirtualKeyCode: 13 });
  await evaluate(`document.querySelector('[aria-label="Opciones de TEMPORAL SINTÉTICO"]').click()`);
  await evaluate(`Array.from(document.querySelector('[aria-label="Opciones de TEMPORAL SINTÉTICO"]').parentElement.querySelectorAll('button')).find(b=>b.textContent.trim()==='Cambiar nombre').click()`);
  await input('[aria-label="Nombre del estado"]', "RENOMBRADO SINTÉTICO"); await key("Enter", { windowsVirtualKeyCode: 13 });
  await evaluate(`document.querySelector('[aria-label="Opciones de RENOMBRADO SINTÉTICO"]').click()`);
  await input('[aria-label="Color de RENOMBRADO SINTÉTICO"]', "#9333ea");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Opciones de RENOMBRADO SINTÉTICO"]').closest('li').querySelector('span[style]').style.color`), "rgb(147, 51, 234)");
  await evaluate(`(()=>{const source=document.querySelector('[aria-label^="Reordenar RENOMBRADO SINTÉTICO"]'),target=document.querySelector('[aria-label^="Reordenar CONTROL SINTÉTICO"]').closest('li'),dataTransfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));source.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer}))})()`);
  await evaluate(`Array.from(document.querySelector('[aria-label="Opciones de RENOMBRADO SINTÉTICO"]').parentElement.querySelectorAll('button')).find(b=>b.textContent.trim()==='Eliminar estado').click()`);
  await waitFor(`!document.querySelector('[aria-label="Opciones de RENOMBRADO SINTÉTICO"]')`);
  checks.push("dashed creation, rename, color, drag handler and deletion with focus recovery");
  await clickText("Guardar como plantilla");
  await waitFor(`document.querySelectorAll('dialog[open]').length===2`);
  await key("Escape", { windowsVirtualKeyCode: 27 });
  await waitFor(`document.querySelectorAll('dialog[open]').length===1`);
  assert.equal(await evaluate(`Boolean(document.activeElement.closest('dialog[open]'))`), true);
  await clickText("Guardar como plantilla");
  await waitFor(`document.querySelectorAll('dialog[open]').length===2`);
  await input('input[name="template_name"]', "Plantilla sintética de navegador"); await clickText("Guardar");
  await waitFor(`document.querySelectorAll('dialog[open]').length===1`);
  assert.equal(requests.filter((item) => item.method === "PATCH").length, 0);
  checks.push("secondary save dialog returns focus and does not apply flow");
  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await pause(150);
  const mobile = await layout(); assert.equal(mobile.overflow, false); assert.ok(mobile.dialog.width <= 375); assert.ok(mobile.footer.bottom <= 812);
  const hit = await evaluate(`(()=>{const b=document.querySelector('[aria-label="Añadir estado a Completado"]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...hit, radiusX: 1, radiusY: 1, force: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await waitFor(`document.querySelector('[aria-label="Nombre del estado"]')`);
  await input('[aria-label="Nombre del estado"]', "LISTO PARA CIERRE"); await key("Enter", { windowsVirtualKeyCode: 13 });
  await screen("task-status-mobile.png");
  assert.equal(await footerVisible(), true);
  checks.push("375px touch creation, fixed visible footer, no horizontal overflow");
  await send("Emulation.setDeviceMetricsOverride", { width: 812, height: 375, deviceScaleFactor: 1, mobile: true });
  await pause(100);
  assert.equal(await footerVisible(), true);
  assert.equal((await layout()).overflow, false);
  checks.push("landscape viewport retains visible footer without overflow");
  await key("Escape", { windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('dialog[open]')`);
  assert.equal(requests.filter((item) => item.method === "PATCH").length, 0);
  checks.push("discard confirmation closes without applying");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await input('input[name="task_search"]', "sin-resultados");
  await evaluate(`document.querySelector('[aria-label="Ajustes de estados"]').click()`);
  await waitFor(`document.querySelector('dialog[open] [aria-label="Añadir estado a Activo"]')`);
  await evaluate(`document.querySelector('button[aria-haspopup="dialog"][aria-controls$="-templates"]').click()`);
  await clickText("Plantilla sintética de navegador");
  await waitFor(`document.querySelector('section[aria-label="Reasignación de tareas"]')`);
  await evaluate(`(()=>{const e=document.querySelector('select[id*="-target-"]');e.value=Array.from(e.options).find(o=>o.text==='ABIERTO').value;e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  const detailReads = requests.filter((item) => item.path === "/api/projects/42/" && item.method === "GET").length;
  await clickText("Aplicar cambios");
  await waitFor(`!document.querySelector('dialog[open]')`);
  await waitFor(`document.querySelector('[data-group-key]')?.textContent.includes('ABIERTO')`);
  assert.equal(await evaluate(`document.querySelector('input[name="task_search"]').value`), "sin-resultados");
  assert.equal(await evaluate(`document.querySelectorAll('[data-group-key]').length`), templates.find((item) => item.id === 91).states.length);
  assert.equal(requests.filter((item) => item.path === "/api/projects/42/" && item.method === "GET").length, detailReads);
  assert.equal(requests.filter((item) => item.method === "PATCH").length, 1);
  checks.push("explicit reassignment applies once, preserves search and empty groups without a project reload");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await writeFile(path.join(output, "task-status-browser-report.json"), JSON.stringify({ checks, desktop, mobile, requests, exceptions: errors, syntheticApi: true }, null, 2));
  console.log(JSON.stringify({ checks, exceptions: errors, syntheticApi: true }));
  await send("Browser.close").catch(() => {});
} catch (error) {
  console.error(JSON.stringify({ requests, errors, body: await debugEvaluate?.("document.body.innerText") }));
  console.error(error.message);
  throw error;
} finally {
  socket?.close();
  chrome.kill();
  await pause(300);
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("gm-status-browser-")) await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
