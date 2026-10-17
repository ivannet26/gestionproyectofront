import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const origin = "http://127.0.0.1:4177";
const inter = (await readFile(new URL("../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", import.meta.url))).toString("base64");
const output = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(output, "Set GM_BROWSER_REPORT_DIR to an existing output directory");
const profile = await mkdtemp(path.join(tmpdir(), "gm-list-browser-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
let debugEvaluate;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [], errors = [], checks = [];
let readOnly = false;
let failedOnce = false;
const configuration = { template: "custom", revision: "a".repeat(64), can_configure: true, states: [
  { code: "PENDIENTE", name: "PENDIENTE", category: "not_started", color: "#ffff00" },
  { code: "EN_CURSO", name: "EN CURSO", category: "active", color: "#2563eb" },
  { code: "COMPLETADA", name: "CERRADO", category: "closed", color: "#111111" },
] };
configuration.available_states = configuration.states;
const user = { id: 1, name: "Administrador sintético", role: "ADMINISTRADOR", areas: [{ id: 1, name: "Desarrollo y pruebas" }], all_areas: true, permissions: { manage_accounts: true } };
const participants = [{ id: 1, name: "Ángela Ñúñez" }, { id: 2, name: "José" }, { id: 3, name: "Daniel Antony Sintético" }];
const project = () => ({ id: 42, name: "Proyecto sintético", description: "Prueba aislada de Lista", areas: user.areas,
  start_date: "2026-10-07", end_date: "2026-12-07", state_code: "PLANIFICADO", available: true, has_associated_workers: true,
  worker_edit: true, worker_state: !readOnly, worker_create: !readOnly, is_favorite: false,
  permissions: { manage: !readOnly, create_tasks: !readOnly }, participants, requirements: [], task_states: configuration });
const makeTask = (id, data = {}) => ({ id, parent_id: null, name: "Tarea sintética " + id, description: "",
  state_code: "PENDIENTE", state_name: "PENDIENTE", state_category: "not_started", state_color: "#ffff00", priority: null,
  created_at: "2026-10-07T12:00:00Z", start_date: "2026-10-07", due_date: null, responsible_id: null, responsible_name: null,
  labels: [], assignees: [], dependencies: [], transitions: [{ target: "EN_CURSO", reason_required: false }],
  permissions: { edit: true, assign: true, state: true, create_child: true, dependencies: true }, ...data });
let tasks = [makeTask(1, { assignees: participants.slice(0, 2), responsible_id: 1, responsible_name: participants[0].name }),
  makeTask(2, { parent_id: 1, name: "Subtarea sintética" }), makeTask(3)];
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
    if (url.hostname === "fonts.googleapis.com") {
      await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/css" }],
        body: Buffer.from('@font-face{font-family:Inter;font-style:normal;font-weight:400 600;src:url(data:font/woff2;base64,'+inter+') format("woff2")}').toString("base64") });
      return;
    }
    let payload = [], status = 200;
    const body = request.postData ? JSON.parse(request.postData) : undefined;
    requests.push({ method: request.method, path: url.pathname, body });
    if (url.pathname.endsWith("/csrf/")) payload = { csrf_token: "synthetic-csrf" };
    else if (url.pathname.endsWith("/refresh/")) payload = { access: "synthetic-access", user };
    else if (url.pathname === "/api/projects/catalogs/") payload = { areas: user.areas, states: configuration.states, priorities: [{ code: 1, name: "Urgente" }, { code: 2, name: "Alta" }, { code: 3, name: "Normal" }, { code: 4, name: "Baja" }] };
    else if (url.pathname === "/api/projects/") payload = [project()];
    else if (url.pathname === "/api/projects/42/") payload = project();
    else if (url.pathname === "/api/projects/43/") payload = { ...project(), id:43, name:"Otro proyecto sintético" };
    else if (url.pathname.endsWith("/tasks/")) {
      if (request.method === "POST") {
        await pause(250);
        if (body.name === "Falla sintética" && !failedOnce) { failedOnce = true; status = 400; payload = { due_date: ["Fecha sintética inválida"] }; }
        else {
          const target = configuration.states.find(s => s.code === body.state_code);
          const people = participants.filter(p => (body.responsible_ids ?? []).includes(p.id));
          payload = makeTask(100 + tasks.length, { ...body, state_name: target.name, state_category: target.category, state_color: target.color,
            responsible_id: people[0]?.id ?? null, responsible_name: people[0]?.name ?? null, assignees: people,
            labels: (body.labels ?? []).map((label, i) => ({ ...label, id: 1000 + i, requirement_id: null })) });
          tasks.push(payload);
          status = 201;
        }
      } else payload = tasks.map(t => readOnly ? { ...t, permissions: { ...t.permissions, state: false, assign: false } } : t);
    } else if (/\/tasks\/\d+\/$/.test(url.pathname) && request.method === "PATCH") {
      const id = Number(url.pathname.match(/\/tasks\/(\d+)/)[1]);
      tasks = tasks.map(t => t.id === id ? { ...t, ...body,
        ...(body.responsible_ids ? { assignees: participants.filter(p => body.responsible_ids.includes(p.id)), responsible_id: body.responsible_ids[0] ?? null,
          responsible_name: participants.find(p=>p.id===body.responsible_ids[0])?.name ?? null } : {}),
        ...(body.labels ? { labels: body.labels.map((label, i) => ({ ...label, id: 2000 + i, requirement_id: null })) } : {}),
      } : t);
      payload = tasks.find(t => t.id === id);
    }
    await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [
      { name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: origin },
      { name: "Access-Control-Allow-Credentials", value: "true" }, { name: "Access-Control-Allow-Headers", value: "Authorization,Content-Type,X-CSRFToken" },
      { name: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,PUT,DELETE,OPTIONS" },
    ], body: Buffer.from(JSON.stringify(payload)).toString("base64") });
  });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "http://localhost:8000/*" }, { urlPattern: "https://fonts.googleapis.com/*" }] });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  };
  debugEvaluate = evaluate;
  const waitFor = async (expression) => { for (let count = 0; count < 100; count++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(50); } throw new Error(`Timed out: ${expression}`); };
  const key = async (value, extra = {}) => { const code = value === "Enter" ? { code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 } : {}; await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, ...code, ...extra }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, ...extra }); };
  const input = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Input missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const screen = async (name) => { const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(path.join(output, name), Buffer.from(result.data, "base64")); };

  const click = (selector) => evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing '+ "+JSON.stringify(selector)+");e.click();return true})()");
  const textButton = (text, scope = ":popover-open") => evaluate("(()=>{const e=Array.from(document.querySelectorAll("+JSON.stringify(scope+" button")+")).find(b=>b.textContent.trim()==="+JSON.stringify(text)+");if(!e)throw Error('Missing button '+ "+JSON.stringify(text)+");e.click();return true})()");
  const quick = 'form[aria-label="Creación rápida de tarea"]';
  const openQuick = async (group = "state:PENDIENTE") => {
    await evaluate("Array.from(Array.from(document.querySelectorAll('[data-group-key]')).find(g=>g.dataset.groupKey==="+JSON.stringify(group)+").querySelectorAll('button')).find(b=>b.textContent.includes('Añadir tarea')).click()");
    await waitFor(quick ? "document.querySelector('"+quick+"')" : "false");
    await waitFor("document.activeElement?.name==='name'");
  };
  const geometry = () => evaluate(`(()=>{
    const f=document.querySelector('${quick}'), input=f.querySelector('input[name="name"]');
    const buttons=Array.from(f.querySelectorAll('fieldset>button')), save=buttons.at(-1);
    const badges=f.closest('[data-group-key]').querySelectorAll('table tbody tr td:last-child [data-state]');
    const badge=badges[badges.length-1], style=getComputedStyle(input);
    return {save:save.getBoundingClientRect().toJSON(),state:badge?.getBoundingClientRect().toJSON(),
      input:input.getBoundingClientRect().toJSON(),border:style.borderTopWidth,background:style.backgroundColor,
      outline:style.outlineStyle,focusBorder:style.borderBottomColor,focusBorderWidth:style.borderBottomWidth,focus:input.matches(':focus-visible'),overflow:document.documentElement.scrollWidth>innerWidth};
  })()`);
  const assertAligned = async () => {
    const result=await geometry();
    assert.ok(Math.abs(result.save.right-result.state.right)<1,JSON.stringify(result));
    assert.ok(Math.abs(result.save.y+result.save.height/2-result.input.y-result.input.height/2)<1,JSON.stringify(result));
    assert.equal(result.border,'0px'); assert.equal(result.background,'rgba(0, 0, 0, 0)');
    assert.equal(result.overflow,false);
    return result;
  };
  const visualSuccess = () => evaluate(`Array.from(document.querySelectorAll('main [role="status"]')).filter(e=>e.textContent.startsWith('Guardado:')).every(e=>getComputedStyle(e).position==='absolute'&&e.getBoundingClientRect().height<=1)`);
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: origin + "/proyectos/42" }); await send("Page.bringToFront");
  await waitFor("document.querySelector('[data-task-id=\"1\"]')");
  await evaluate('document.fonts.ready.then(()=>true)');
  await click('[aria-label="Expandir subtareas de Tarea sintética 1"]');
  await waitFor("document.querySelector('[data-task-id=\"2\"]')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('[data-task-id] td')).every(td=>getComputedStyle(td).borderBottomStyle==='solid'&&getComputedStyle(td).borderBottomWidth==='1px'&&getComputedStyle(td).borderBottomColor!=='rgba(0, 0, 0, 0)')"), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-state=\"PENDIENTE\"]')).backgroundColor"), "rgb(255, 255, 0)");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-state=\"PENDIENTE\"]')).color"), "rgb(0, 0, 0)");
  assert.equal(await evaluate("document.querySelectorAll('[data-task-id=\"1\"] button[aria-label=\"José\"]').length"), 1);
  await evaluate("document.querySelector('[data-task-id=\"1\"] button[aria-label=\"José\"]').focus()");
  await waitFor("Array.from(document.querySelectorAll('[role=\"tooltip\"]')).some(t=>!t.hidden && t.textContent==='José')");
  await screen("task-list-avatars-desktop.png");
  const avatarPoint = await evaluate("(()=>{const r=document.querySelector('[data-task-id=\"1\"] button[aria-label=\"Ángela Ñúñez\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...avatarPoint });
  await waitFor("Array.from(document.querySelectorAll('[role=\"tooltip\"]')).some(t=>!t.hidden && t.textContent==='Ángela Ñúñez')");
  await click('[data-task-id="3"] button[aria-label="Asignar responsable"]');
  await waitFor("document.querySelector('[popover]:popover-open [name=\"search\"]')");
  await key("Escape", { windowsVirtualKeyCode: 27 });
  checks.push("continuous neutral separators including subtasks; exact state color and contrast; real zero/single/multiple initials with mouse/focus names");
  const postCount = () => requests.filter(r=>r.method==="POST" && r.path.endsWith("/tasks/")).length;
  const pointer = async (selector, touch = false) => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (touch) {
      await send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{...point,radiusX:1,radiusY:1,force:1}] });
      await send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
    } else {
      await send("Input.dispatchMouseEvent", { type:"mousePressed", ...point, button:"left", clickCount:1 });
      await send("Input.dispatchMouseEvent", { type:"mouseReleased", ...point, button:"left", clickCount:1 });
    }
  };
  await pointer('[data-group-key="state:PENDIENTE"] button[id$="-create"]');
  await waitFor(`document.querySelector('${quick}')`);
  await input(quick+' input[name="name"]', "Descartar todo");
  await pointer('#task-list-grouping');
  await waitFor(`!document.querySelector('${quick}')`);
  await waitFor("document.querySelector(':popover-open')");
  assert.equal(await evaluate("document.activeElement.id==='task-list-grouping'||document.querySelector(':popover-open').contains(document.activeElement)"),true);
  await key("Escape",{windowsVirtualKeyCode:27});
  assert.equal(postCount(),0);
  await openQuick();
  assert.equal(await evaluate(`document.querySelector('${quick} input[name="name"]').value`),"");
  for (const label of ["Responsables:","Fecha límite:","Prioridad:","Etiquetas:"]) {
    const selector=quick+' button[aria-label^="'+label+'"]';
    await pointer(selector);
    await waitFor("document.querySelector(':popover-open')");
    await pointer(':popover-open input, :popover-open button');
    assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),true);
    if (!await evaluate("Boolean(document.querySelector(':popover-open'))")) await pointer(selector);
    await key("Escape",{windowsVirtualKeyCode:27});
    assert.equal(await evaluate("Boolean(document.querySelector(':popover-open'))"),false);
    assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(selector)})`),true);
    assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),true);
  }
  await input(quick+' input[name="name"]',"No guardar desde selector");
  await click(quick+' button[aria-label^="Responsables:"]');
  await key("Enter");
  assert.equal(postCount(),0);
  assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),true);
  await key("Escape",{windowsVirtualKeyCode:27});
  await key("Escape",{windowsVirtualKeyCode:27});
  await waitFor(`!document.querySelector('${quick}')`);
  await pause(30);
  assert.equal(await evaluate("document.activeElement.id.endsWith('-create')"),true);
  await openQuick();
  await key("Tab",{windowsVirtualKeyCode:9,code:"Tab"});
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label').startsWith('Responsables:')"),true);
  await key("Tab",{windowsVirtualKeyCode:9,code:"Tab",modifiers:8});
  assert.equal(await evaluate("document.activeElement.name"),"name");
  const tabOrder=["Responsables:","Fecha límite:","Prioridad:","Etiquetas:","Cancelar","Guardar"];
  for (const expected of tabOrder) {
    await key("Tab",{windowsVirtualKeyCode:9,code:"Tab"});
    assert.equal(await evaluate(`(document.activeElement.getAttribute('aria-label')??document.activeElement.textContent).startsWith(${JSON.stringify(expected)})`),true,expected);
  }
  await key("Tab",{windowsVirtualKeyCode:9,code:"Tab"});
  assert.equal(await evaluate(`document.querySelector('${quick}').contains(document.activeElement)`),false);
  await key("Tab",{windowsVirtualKeyCode:9,code:"Tab",modifiers:8});
  assert.equal(await evaluate("document.activeElement.textContent"),"Guardar");
  for (let count=0;count<6;count++) await key("Tab",{windowsVirtualKeyCode:9,code:"Tab",modifiers:8});
  assert.equal(await evaluate("document.activeElement.name"),"name");
  await key("Tab",{windowsVirtualKeyCode:9,code:"Tab",modifiers:8});
  assert.equal(await evaluate(`document.querySelector('${quick}').contains(document.activeElement)`),false);
  await key("Escape",{windowsVirtualKeyCode:27});
  await waitFor(`!document.querySelector('${quick}')`);
  await openQuick();
  await input(quick+' input[name="name"]',"Composición");
  await evaluate(`(()=>{const e=document.querySelector('${quick} input[name="name"]');e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',isComposing:true,bubbles:true}));e.form.requestSubmit();e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))})()`);
  assert.equal(postCount(),0);
  assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),true);
  await pointer('input[name="task_search"]');
  await waitFor(`!document.querySelector('${quick}')`);
  assert.equal(await evaluate("document.activeElement.name"),"task_search");
  await openQuick();
  await textButton("Guardar",quick);
  await waitFor(`document.querySelector('${quick} [role="alert"]')`);
  await input(quick+' input[name="name"]',"Borrador completo");
  await click(quick+' button[aria-label^="Responsables:"]'); await textButton("José"); await textButton("Listo");
  await click(quick+' button[aria-label^="Fecha límite:"]'); await click(':popover-open [data-date="2026-10-20"]');
  await click(quick+' button[aria-label^="Prioridad:"]'); await textButton("Alta");
  await click(quick+' button[aria-label^="Etiquetas:"]');
  await input(':popover-open input[name="label_name"]',"Descartada"); await textButton("Agregar");
  await key("Escape",{windowsVirtualKeyCode:27});
  await key("Escape",{windowsVirtualKeyCode:27});
  await waitFor(`!document.querySelector('${quick}')`);
  await openQuick();
  assert.equal(await evaluate(`document.querySelector('${quick} input[name="name"]').value`),"");
  assert.equal(await evaluate(`Boolean(document.querySelector('${quick} [role="alert"]'))`),false);
  for (const [label,empty] of [["Responsables:","Sin persona asignada"],["Fecha límite:","Sin fecha límite"],["Prioridad:","Sin prioridad"],["Etiquetas:","Sin etiquetas"]]) {
    assert.ok(await evaluate(`document.querySelector('${quick} button[aria-label^="${label}"]').getAttribute('aria-label').includes(${JSON.stringify(empty)})`),label);
  }
  await evaluate(`document.querySelector('${quick} button[aria-label^="Responsables:"]').focus()`);
  await waitFor(`document.getElementById(document.querySelector('${quick} button[aria-label^="Responsables:"]').getAttribute('aria-describedby'))?.parentElement===document.body`);
  await evaluate(`(()=>{const b=document.querySelector('${quick} button[aria-label^="Responsables:"]');document.getElementById(b.getAttribute('aria-describedby')).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))})()`);
  assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),true);
  await textButton("Cancelar",quick);
  await pause(30);
  assert.equal(await evaluate("document.activeElement.id.endsWith('-create')"),true);
  assert.equal(postCount(),0);
  checks.push("all optional draft values and validation errors reset on reopen; owned body-portal tooltip pointer event stays inside; button cancellation restores Add focus; Tab can leave the row");
  checks.push("physical opener/outside click keeps first grouping action and search focus; all four top-layer pickers stay owned; Escape levels restore triggers then Add; Tab/Shift+Tab and IME do not submit or cancel");
  await openQuick();
  await pause(60);
  const initialLayout=await assertAligned();
  assert.equal(initialLayout.focus,true); assert.equal(initialLayout.outline,'none');
  assert.equal(initialLayout.focusBorderWidth,'2px'); assert.notEqual(initialLayout.focusBorder,'rgba(0, 0, 0, 0)');
  assert.equal(await evaluate("Boolean(document.querySelector('"+quick+" button[aria-label^=\"Se creará en\"]'))"),false);
  await input(quick+' input[name="name"]', "Nombre largo ".repeat(13));
  await assertAligned();
  await send("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1050, deviceScaleFactor: 1, mobile: false });
  await pause(80); await assertAligned();
  await screen("task-list-quick-aligned-desktop.png");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await evaluate("(()=>{const r=document.querySelector('[role=\"region\"][aria-label^=\"Tabla de tareas\"]');r.scrollLeft=r.scrollWidth})()");
  await pause(80); await assertAligned();
  await evaluate("document.querySelector('[role=\"region\"][aria-label^=\"Tabla de tareas\"]').scrollLeft=0");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await pause(80);
  checks.push("frameless inline input with keyboard focus; Save aligns to actual State badge at two desktop widths, unchanged by long names");
  await input(quick+' input[name="name"]', "Cancelada sintética");
  await textButton("Cancelar", quick);
  assert.equal(postCount(), 0);
  await openQuick(); await input(quick+' input[name="name"]', "  Solo nombre  ");
  await key("Enter"); await waitFor("!document.querySelector('"+quick+"')");
  assert.equal(postCount(), 1);
  assert.equal(tasks.at(-1).name, "Solo nombre"); assert.equal(tasks.at(-1).priority, null); assert.equal(tasks.at(-1).due_date, null);
  assert.equal(tasks.at(-1).assignees.length, 0);
  assert.equal(await visualSuccess(),true);
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Lista de trabajo\"]').getBoundingClientRect().top-document.querySelector('main>header').getBoundingClientRect().bottom"),12);
  checks.push("inline autofocus, cancellation without writes and trimmed name-only Enter creation updates the same list");
  await openQuick("state:EN_CURSO");
  assert.equal(await evaluate("Boolean(document.querySelector('"+quick+" button[aria-label^=\"Se creará en PENDIENTE\"]'))"), true);
  await pause(60);
  assert.equal(await evaluate(`(()=>{const f=document.querySelector('${quick}'),p=f.querySelector('span[aria-hidden="true"]'),h=f.closest('[data-group-key]').querySelector('th:last-child'),s=Array.from(f.querySelectorAll('fieldset>button')).at(-1);return Math.abs(s.getBoundingClientRect().right-h.getBoundingClientRect().left-parseFloat(getComputedStyle(h).paddingLeft)-p.getBoundingClientRect().width)<1})()`),true);
  await screen("task-list-quick-fallback.png");
  await click(quick+' button[aria-label^="Responsables:"]');
  await waitFor("document.querySelector(':popover-open input[name=\"responsible_search\"]')");
  await textButton("José"); await textButton("Ángela Ñúñez"); await textButton("Listo");
  await waitFor("!document.querySelector('"+quick+" button[aria-label^=\"Se creará en\"]')");
  await click(quick+' button[aria-label^="Fecha límite:"]');
  await waitFor("document.querySelector(':popover-open [data-date=\"2026-10-20\"]')");
  await click(':popover-open [data-date="2026-10-20"]');
  await click(quick+' button[aria-label^="Fecha límite:"]'); await textButton("Quitar fecha");
  await click(quick+' button[aria-label^="Fecha límite:"]'); await click(':popover-open [data-date="2026-10-20"]');
  await click(quick+' button[aria-label^="Prioridad:"]'); await textButton("Alta");
  await click(quick+' button[aria-label^="Prioridad:"]'); await textButton("Sin prioridad");
  await click(quick+' button[aria-label^="Prioridad:"]'); await textButton("Alta");
  await click(quick+' button[aria-label^="Etiquetas:"]');
  await waitFor("document.querySelector(':popover-open input[name=\"label_name\"]')");
  await input(':popover-open input[name="label_name"]', "Etiqueta sintética"); await textButton("Agregar");
  await click(':popover-open button[aria-label="Retirar Etiqueta sintética"]');
  await input(':popover-open input[name="label_name"]', "Etiqueta sintética"); await textButton("Agregar");
  await key("Escape", { windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate("Boolean(document.querySelector('"+quick+"'))"), true);
  await input(quick+' input[name="name"]', "Con propiedades");
  await screen("task-list-quick-desktop.png");
  await evaluate("(()=>{const b=Array.from(document.querySelectorAll('"+quick+" button')).find(b=>b.textContent==='Guardar');b.click();b.click()})()");
  await pointer('input[name="task_search"]');
  await key("Escape",{windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`document.querySelector('${quick}').getAttribute('aria-busy')`),"true");
  await waitFor("!document.querySelector('"+quick+"')");
  assert.equal(postCount(), 2); assert.equal(tasks.at(-1).assignees.length, 2); assert.equal(tasks.at(-1).labels.length, 1);
  assert.equal(tasks.at(-1).state_code, "EN_CURSO"); assert.equal(tasks.at(-1).priority, 2); assert.equal(tasks.at(-1).due_date, "2026-10-20");
  const combinedId = tasks.at(-1).id;
  checks.push("all four reusable selectors select/clear/remove, Escape preserves draft, group state follows allowed attributes, duplicate Save creates once");
  checks.push("outside click and Escape during an already sent request do not discard or duplicate it; server result appears in the list");
  await click('[data-task-id="'+combinedId+'"] button[aria-label^="Prioridad ·"]');
  await textButton("Sin prioridad"); await textButton("Guardar");
  await waitFor("!document.querySelector(':popover-open')");
  assert.equal(tasks.find(t=>t.id===combinedId).priority, null);
  await click('[data-task-id="'+combinedId+'"] button[aria-label^="Fecha límite ·"]');
  await textButton("Quitar fecha"); await textButton("Guardar");
  await waitFor("!document.querySelector(':popover-open')");
  assert.equal(tasks.find(t=>t.id===combinedId).due_date, null);
  await click('[data-task-id="'+combinedId+'"] button[aria-label="José"]');
  await textButton("Sin responsable");
  await evaluate("Array.from(document.querySelectorAll(':popover-open button')).find(b=>Array.from(b.querySelectorAll('span')).some(s=>s.textContent==='José')).click()");
  await textButton("Guardar");
  await waitFor("!document.querySelector(':popover-open')");
  assert.deepEqual(tasks.find(t=>t.id===combinedId).assignees.map(p=>p.name), ["José"]);
  await click('[data-task-id="'+combinedId+'"] button[aria-label^="Etiquetas ·"]');
  await click(':popover-open [aria-label="Retirar Etiqueta sintética"]'); await textButton("Guardar");
  await waitFor("!document.querySelector(':popover-open')");
  assert.equal(tasks.find(t=>t.id===combinedId).labels.length, 0);
  assert.equal(await visualSuccess(),true);
  checks.push("creation and edits have only screen-reader success announcements with no banner or residual gap");
  checks.push("all optional properties remain editable after creation; date/priority/labels clear through existing PATCH and multi-assignment preserves real identity");
  await openQuick(); await input(quick+' input[name="name"]', "Falla sintética"); await textButton("Guardar", quick);
  await waitFor("document.querySelector('"+quick+" [role=\"alert\"]')");
  assert.equal(await evaluate("document.querySelector('"+quick+" input[name=\"name\"]').value"), "Falla sintética");
  assert.equal(await evaluate("document.querySelector('"+quick+" button[aria-label^=\"Fecha límite:\"]').getAttribute('aria-invalid')"), "true");
  await textButton("Guardar", quick); await waitFor("!document.querySelector('"+quick+"')");
  checks.push("field-specific failure preserves draft and retry succeeds");
  await click('[aria-label="Crear nueva tarea"]'); await waitFor("document.querySelector('dialog[open] input[name=\"name\"]')");
  assert.equal(await evaluate("document.querySelectorAll('"+quick+"').length"), 0);
  await textButton("Cancelar", "dialog[open]"); await waitFor("!document.querySelector('dialog[open]')");
  checks.push("upper-right + Tarea retains the complete modal form");
  await click('#task-list-grouping'); await click('button[aria-label^="Opciones de agrupación:"]');
  await waitFor("document.querySelectorAll('[role=\"menuitemradio\"]').length===5");
  await textButton("Persona asignada", '[role="menu"]');
  await key("Escape", { windowsVirtualKeyCode: 27 });
  await waitFor("document.querySelector('[data-group-key^=\"assignees:\"]')");
  const firstGroup = await evaluate("document.querySelector('[data-group-key]').dataset.groupKey");
  await openQuick(firstGroup); await input(quick+' input[name="name"]', "Grupo no estado");
  assert.equal(await evaluate("Boolean(document.querySelector('"+quick+" button[aria-label^=\"Se creará en\"]'))"), false);
  await textButton("Cancelar", quick);
  checks.push("five groupings remain and non-state creation uses configured initial identity, not group names");
  await click('#task-list-grouping'); await click('button[aria-label^="Opciones de agrupación:"]');
  await textButton("Estado", '[role="menu"]'); await key("Escape", { windowsVirtualKeyCode: 27 });
  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await openQuick("state:COMPLETADA");
  assert.equal(await evaluate("Boolean(document.querySelector('"+quick+" button[aria-label^=\"Se creará en PENDIENTE\"]'))"),true);
  assert.equal(await evaluate("document.querySelector('"+quick+" input[name=\"name\"]').getBoundingClientRect().width>=120"),true);
  await input(quick+' input[name="name"]', "Borrador móvil con un nombre largo ".repeat(4));
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
  await screen("task-list-quick-fallback-mobile.png");
  await textButton("Cancelar",quick);
  await openQuick();
  await pointer('#task-list-grouping',true);
  await waitFor(`!document.querySelector('${quick}')`);
  assert.equal(await evaluate("Boolean(document.querySelector(':popover-open'))"),true);
  await key("Escape",{windowsVirtualKeyCode:27});
  await openQuick();
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
  await screen("task-list-quick-mobile.png");
  const saveBounds = await evaluate("(()=>{const e=Array.from(document.querySelectorAll('"+quick+" button')).find(b=>b.textContent==='Cancelar');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,right:r.right}})()");
  assert.ok(saveBounds.right <= 375);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x:saveBounds.x, y:saveBounds.y, radiusX:1,radiusY:1,force:1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await waitFor("!document.querySelector('"+quick+"')");
  await send("Emulation.setDeviceMetricsOverride", { width: 812, height: 375, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
  checks.push("375px touch cancellation, visible inline actions and landscape layout without page overflow");
  assert.equal(requests.filter(r=>r.method==='GET' && r.path==='/api/projects/42/tasks/').length, 1);
  assert.equal(requests.filter(r=>r.method==='GET' && r.path==='/api/projects/42/').length, 1);
  checks.push("creation and edits update unique records without extra project/task reads or per-avatar requests");
  readOnly = true;
  await send("Page.reload"); await waitFor("document.querySelector('[data-task-id=\"1\"]')");
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Crear nueva tarea\"]'))"), false);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Añadir tarea'))"), false);
  assert.equal(await evaluate("document.querySelector('[data-task-id=\"1\"] button[aria-label^=\"Estado ·\"]').disabled"), true);
  checks.push("effective denied creation hides both accesses despite edit permission; state control respects its own permission");
  readOnly = false;
  await send("Page.reload"); await waitFor("document.querySelector('[aria-label=\"Crear nueva tarea\"]')");
  await send("Emulation.setDeviceMetricsOverride", { width:1920,height:1080,deviceScaleFactor:1,mobile:false });
  const beforeRegroup=postCount();
  await openQuick(); await input(quick+' input[name="name"]',"Resultado tras reagrupar");
  await textButton("Guardar",quick);
  await click('#task-list-grouping'); await click('button[aria-label^="Opciones de agrupación:"]');
  await textButton("Prioridad",'[role="menu"]');
  await waitFor("document.querySelector('[data-group-key^=\"priority:\"]')");
  await key("Escape",{windowsVirtualKeyCode:27});
  await waitFor("Array.from(document.querySelectorAll('[data-task-id]')).some(e=>e.innerText.includes('Resultado tras reagrupar'))");
  assert.equal(postCount(),beforeRegroup+1);
  await click('#task-list-grouping'); await click('button[aria-label^="Opciones de agrupación:"]');
  await textButton("Estado",'[role="menu"]'); await key("Escape",{windowsVirtualKeyCode:27});
  checks.push("regrouping during an in-flight creation retains its result in the original mounted List exactly once");
  await openQuick(); await input(quick+' input[name="name"]',"No llevar al otro proyecto");
  const beforeNavigation=postCount();
  await evaluate("history.pushState({},'', '/proyectos/43');dispatchEvent(new PopStateEvent('popstate'))");
  await waitFor("document.body.innerText.includes('Otro proyecto sintético')");
  assert.equal(await evaluate(`Boolean(document.querySelector('${quick}'))`),false);
  await openQuick();
  assert.equal(await evaluate(`document.querySelector('${quick} input[name="name"]').value`),"");
  await key("Escape",{windowsVirtualKeyCode:27});
  await waitFor(`!document.querySelector('${quick}')`);
  assert.equal(postCount(),beforeNavigation);
  checks.push("touch outside click also opens grouping; project navigation unmounts draft/listeners, next project starts clean without writes");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await writeFile(path.join(output, "task-list-browser-report.json"), JSON.stringify({ checks, requests, exceptions:errors, syntheticApi:true }, null, 2));
  console.log(JSON.stringify({ checks, exceptions:errors, syntheticApi:true }));
  await send("Browser.close").catch(()=>{});
} catch (error) {
  console.error(JSON.stringify({ requests, errors, body: await debugEvaluate?.("document.body.innerText") }));
  console.error(error.message);
  throw error;
} finally {
  socket?.close();
  chrome.kill();
  await pause(300);
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("gm-list-browser-")) await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}


