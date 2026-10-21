import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = process.env.GM_BROWSER_REPORT_DIR && path.join(process.env.GM_BROWSER_REPORT_DIR, 'project-integrations');
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
let socket, evaluate, capture, token, dragPayload, sequence = 0;
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
    if (message.method === 'Input.dragIntercepted') dragPayload = message.params.data;
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
  const button = async (text, scope = 'document') => {
    const expression = `Array.from(${scope === 'document' ? 'document' : `document.querySelector(${JSON.stringify(scope)})`}.querySelectorAll('button')).find(e=>!e.disabled&&e.getClientRects().length&&e.textContent.trim().endsWith(${JSON.stringify(text)}))`;
    await wait(expression); await act(expression);
  };
  const input = async (selector, text) => { await click(selector); await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); };
  const key = async (value, shift = false) => { const codes = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ' ': 32 }; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, windowsVirtualKeyCode: codes[value], modifiers: shift ? 8 : 0, ...(value === 'Enter' ? { code: 'Enter', text: '\r', unmodifiedText: '\r', nativeVirtualKeyCode: 13 } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, windowsVirtualKeyCode: codes[value], modifiers: shift ? 8 : 0 }); await pause(70); };
  const request = async (route, options = {}) => { const response = await fetch('http://localhost:8819/api/projects/' + route, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }); const result = response.status === 204 ? null : await response.json(); return { status: response.status, data: result }; };
  const detail = async (project = context.project, task = context.task) => (await request(`${project}/tasks/${task}/`)).data.task;
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

  const choose = async (selector, value) => { await wait('document.querySelector('+JSON.stringify(selector)+')'); await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(String(value))+';e.dispatchEvent(new Event("change",{bubbles:true}));})()'); await pause(90); };
  const list = async (project = context.project) => { await send('Page.navigate', { url: 'http://localhost:5189/proyectos/' + project }); await wait('document.querySelector(".gm-task-list")'); };
  const row = id => '[data-task-id="' + id + '"]';
  const writes = () => requests.filter(r => ['POST','PATCH','DELETE'].includes(r.method) && !r.path.includes('/auth/')).length;
  await login('admin');
  await button('+ Crear proyecto'); await wait('document.querySelector("#project-name")');
  await input('#project-name', 'Proyecto con equipos · QA'); await click('#project-areas'); await button('Ingeniería · pruebas aisladas', ':popover-open');
  const beforeDraft = writes();
  await button('Configurar', 'dialog'); await wait('document.querySelectorAll("dialog[open]").length===2');
  await wait('document.querySelector("dialog:last-of-type button[aria-haspopup=dialog]")');
  await click('dialog:last-of-type button[aria-haspopup="dialog"]'); await button('Scrum', '[aria-label="Plantillas de estado"]');
  await capture('01_flujo_borrador.png'); await button('Usar este flujo', 'dialog:last-of-type');
  await wait('document.querySelectorAll("dialog[open]").length===1'); assert.equal(writes(), beforeDraft);
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Scrum/);
  await button('Continuar', 'dialog'); await click('input[type="radio"]:not(:checked)'); await button('Equipos', 'dialog');
  await wait('document.querySelectorAll(\'input[name="project_team"]\').length===3');
  assert.equal(await evaluate('document.querySelector(\'input[name="project_team"][value="'+context.teams[2]+'"]\').disabled'), true);
  await click('input[name="project_team"][value="'+context.teams[0]+'"]'); await click('input[name="project_team"][value="'+context.teams[1]+'"]');
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /2 equipos · 2 trabajadores únicos/);
  await click('dialog details summary'); await capture('02_equipos_proyecto.png');
  await button('Trabajadores', 'dialog'); await wait('document.querySelectorAll(\'input[type="checkbox"]\').length>=2');
  assert.ok(await evaluate('Array.from(document.querySelectorAll(\'input[type="checkbox"]\')).every(e=>!e.checked)'));
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Ángela QA/);
  await button('Equipos', 'dialog'); await wait('document.querySelectorAll(\'input[name="project_team"]\').length===3');
  await click('input[name="project_team"][value="'+context.teams[0]+'"]'); await click('input[name="project_team"][value="'+context.teams[1]+'"]');
  await button('Crear con asignados', 'dialog'); await wait('!document.querySelector("dialog[open]")');
  const projects = (await request('')).data, created = projects.find(p => p.name === 'Proyecto con equipos · QA');
  assert.ok(created); const createdProject = (await request(created.id + '/')).data;
  assert.equal(createdProject.team_ids.length, 2); assert.equal(createdProject.participants.length, 2);
  assert.equal(createdProject.task_states.states.find(s => s.name === 'COMPLETADO').category, 'active');
  checks.push('Proyecto real con dos equipos, deduplicación de dos miembros, equipo vacío deshabilitado, cambio de origen limpio, flujo Scrum local sin escritura previa y persistencia confirmada');
  await send('Page.navigate', { url: 'http://localhost:5189/proyectos' }); await wait('document.querySelector("main") && !document.querySelector("main").innerText.includes("Cargando")');
  await button('+ Crear proyecto'); await input('#project-name', 'Cancelado no guardar'); await key('Escape'); await wait('!document.querySelector("dialog[open]")');
  assert.equal((await request('')).data.some(p => p.name === 'Cancelado no guardar'), false);
  checks.push('Cancelación del asistente sin proyecto provisional ni persistencia');
  await list(); await wait('document.querySelector(\'' + row(context.task) + '\')');
  assert.equal(await evaluate('Boolean(document.querySelector(\'input[name="task_search"]\'))'), false);
  await click('button[aria-label="Buscar tareas"]'); await input('input[name="task_search"]', 'Informe técnico'); await wait('document.querySelectorAll("[data-task-id]").length===1');
  assert.ok(await evaluate('document.querySelector(\'button[aria-label^="Reubicar"]\').getAttribute("aria-disabled")==="true"'));
  await click('button[aria-label="Limpiar búsqueda"]'); await key('Escape');
  assert.equal(await evaluate('Boolean(document.querySelector(\'input[name="task_search"]\'))'), false);
  checks.push('Búsqueda única expansible; limpiar y Escape restauran la lista y foco; movimiento deshabilitado mientras se filtra');
  const taskRow = row(context.task);
  await evaluate('document.querySelector(\'' + taskRow + '\').querySelector("button").focus()');
  const widthsBefore = await evaluate('Array.from(document.querySelector(\''+taskRow+'\').cells).map(c=>Math.round(c.getBoundingClientRect().width))');
  await click(taskRow + ' button[aria-label^="Etiquetas"]');
  await wait('document.querySelector(\'input[name="specialty_search"]\')');
  assert.doesNotMatch(await evaluate('document.querySelector(":popover-open").innerText'), /No técnica|Clasificación/);
  await button('Ingeniería civil', ':popover-open'); await button('Diseño estructural', ':popover-open'); await save();
  assert.deepEqual((await detail()).labels.map(l=>l.specialty_id).sort((a,b)=>a-b), context.specialties.slice(0,2));
  await click(taskRow + ' button[aria-label^="Etiquetas"]'); await button('Diseño estructural', ':popover-open'); await save();
  assert.equal((await detail()).labels.length, 1);
  await click(taskRow + ' button[aria-label^="Persona asignada"]'); await button('Sin responsable', ':popover-open'); await button('Equipos', ':popover-open');
  await choose('select[name="assignment_team"]', context.teams[0]); await button('Ángela QA worker', ':popover-open'); await save();
  assert.equal((await detail()).assignees.length, 1);
  await click(taskRow + ' button[aria-label^="Persona asignada"]'); await button('Equipos', ':popover-open');
  await choose('select[name="assignment_team"]', context.teams[0]); await button('José QA second', ':popover-open');
  await button('Trabajadores', ':popover-open'); assert.match(await evaluate('document.querySelector(":popover-open").innerText'), /2 responsables seleccionados/);
  await button('Equipos', ':popover-open'); await capture('03_responsables_equipo.png'); await save(); assert.equal((await detail()).assignees.length, 2);
  assert.deepEqual(await evaluate('Array.from(document.querySelector(\''+taskRow+'\').cells).map(c=>Math.round(c.getBoundingClientRect().width))'), widthsBefore);
  checks.push('Especialidades reales por identidad: selección múltiple, retirada y MySQL; responsables por equipo conservados entre pestañas; anchuras de columnas estables');
  await click(taskRow + ' button[aria-label^="Fecha límite"]'); await wait('document.querySelector(":popover-open [data-past=true]:not(:disabled)")');
  const selectedPast = await evaluate('document.querySelector(":popover-open [data-past=true]:not(:disabled)").dataset.date');
  await click(':popover-open [data-past=true]:not(:disabled)'); await save();
  assert.equal((await detail()).due_date, selectedPast);
  assert.match(await evaluate('document.querySelector(\''+taskRow+' button[aria-label^="Fecha límite"]\').getAttribute("aria-label")'), /Fecha anterior a hoy/);
  assert.ok(await evaluate('Boolean(document.querySelector(\''+taskRow+' button[aria-label^="Fecha límite"] .text-red-700\'))'));
  await capture('04_lista_fechas_etiquetas.png');
  checks.push('Fecha pasada dentro del período seleccionable, guardada en MySQL y roja con ayuda accesible; calendario conserva días fuera del período deshabilitados');
  const move = async (id, state, before = '', keyboard = false) => {
    if (keyboard) { await evaluate('document.querySelector('+JSON.stringify(row(id)+' button[aria-label^="Reubicar"]')+').focus()'); await key('Enter'); }
    else await click(row(id)+' button[aria-label^="Reubicar"]');
    await choose('select[name="move_state"]', state); await choose('select[name="move_before"]', before);
    if (keyboard) { await evaluate('Array.from(document.querySelector(":popover-open").querySelectorAll("button")).find(e=>e.textContent.trim()==="Confirmar movimiento").focus()'); await key('Enter'); }
    else await button('Confirmar movimiento', ':popover-open');
  };
  const beforeReason = writes(), originalReason = await detail(context.project, context.reason_task);
  await move(context.reason_task, 'BLOQUEADA', '', true); await wait('document.querySelector("dialog[open] textarea")');
  await key('Escape'); await wait('!document.querySelector("dialog[open]")'); assert.equal(writes(), beforeReason);
  assert.match(await evaluate('document.activeElement.getAttribute("aria-label")'), /Reubicar/);
  assert.equal((await detail(context.project, context.reason_task)).state_code, originalReason.state_code);
  await move(context.reason_task, 'BLOQUEADA'); await input('dialog textarea', 'Espera de insumo QA'); await button('Cambiar estado', 'dialog');
  await wait('document.querySelector(\'section[aria-label="BLOQUEADA"] '+row(context.reason_task)+'\')');
  assert.equal((await detail(context.project, context.reason_task)).state_code, 'BLOQUEADA');
  checks.push('Alternativa teclado/clic al arrastre, motivo mediante formulario existente; cancelar sin escritura; estado y posición confirmados por una solicitud');
  await move(context.task, 'EN_CURSO'); await wait('document.querySelector(\'section[aria-label="EN CURSO"] '+taskRow+'\')');
  assert.equal((await detail()).state_code, 'EN_CURSO');
  await list(); await wait('document.querySelector(\'section[aria-label="EN CURSO"] '+taskRow+'\')');
  const beforeDrag = requests.filter(r => r.path.endsWith('/move/') && r.method === 'POST').length;
  await send('Input.setInterceptDrags', { enabled: true });
  const origin = await evaluate('(()=>{const e=document.querySelector(\''+taskRow+' button[aria-label^="Reubicar"]\');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...origin });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...origin, button: 'left', buttons: 1, clickCount: 1 });
  for (let n = 1; n <= 8 && !dragPayload; n++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: origin.x + n * 7, y: origin.y + 5, button: 'left', buttons: 1 }); await pause(70); }
  assert.ok(dragPayload, 'Chrome debe iniciar un arrastre nativo desde el asa');
  const destination = await evaluate('(()=>{const e=document.querySelector(\'section[aria-label="EN_REVISION"] h2\');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+150,y:r.y+r.height/2}})()');
  await send('Input.dispatchDragEvent', { type: 'dragEnter', ...destination, data: dragPayload });
  await send('Input.dispatchDragEvent', { type: 'dragOver', ...destination, data: dragPayload });
  await wait('document.querySelector("[data-drop-group=true]")'); await capture('07_arrastre_nativo.png');
  await send('Input.dispatchDragEvent', { type: 'drop', ...destination, data: dragPayload });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...destination, button: 'left', clickCount: 1 });
  await send('Input.setInterceptDrags', { enabled: false }); await wait('document.querySelector(\'section[aria-label="EN_REVISION"] '+taskRow+'\')');
  assert.equal(requests.filter(r => r.path.endsWith('/move/') && r.method === 'POST').length, beforeDrag + 1);
  assert.equal((await detail()).state_code, 'EN_REVISION');
  checks.push('Arrastre nativo Chrome iniciado desde asa, destino vacío e indicador real, una sola solicitud y estado confirmado en MySQL');
  checks.push('Movimiento confirmado persiste tras recargar; conserva padre, responsables, etiquetas y fechas');
  await open(); await field('Etiquetas'); assert.match(await evaluate('document.querySelector(":popover-open").innerText'), /Ingeniería civil/); await key('Escape');
  await capture('05_detalle_compartido.png'); await click('dialog button[aria-label="Cerrar detalle de tarea"]');
  await act('Array.from(document.querySelectorAll("main button")).find(e=>e.textContent.trim()==="Tarea")');
  await wait('document.querySelector("dialog input[name=name]")');
  await input('dialog input[name=name]', 'Formulario completo QA'); await click('dialog button[aria-label^="Etiquetas"]'); await button('Revisión BIM', ':popover-open'); await key('Escape');
  await button('Crear tarea', 'dialog'); await wait('!document.querySelector("dialog[open]")');
  let savedTasks = (await request(context.project+'/tasks/')).data;
  assert.equal(savedTasks.find(t => t.name === 'Formulario completo QA').labels[0].specialty_id, context.specialties[2]);
  await click('section[aria-label="PENDIENTE"] button[id$="-create"]'); await input('form[aria-label="Creación rápida de tarea"] input[name=name]', 'Creación rápida QA');
  await click('form[aria-label="Creación rápida de tarea"] button[aria-label^="Etiquetas"]'); await button('Ingeniería civil', ':popover-open'); await key('Escape');
  await click('form[aria-label="Creación rápida de tarea"] input[name=name]'); await key('Tab'); await key('Tab', true); await key('Enter'); await key('Enter');
  await wait('!document.querySelector(\'form[aria-label="Creación rápida de tarea"]\')');
  savedTasks = (await request(context.project+'/tasks/')).data;
  assert.equal(savedTasks.filter(t => t.name === 'Creación rápida QA').length, 1);
  assert.equal(savedTasks.find(t => t.name === 'Creación rápida QA').labels[0].specialty_id, context.specialties[0]);
  const beforeQuickCancel = writes();
  await click('section[aria-label="PENDIENTE"] button[id$="-create"]'); await input('form[aria-label="Creación rápida de tarea"] input[name=name]', 'No guardar rápido');
  await click('form[aria-label="Creación rápida de tarea"] button[aria-label^="Etiquetas"]'); await key('Escape'); assert.ok(await evaluate('Boolean(document.querySelector(\'form[aria-label="Creación rápida de tarea"]\'))'));
  await key('Escape'); await wait('!document.querySelector(\'form[aria-label="Creación rápida de tarea"]\')'); assert.equal(writes(), beforeQuickCancel);
  checks.push('Formulario completo y creación rápida guardan Especialidades por identidad; Tab/Shift+Tab, Escape por niveles, doble Enter sin duplicados y cancelar sin petición');
  const movedBeforeConflict = (await detail()).state_code;
  assert.equal((await request(context.project+'/tasks/'+context.task+'/', { method: 'PATCH', body: JSON.stringify({ description: 'Cambio concurrente QA' }) })).status, 200);
  await move(context.task, movedBeforeConflict); await wait('document.querySelector(".gm-task-list [role=alert]")');
  assert.match(await evaluate('document.querySelector(".gm-task-list [role=alert]").innerText'), /cambiaron/);
  assert.equal((await detail()).state_code, movedBeforeConflict);
  await button('Actualizar lista', '.gm-task-list'); await wait('!document.querySelector(".gm-task-list [role=alert]")');
  checks.push('Conflicto concurrente real devuelve 409; conserva estado y muestra actualización explícita sin sobrescribir edición ajena');
  for (let index = 0; index < 14; index++) {
    const result = await request(context.project+'/tasks/', { method: 'POST', body: JSON.stringify({ name: 'Fila de desplazamiento QA '+index, state_code: 'PENDIENTE', due_date: null, priority: null, responsible_ids: [], specialty_ids: [], retained_label_ids: [] }) });
    assert.equal(result.status, 201);
  }
  await list();
  const regionSelector = '.gm-task-list [role=region]';
  await evaluate('document.querySelector('+JSON.stringify(regionSelector)+').scrollTop=150'); await pause(80);
  assert.ok(await evaluate('(()=>{const region=document.querySelector('+JSON.stringify(regionSelector)+'),heading=region.querySelector(".gm-group-heading"),r=region.getBoundingClientRect(),h=heading.getBoundingClientRect();return Math.abs(h.top-r.top)<2&&getComputedStyle(heading).position==="sticky"&&getComputedStyle(heading).backgroundColor==="rgb(255, 255, 255)"})()'));
  await capture('08_encabezado_sticky.png');
  await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(regionSelector)+'),g=r.querySelector(".gm-task-group");r.scrollTop=g.offsetHeight+30})()'); await pause(80);
  assert.ok(await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(regionSelector)+'),h=r.querySelector(".gm-group-heading");return h.getBoundingClientRect().bottom<=r.getBoundingClientRect().top+1})()'));
  await evaluate('document.querySelector('+JSON.stringify(regionSelector)+').scrollTop=0');
  checks.push('Encabezado sticky opaco dentro de su grupo: permanece al recorrer 14 filas y deja paso al siguiente al alcanzar su límite');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }); await pause(150);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".gm-row-actions")).opacity'), '1');
  await evaluate('document.querySelector('+JSON.stringify(regionSelector)+').scrollLeft=250'); await pause(60);
  assert.ok(await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(regionSelector)+'),b=r.querySelector(".gm-group-heading > button"),h=r.querySelector("th:nth-child(3)").getBoundingClientRect(),c=r.querySelector("td:nth-child(3)").getBoundingClientRect();return b.getBoundingClientRect().left>=r.getBoundingClientRect().left-1&&Math.abs(h.left-c.left)<1})()'));
  const touchPoint = await evaluate('(()=>{const e=document.querySelector(\''+row(context.task)+' button[aria-label^="Persona asignada"]\');e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touchPoint, radiusX: 2, radiusY: 2 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait('document.querySelector(":popover-open")');
  assert.ok(await evaluate('(()=>{const r=document.querySelector(":popover-open").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'));
  await capture('06_selector_tactil.png'); await key('Escape'); await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  checks.push('Pantalla de 390 px y puntero táctil: acciones auxiliares accesibles y popover dentro de ventana');
  await login('worker'); await list(context.readonly); await wait('document.querySelector("[data-task-id]")');
  assert.equal(await evaluate('Boolean(document.querySelector(\'button[aria-label^="Reubicar"]\'))'), false);
  checks.push('Solo lectura conserva atributos y no expone asa de movimiento');
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
