import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = process.env.GM_BROWSER_REPORT_DIR && path.join(process.env.GM_BROWSER_REPORT_DIR, 'visual-refinement');
assert.ok(output && process.env.GM_QA_SECRETS_PATH);
await mkdir(output, { recursive: true });
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, 'utf8'));
const context = credentials.context;
const profile = await mkdtemp(path.join(tmpdir(), 'gm-task-detail-chrome-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], errors = [], requests = [], pending = new Map(), network = new Map();
let socket, evaluate, capture, token, sequence = 0;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) { try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await pause(100); } }
  assert.ok(port, 'Chrome no inició');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item?.reject(Error(message.error.message)); else item?.resolve(message.result); return; }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request;
      if (request.url.startsWith('http://localhost:8819/api/')) network.set(message.params.requestId, { path: new URL(request.url).pathname, method: request.method });
    }
    if (message.method === 'Network.responseReceived') { const entry = network.get(message.params.requestId); if (entry) entry.status = message.params.response.status; }
    if (message.method === 'Network.loadingFinished') {
      const entry = network.get(message.params.requestId);
      if (!entry) return;
      requests.push({ ...entry });
      if (entry.path.endsWith('/auth/login/') && entry.status === 200) {
        const body = await send('Network.getResponseBody', { requestId: message.params.requestId });
        token = JSON.parse(body.body).access;
      }
    }
  });
  evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { for (let attempt = 0; attempt < 140; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); } throw Error('Tiempo agotado: ' + expression); };
  const act = async expression => { const point = await evaluate(`(()=>{const e=${expression};if(!e)throw Error('Control ausente: '+${JSON.stringify(expression)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }); await pause(60); };
  const click = selector => act(`document.querySelector(${JSON.stringify(selector)})`);
  const button = (text, scope = 'document') => act(`Array.from(${scope === 'document' ? 'document' : `document.querySelector(${JSON.stringify(scope)})`}.querySelectorAll('button')).find(e=>e.getClientRects().length&&e.textContent.trim().endsWith(${JSON.stringify(text)}))`);
  const input = async (selector, text) => { await click(selector); await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); };
  const key = async (value, shift = false) => { const codes = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ' ': 32 }; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, windowsVirtualKeyCode: codes[value], modifiers: shift ? 8 : 0, ...(value === 'Enter' ? { code: 'Enter', text: '\r', unmodifiedText: '\r', nativeVirtualKeyCode: 13 } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, windowsVirtualKeyCode: codes[value], modifiers: shift ? 8 : 0 }); await pause(70); };
  const request = async (route, options = {}) => { const response = await fetch('http://localhost:8819/api/projects/' + route, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }); const result = response.status === 204 ? null : await response.json(); return { status: response.status, data: result }; };
  const detail = async (project = context.project, task = context.task) => (await request(`${project}/tasks/${task}/`)).data.task;
  const history = async () => (await request(`${context.project}/tasks/${context.task}/activity/`)).data.items;
  const save = async () => { await button('Guardar', ':popover-open'); await wait('!document.querySelector(":popover-open")'); };
  const login = async role => {
    token = undefined; await send('Network.clearBrowserCookies'); await send('Page.navigate', { url: 'http://localhost:5189/proyectos' });
    await wait('document.querySelector("#login-email")'); await input('#login-email', credentials[role].email); await input('#login-password', credentials[role].password);
    await click('form button[type="submit"]'); await wait('document.querySelector("aside")');
    for (let attempt = 0; attempt < 100 && !token; attempt++) await pause(50);
    assert.ok(token, 'Sesión real no disponible');
  };
  const open = async (project = context.project, task = context.task) => {
    await send('Page.navigate', { url: `http://localhost:5189/proyectos/${project}` }); await wait(`document.querySelector('[data-task-id="${task}"]')`);
    await act(`Array.from(document.querySelector('[data-task-id="${task}"]').querySelectorAll('button')).find(e=>e.textContent.trim()&& !e.getAttribute('aria-label'))`);
    await wait('document.querySelector("dialog[open] h1")');
    await wait('!document.querySelector("dialog").innerText.includes("Cargando")');
  };
  const field = label => click(`dialog section[aria-label="Propiedades de la tarea"] button[aria-label^="${label}"]`);
  capture = async name => { const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path.join(output, name), Buffer.from(image.data, 'base64')); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await login('admin'); await open();
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Ingeniería.*pruebas aisladas/);
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Completadas: 1 de 2/);
  await click('dialog aside summary'); assert.ok(await evaluate('Boolean(document.querySelector("dialog aside details[open]"))'));
  assert.match(await evaluate('document.querySelector("dialog aside details[open]").innerText'), /duración estimada/); await click('dialog aside summary');
  checks.push('Apertura real desde Lista, contexto, dos responsables y progreso global 1/2');
  await button('Ocultar subtareas cerradas (1)', 'dialog'); assert.equal(await evaluate(`document.querySelector('dialog section[aria-label="Subtareas"]').innerText.includes('Cálculo aprobado')`), false);
  await button('Mostrar subtareas cerradas (1)', 'dialog');
  await click('dialog button[aria-label^="Editar nombre:"]'); await input('#detail-task-name', '  Revisión de planos guardada  '); await button('Guardar nombre', 'dialog');
  await wait('document.querySelector("dialog h1")?.textContent.includes("guardada")'); assert.equal((await detail()).name, 'Revisión de planos guardada');
  const beforeInvalid = (await history()).length;
  await click('dialog button[aria-label^="Editar nombre:"]'); await input('#detail-task-name', '   '); await button('Guardar nombre', 'dialog');
  assert.match(await evaluate('document.querySelector("dialog [role=alert]").textContent'), /nombre/); await key('Escape');
  await click('dialog button[aria-label^="Editar nombre:"]'); await button('Guardar nombre', 'dialog'); assert.equal((await history()).length, beforeInvalid);
  await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', '-1'); await button('Guardar', ':popover-open');
  assert.match(await evaluate('document.querySelector(":popover-open [role=alert]").textContent'), /enteras positivas/); await key('Escape'); assert.equal((await history()).length, beforeInvalid);
  const beforeDuration = requests.filter(r => r.method === 'PATCH').length;
  await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', '90'); await button('Guardar', ':popover-open');
  assert.match(await evaluate('document.querySelector(":popover-open [role=alert]").textContent'), /unidad/);
  await key('Escape'); assert.equal(requests.filter(r => r.method === 'PATCH').length, beforeDuration);
  for (const [text, minutes] of [['2 d', 960], ['4 h', 240], ['1 d 4 h', 720], ['90 min', 90]]) {
    await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', text); await save(); assert.equal((await detail()).estimated_minutes, minutes);
  }
  await field('Duración estimada'); assert.equal(await evaluate('document.querySelector(":popover-open input").value'), '1 h 30 min');
  const beforeNoop = requests.filter(r => r.method === 'PATCH').length, beforeNoopHistory = (await history()).length;
  await save(); assert.equal(requests.filter(r => r.method === 'PATCH').length, beforeNoop); assert.equal((await history()).length, beforeNoopHistory);
  await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', '1 d 4 h'); await button('Cancelar', ':popover-open');
  assert.equal((await detail()).estimated_minutes, 90); assert.equal(requests.filter(r => r.method === 'PATCH').length, beforeNoop);
  await field('Duración estimada'); await button('Quitar estimación', ':popover-open'); await wait('!document.querySelector(":popover-open")'); assert.equal((await detail()).estimated_minutes, null);
  await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', ''); await save(); assert.equal((await detail()).estimated_minutes, null);
  await field('Duración estimada'); await input(':popover-open input[name="estimated_minutes"]', '1 d 4 h'); await key('Enter'); await wait('!document.querySelector(":popover-open")'); assert.equal((await detail()).estimated_minutes, 720);
  checks.push('Duración con unidades: días/horas/minutos, 90→1 h 30 min, rechazo de número sin unidad, cancelar/sin cambios sin PATCH, quitar y vacío→null, Enter y persistencia real');
  await field('Prioridad'); await button('Alta', ':popover-open'); await save(); assert.equal((await detail()).priority, 2);
  await field('Fecha límite'); await click(':popover-open [data-date]:not(:disabled)'); await save(); assert.ok((await detail()).due_date);
  await field('Fecha límite'); await button('Quitar fecha', ':popover-open'); await save(); assert.equal((await detail()).due_date, null);
  const beforeInvalidDate = (await history()).length, startBefore = (await detail()).start_date;
  await field('Fecha de inicio'); await act(`Array.from(document.querySelectorAll(':popover-open [data-date]:not(:disabled)')).find(e=>e.dataset.date>${JSON.stringify(startBefore)})`); await button('Guardar', ':popover-open');
  await wait('document.querySelector(":popover-open [role=alert]")'); assert.equal((await detail()).start_date, startBefore); assert.equal((await history()).length, beforeInvalidDate);
  await key('Escape'); assert.equal(await evaluate('Boolean(document.querySelector("dialog[open]"))'), true);
  await field('Etiquetas'); await button('Ingeniería civil', ':popover-open'); await save(); assert.equal((await detail()).labels[0].specialty_id, context.specialties[0]);
  await click('dialog section[aria-label="Propiedades de la tarea"] button[aria-label="Ángela QA worker"]');
  await button('Sin responsable', ':popover-open'); await save(); assert.equal((await detail()).assignees.length, 0);
  await click('dialog button[aria-label="Asignar responsable"]'); await button('Ángela QA worker', ':popover-open'); await save(); assert.equal((await detail()).assignees.length, 1);
  await click('dialog section[aria-label="Propiedades de la tarea"] button[aria-label="Ángela QA worker"]'); await button('José QA second', ':popover-open'); await save(); assert.equal((await detail()).assignees.length, 2);
  checks.push('Nombre, estimación, prioridad, calendario opcional, etiquetas y asignación cero/uno/varios persistidos en MySQL');
  const beforeCancel = (await history()).length;
  await button('+ Añadir tarea', 'dialog'); await wait('document.activeElement?.name==="name"');
  await input('dialog form[aria-label="Creación rápida de tarea"] input[name="name"]', 'Descartar borrador'); await key('Tab'); await key('Tab', true); await key('Escape');
  await wait(`!document.querySelector('dialog form[aria-label="Creación rápida de tarea"]')`); assert.equal(await evaluate('document.activeElement.textContent.trim()'), '+ Añadir tarea');
  await button('+ Añadir tarea', 'dialog'); assert.equal(await evaluate(`document.querySelector('dialog input[name="name"]').value`), '');
  await click('dialog form button[aria-label^="Fecha límite"]'); await key('Escape'); assert.ok(await evaluate('Boolean(document.querySelector("dialog form"))')); await key('Escape');
  await button('+ Añadir tarea', 'dialog'); await click('dialog button[aria-label^="Editar nombre:"]'); await wait('document.querySelector("#detail-task-name")');
  assert.equal(await evaluate(`Boolean(document.querySelector('dialog form[aria-label="Creación rápida de tarea"]'))`), false); await key('Escape');
  assert.equal((await history()).length, beforeCancel);
  await button('+ Añadir tarea', 'dialog'); await input('dialog input[name="name"]', 'Subtarea inline persistida'); await key('Enter'); await key('Enter');
  await wait('document.querySelector("dialog").innerText.includes("Subtarea inline persistida")');
  assert.equal((await request(`${context.project}/tasks/`)).data.filter(task => task.name === 'Subtarea inline persistida').length, 1);
  await button('Verificar estructura', 'dialog'); await wait('document.querySelector("dialog h1")?.textContent.includes("Verificar estructura")');
  const childBefore = await detail(context.project, context.child);
  await field('Fecha de inicio'); await act(`Array.from(document.querySelectorAll(':popover-open [data-date]:not(:disabled)')).find(e=>e.dataset.date>${JSON.stringify(childBefore.start_date)})`); await save();
  assert.ok((await detail(context.project, context.child)).start_date > childBefore.start_date);
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Subtarea de/); await button('Revisión de planos guardada', 'dialog');
  await wait('document.querySelector("dialog h1")?.textContent.includes("guardada")');
  checks.push('Creación rápida: foco, Tab/Shift+Tab, Escape por capas, clic externo no consumido, borrador limpio, sin escrituras al cancelar y Enter sin duplicados');
  await field('Estado'); await button('EN CURSO', ':popover-open'); await save(); assert.equal((await detail()).state_code, 'EN_CURSO');
  await click('dialog button[aria-label^="Relacionar elementos"]'); await button('Esta tarea bloquea...', ':popover-open'); await wait(`document.querySelector('input[name="related_search"]')`);
  await input('input[name="related_search"]', 'Informe técnico'); await wait(`document.querySelectorAll('[data-candidate]:not(:disabled)').length===1 && document.querySelector('[aria-label="Vincular Informe técnico"]:not(:disabled)')`); await key('ArrowDown'); await key('Enter');
  await wait('!document.querySelector(":popover-open")');
  let links = (await request(`${context.project}/tasks/${context.task}/relations/`)).data.items;
  assert.equal(links.find(link => link.target_id === context.related).kind, 'blocks');
  const reverse = await request(`${context.project}/tasks/${context.related}/dependencies/`, { method: 'POST', body: JSON.stringify({ predecessor_id: context.task }) }); assert.equal(reverse.status, 400);
  const cycle = await request(`${context.project}/tasks/${context.task}/dependencies/`, { method: 'POST', body: JSON.stringify({ predecessor_id: context.related }) }); assert.equal(cycle.status, 400);
  await click('dialog button[aria-label^="Relacionar elementos"]'); await button('Nueva relación personalizada', ':popover-open');
  await input('input[name="relation_name"]', 'Referencia QA'); await input('input[name="related_search"]', 'Informe técnico');
  await wait(`document.querySelectorAll('[data-candidate]:not(:disabled)').length===1 && document.querySelector('[aria-label="Vincular Informe técnico"]:not(:disabled)')`); await click('[aria-label="Vincular Informe técnico"]'); await wait('!document.querySelector(":popover-open")');
  await wait(`document.querySelector('dialog section[aria-label="Relaciones"]').innerText.includes('Referencia QA')`);
  await act(`Array.from(document.querySelectorAll('dialog section[aria-label="Relaciones"] li')).find(e=>e.innerText.includes('Referencia QA')).querySelectorAll('button')[1]`);
  await button('Confirmar desvinculación', 'dialog'); await wait(`!document.querySelector('dialog section[aria-label="Relaciones"]').innerText.includes('Referencia QA')`);
  checks.push('Dependencia A→B real, rechazo de duplicado y ciclo, relación informativa simétrica y desvinculación');
  if (!await evaluate('Boolean(document.querySelector("dialog aside summary"))')) {
    await button('Cargar actividad anterior', 'dialog aside');
    await wait('document.querySelector("dialog aside summary")');
  }
  await click('dialog aside summary');
  const activityBefore = await evaluate('(()=>{const p=document.querySelector("dialog aside");p.scrollTop=p.scrollHeight;window.qaActivity=p;return {scroll:p.scrollTop,html:p.innerHTML,width:document.querySelector(".detail-main").clientWidth}})()');
  await pause(100);
  await capture('01_actividad_expandida.png');
  const networkBeforeToggle = network.size;
  await click('dialog button[aria-label="Ocultar actividad"]');
  assert.ok(await evaluate('document.querySelector("dialog aside").hidden && document.querySelector("dialog aside").inert && document.querySelector("dialog aside")===window.qaActivity'));
  assert.ok(await evaluate('document.querySelector(".detail-main").clientWidth') > activityBefore.width);
  assert.ok(await evaluate('(()=>{const t=Array.from(document.querySelectorAll(\'dialog [role="tooltip"]\')).find(e=>e.getClientRects().length);const r=t.getBoundingClientRect(),d=document.querySelector("dialog").getBoundingClientRect();return r.left>=d.left&&r.right<=d.right})()'));
  await evaluate('document.querySelector(".detail-information").scrollTop=0');
  await capture('02_actividad_oculta.png');
  await key('Enter');
  assert.ok(await evaluate('Boolean(!document.querySelector("dialog aside").hidden && document.querySelector("dialog aside details[open]"))'));
  assert.equal(await evaluate('document.querySelector("dialog aside").scrollTop'), activityBefore.scroll);
  assert.equal(await evaluate('document.querySelector("dialog aside").innerHTML'), activityBefore.html);
  assert.ok(await evaluate('(()=>{const p=document.querySelector("dialog aside summary");p.focus();const t=document.querySelector(\'dialog button[aria-label="Ocultar actividad"]\');t.click();return document.activeElement===t})()'));
  await key('Enter');
  await key(' ');
  await wait('document.querySelector("dialog aside").hidden');
  assert.equal(network.size, networkBeforeToggle, 'Alternar Activity no solicita datos ni escribe');
  await button('Verificar estructura', 'dialog'); await wait('document.querySelector("dialog h1")?.textContent.includes("Verificar estructura")');
  assert.ok(await evaluate('document.querySelector("dialog aside").hidden'));
  await button('Revisión de planos guardada', 'dialog'); await wait('document.querySelector("dialog h1")?.textContent.includes("guardada")');
  assert.ok(await evaluate('document.querySelector("dialog aside").hidden'));
  await click('dialog button[aria-label="Mostrar actividad"]');
  await field('Duración estimada'); await capture('03_editor_duracion.png'); await key('Escape');
  checks.push('Activity: mouse/Enter/Space, oculto e inert, ancho recuperado, mismo DOM/accordion/scroll, preferencia entre tareas; no mutación por alternar');
  assert.equal(await evaluate('document.querySelector("dialog").scrollWidth>document.querySelector("dialog").clientWidth+1'), false);
  const events = (await history()).flatMap(group => group.events);
  assert.ok(events.every(event => event.actor_name.includes('Administrador de pruebas')));
  assert.ok(events.some(event => event.field === 'state_code' && event.old_value.code === 'PENDIENTE' && event.new_value.code === 'EN_CURSO'));
  assert.ok(events.some(event => event.action === 'child_created'));
  await click('dialog button[aria-label="Cerrar detalle de tarea"]'); await wait('!document.querySelector("dialog[open]")');
  assert.equal(await evaluate(`document.activeElement.closest('[data-task-id]')?.dataset.taskId`), String(context.task));
  await open(); assert.match(await evaluate('document.querySelector("dialog aside").innerText'), /cambió el estado/);
  checks.push('Actividad persistente: autor, origen/destino, creación de subtarea; reapertura y retorno de foco a la Lista');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await pause(200);
  await click('dialog button[aria-label^="Editar nombre:"]'); await input('#detail-task-name', 'Planos_' + 'X'.repeat(166)); await button('Guardar nombre', 'dialog'); await wait('document.querySelector("dialog h1")');
  assert.equal(await evaluate('document.querySelector("dialog").scrollWidth>document.querySelector("dialog").clientWidth+1'), false);
  await click('dialog button[aria-label^="Editar nombre:"]'); await input('#detail-task-name', 'Revisión de planos guardada'); await button('Guardar nombre', 'dialog'); await wait('document.querySelector("dialog h1")');
  await capture('04_pantalla_estrecha.png');
  await field('Duración estimada');
  assert.ok(await evaluate('(()=>{const r=document.querySelector(":popover-open").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'));
  await key('Escape');
  for (const label of ['Estado', 'Persona asignada', 'Fecha límite', 'Prioridad', 'Etiquetas']) {
    if (label === 'Persona asignada') await click('dialog section[aria-label="Propiedades de la tarea"] button[aria-label="Ángela QA worker"]');
    else await field(label);
    assert.ok(await evaluate('(()=>{const r=document.querySelector(":popover-open").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'), label);
    await key('Escape');
  }
  await click('dialog button[aria-label="Ocultar actividad"]'); assert.ok(await evaluate('document.querySelector("dialog aside").hidden'));
  await key('Enter'); assert.ok(await evaluate('!document.querySelector("dialog aside").hidden'));
  await evaluate(`document.querySelector('dialog aside[aria-label="Activity"]').scrollIntoView()`);
  assert.ok(await evaluate('document.querySelector("dialog aside").getBoundingClientRect().top<innerHeight'));
  await click('dialog button[aria-label="Cerrar detalle de tarea"]'); await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await open(context.project, context.reason_task);
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Esta tarea aún no tiene subtareas/);
  assert.match(await evaluate('document.querySelector("dialog aside").innerText'), /creó esta tarea/);
  await field('Estado'); await button('BLOQUEADA', ':popover-open'); await button('Guardar', ':popover-open');
  assert.match(await evaluate('document.querySelector(":popover-open [role=alert]").textContent'), /motivo/);
  await input(':popover-open textarea[name="reason"]', 'Espera de insumo sintético'); await save(); assert.equal((await detail(context.project, context.reason_task)).state_code, 'BLOQUEADA');
  await open(context.scrum, context.scrum_task); assert.match(await evaluate('document.querySelector("dialog").innerText'), /Completadas: 0 de 1/); assert.match(await evaluate('document.querySelector("dialog").innerText'), /COMPLETADO aún activo/);
  checks.push('Pantalla estrecha sin overflow del diálogo; COMPLETADO de Scrum en Activo no suma progreso');
  await login('worker'); await open(); assert.equal(await evaluate(`document.querySelector('dialog button[aria-label^="Relacionar elementos"]').disabled`), true);
  await click('dialog button[aria-label^="Editar nombre:"]'); await input('#detail-task-name', 'Edición del trabajador'); await button('Guardar nombre', 'dialog'); await wait('document.querySelector("dialog h1")?.textContent.includes("trabajador")');
  await field('Estado'); await button('EN_REVISION', ':popover-open'); await save(); assert.equal((await detail()).state_code, 'EN_REVISION');
  await open(context.readonly, context.readonly_task); assert.equal(await evaluate(`document.querySelector('dialog button[aria-label^="Editar nombre"]').disabled`), true);
  assert.equal(await evaluate('document.querySelector("dialog").innerText.includes("+ Añadir tarea")'), false);
  assert.equal((await request(`${context.readonly}/tasks/${context.readonly_task}/`, { method: 'PATCH', body: JSON.stringify({ estimated_minutes: 15 }) })).status, 403);
  await login('outsider'); await send('Page.navigate', { url: `http://localhost:5189/proyectos/${context.project}` }); await wait(`document.querySelector('main [role="alert"]')`); assert.equal(await evaluate('document.querySelector("main").innerText.includes("Revisión de planos")'), false);
  checks.push('Administrador, trabajador con edición efectiva, trabajador de solo lectura y acceso externo denegado sin filtrar tareas');
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'navegador.json'), JSON.stringify({ date: new Date().toISOString(), environment: 'Chrome real + React + Django + MySQL 8.4 temporal, sin mocks de API', checks, errors, requests }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
} catch (failure) {
  await capture?.('_ultima_falla.png');
  if (evaluate) await writeFile(path.join(output, 'error.json'), JSON.stringify({ message: failure.message, checks, errors, page: await evaluate('document.body.innerText').catch(() => ''), requests }, null, 2));
  throw failure;
} finally {
  socket?.close(); chrome.kill(); await pause(400); await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
}
