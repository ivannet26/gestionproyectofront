import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

assert.ok(process.env.GM_QA_SECRETS_PATH && process.env.GM_BROWSER_REPORT_DIR);
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, 'utf8'));
const context = credentials.context;
assert.ok(context.grandchild && context.date_cases);
const output = path.join(process.env.GM_BROWSER_REPORT_DIR, 'list-pointer-20261027');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'gm-list-presentation-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], errors = [], requests = [], network = new Map(), pending = new Map();
let socket, sequence = 0, documents = 0, token, evaluate, capture;
try {
  let port;
  for (let n = 0; n < 100; n++) { try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await pause(100); } }
  assert.ok(port);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item?.reject(Error(message.error.message)); else item?.resolve(message.result); return; }
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) documents++;
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request;
      if (request.url.startsWith('http://localhost:8819/api/')) network.set(message.params.requestId, { path: new URL(request.url).pathname, method: request.method, ...(request.url.includes('/tasks/') && request.postData ? { payload: JSON.parse(request.postData) } : {}) });
    }
    if (message.method === 'Network.responseReceived') { const entry = network.get(message.params.requestId); if (entry) { entry.status = message.params.response.status; requests.push(entry); } }
    if (message.method === 'Network.loadingFinished') {
      const entry = network.get(message.params.requestId);
      if (entry?.path.endsWith('/auth/login/') && entry.status === 200) { const body = await send('Network.getResponseBody', { requestId: message.params.requestId }); token = JSON.parse(body.body).access; }
    }
  });
  evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { for (let n = 0; n < 140; n++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); } throw Error('Tiempo agotado: ' + expression); };
  const navigate = async url => { const old = documents; await send('Page.navigate', { url }); for (let n = 0; n < 100 && documents === old; n++) await pause(100); assert.ok(documents > old); await wait('document.readyState==="complete"'); };
  const point = expression => evaluate(`(()=>{const e=${expression};if(!e||!e.getClientRects().length)return null;e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const act = async expression => { await wait(expression); let p, ready = false; for (let n = 0; n < 50; n++) { p = await point(expression); if (p) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await pause(30); p = await point(expression); ready = p && await evaluate(`(()=>{const e=${expression};return e.contains(document.elementFromPoint(${p.x},${p.y}))})()`); if (ready) break; } await pause(50); } assert.ok(ready, 'Control oculto: ' + expression); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await pause(70); };
  const click = selector => act(`document.querySelector(${JSON.stringify(selector)})`);
  const button = (text, scope = 'document') => act(`Array.from(${scope}.querySelectorAll('button')).find(e=>!e.disabled&&e.getClientRects().length&&e.textContent.trim()===${JSON.stringify(text)})`);
  const key = async value => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, windowsVirtualKeyCode: value === 'Escape' ? 27 : 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, windowsVirtualKeyCode: value === 'Escape' ? 27 : 9 }); await pause(60); };
  const input = async (selector, value) => { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); };
  const request = async (route, options = {}) => { const response = await fetch('http://localhost:8819/api/projects/' + route, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }); return { status: response.status, data: response.status === 204 ? null : await response.json() }; };
  const tasks = async () => (await request(context.project + '/tasks/')).data;
  const snapshot = async id => (await tasks()).find(task => task.id === id);
  const row = id => `tr[data-task-id="${id}"]:not([data-context])`;
  const group = state => `section[data-group-key="state:${state}"]`;
  const list = async () => { await navigate('http://localhost:5189/proyectos/' + context.project); await wait('document.querySelector(".gm-task-list tr[data-task-id]")'); };
  const expand = async id => { await click(row(id) + ' button[aria-label^="Expandir subtareas"]'); };
  const mutations = () => requests.filter(item => item.method !== 'GET' && item.path.startsWith('/api/projects/')).length;
  const moves = () => requests.filter(item => item.method === 'POST' && item.path.endsWith('/move/'));
  const manual = async (id, state) => { await click(row(id) + ' button[aria-label^="Estado"]'); await wait('document.querySelector(":popover-open")'); await act(`Array.from(document.querySelector(':popover-open').querySelectorAll('button')).find(e=>e.querySelector('[data-state="${state}"]'))`); await button('Guardar', `document.querySelector(':popover-open')`); await wait('!document.querySelector(":popover-open")'); await wait(`document.querySelector('${row(id)} [data-state="${state}"]')`); assert.equal((await snapshot(id)).state_code, state); };
  const closeDetail = async () => { await click('button[aria-label="Cerrar detalle de tarea"]'); await wait('!document.querySelector("dialog[open]")'); };
  capture = async filename => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(output, filename), Buffer.from(result.data, 'base64')); };
  const surfacePoint = async (id, surface) => {
    if (surface !== 'background') return point(`document.querySelector(${JSON.stringify(row(id) + ' ' + surface)})`);
    return evaluate(`(()=>{const e=document.querySelector('${row(id)} td');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+3,y:r.y+r.height/2}})()`);
  };
  const begin = async (id, surface = '[data-task-drag-surface]') => { const p = await surfacePoint(id, surface); assert.ok(p); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 10, y: p.y + 2, button: 'left', buttons: 1 }); await wait('document.querySelector(".gm-task-list[data-moving=true]")'); };
  const over = async (selector, ratio = .5) => { const p = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+Math.min(170,r.width/2),y:r.y+r.height*${ratio}}})()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 }); await pause(100); return p; };
  const release = async p => { await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await wait('!document.querySelector(".gm-task-list[data-moving=true]")'); await wait('!document.querySelector(".gm-task-list[aria-busy=true]")'); };
  const drag = async (id, selector, ratio = .5, filename, surface) => {
    const before = moves().length;
    const dimensions = await evaluate(`Array.from(document.querySelector('${row(id)}').cells,e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))`);
    await begin(id, surface); const p = await over(selector, ratio);
    await wait('document.querySelector(".gm-task-insertion")');
    assert.equal(await evaluate('document.querySelectorAll(".gm-task-insertion").length'), 1);
    assert.equal(await evaluate('document.querySelectorAll(".gm-task-row[data-dragging=true]").length'), 1);
    assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'), 1);
    assert.ok(await evaluate('Array.from(document.querySelectorAll(\'body > [role="tooltip"]\')).every(e=>getComputedStyle(e).visibility==="hidden")'));
    assert.deepEqual(await evaluate(`Array.from(document.querySelector('${row(id)}').cells,e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))`), dimensions);
    if (filename) await capture(filename);
    await release(p);
    for (let n = 0; n < 100 && moves().length === before; n++) await pause(50);
    assert.equal(moves().length, before + 1); assert.equal(moves().at(-1).status, 200);
    assert.equal(await evaluate('Boolean(document.querySelector("dialog[open],:popover-open"))'), false, 'Clic residual después del arrastre');
  };
  const login = async role => { token = undefined; await send('Network.clearBrowserCookies'); await navigate('http://localhost:5189/proyectos'); await wait('document.querySelector("#login-email")'); await input('#login-email', credentials[role].email); await input('#login-password', credentials[role].password); await click('form button[type="submit"]'); await wait('document.querySelector("aside")'); for (let n = 0; n < 100 && !token; n++) await pause(50); assert.ok(token); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await login('admin'); await list();

  const baseline = await tasks(), initialMutations = mutations();
  await expand(context.task); await expand(context.child);
  assert.equal(await evaluate(`document.querySelector('${row(context.child)}').dataset.depth`), '1');
  assert.equal(await evaluate(`document.querySelector('${row(context.grandchild)}').dataset.depth`), '2');
  assert.equal(await evaluate(`document.querySelector('${row(context.grandchild)}').closest('[data-group-key]').dataset.groupKey`), 'state:PENDIENTE');
  assert.equal(await evaluate(`document.querySelector('${row(context.grandchild)}').dataset.ownState`), 'BLOQUEADA');
  const ids = await evaluate('Array.from(document.querySelectorAll("tr[data-task-id]:not([data-context])"),e=>e.dataset.taskId)');
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(mutations(), initialMutations);
  assert.deepEqual(await tasks(), baseline);
  await capture('01_jerarquia_tres_niveles.png');
  checks.push('Tres niveles con estados reales diferentes, filas únicas y expansión sin escrituras');

  await manual(context.child, 'EN_REVISION');
  await manual(context.task, 'BLOQUEADA');
  assert.equal((await snapshot(context.child)).state_code, 'EN_REVISION');
  assert.equal((await snapshot(context.grandchild)).state_code, 'BLOQUEADA');
  await manual(context.task, 'PENDIENTE'); await manual(context.child, 'EN_CURSO');
  await list(); await expand(context.task); await expand(context.child);
  assert.equal((await snapshot(context.grandchild)).parent_id, context.child);
  checks.push('Cambio manual de padre e hijo independiente, jerarquía y estados persistidos tras recargar');

  const beforeGrouping = mutations(), persisted = await tasks();
  for (const label of ['Persona asignada', 'Prioridad', 'Etiquetas', 'Fecha límite', 'Estado']) {
    await click('#task-list-grouping');
    await click('button[aria-label^="Opciones de agrupación"]');
    await act(`Array.from(document.querySelectorAll('[role=menuitemradio]')).find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
    for (let n = 0; n < 3 && await evaluate('Boolean(document.querySelector(":popover-open"))'); n++) await key('Escape');
    assert.equal(await evaluate('document.getElementById("task-list-grouping").getAttribute("aria-label")'), 'Agrupar por: ' + label);
    if (label !== 'Estado') assert.equal(await evaluate('document.querySelectorAll("[data-drag-enabled=true]").length'), 0);
  }
  assert.equal(mutations(), beforeGrouping);
  assert.deepEqual(await tasks(), persisted);
  for (const state of new Set(persisted.map(item => item.state_code))) {
    const byId = new Map(persisted.map(item => [item.id, item]));
    const count = persisted.filter(item => { let root = item; while (root.parent_id !== null && byId.has(root.parent_id)) root = byId.get(root.parent_id); return root.state_code === state; }).length;
    assert.ok((await evaluate(`document.querySelector('${group(state)} h2').innerText`)).includes(`${count} ${count === 1 ? 'tarea' : 'tareas'}`));
  }
  checks.push('Cinco agrupaciones conservadas sin escrituras; contadores por árbol de raíz y arrastre desactivado fuera de Estado');

  const [early, valid, same] = context.date_cases;
  for (const [id, startRed, dueRed] of [[early, true, false], [valid, false, false], [same, false, false]]) {
    const red = await evaluate(`Array.from(document.querySelector('${row(id)}').querySelectorAll('td'),e=>Boolean(e.querySelector('[data-before-creation=true]')))`);
    assert.equal(red[2], startRed); assert.equal(red[3], dueRed);
  }
  checks.push('Fechas: creada 26/10 con 22/10 roja; creada 20/10 con 22/10 normal; 26/10 igual normal; inicio y límite independientes');

  const creation = (await snapshot(valid)).created_at;
  for (const [value, red] of [['2026-10-19', true], ['2026-10-22', false]]) {
    await click(row(valid) + ' button[aria-label^="Fecha de inicio"]'); await wait('document.querySelector(":popover-open")');
    await click(`:popover-open button[data-date="${value}"]`); await button('Guardar', `document.querySelector(':popover-open')`);
    await wait('!document.querySelector(":popover-open")');
    assert.equal((await snapshot(valid)).start_date, value);
    assert.equal((await snapshot(valid)).created_at, creation);
    assert.equal(await evaluate(`Boolean(document.querySelector('${row(valid)} td:nth-child(3) [data-before-creation]'))`), red);
    assert.equal(await evaluate(`Boolean(document.querySelector('${row(valid)} td:nth-child(4) [data-before-creation]'))`), false);
  }
  checks.push('Edición histórica evalúa el valor actual contra creación, permite corregirlo y conserva created_at y el color independiente del límite');

  await act(`document.querySelector('${row(early)} [data-task-drag-surface]')`);
  await wait('document.querySelector("dialog[open]")'); await closeDetail();
  const propertySelector = row(early) + ' [data-property-appearance="list"] > div > span > button';
  const visual = () => evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(propertySelector)}),e=>({label:e.getAttribute('aria-label'),background:getComputedStyle(e).backgroundColor,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,outline:getComputedStyle(e).outlineWidth}))`);
  const titlePoint = await point(`document.querySelector('${row(early)} [data-task-drag-surface]')`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...titlePoint });
  const beforeHover = await visual(); assert.ok(beforeHover.every(item => item.background === 'rgba(0, 0, 0, 0)'));
  const propertyPoint = await point(`document.querySelector('${row(early)} button[aria-label^="Fecha de inicio"]')`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...propertyPoint });
  const hovered = await visual(); assert.equal(hovered.filter(item => item.background === 'rgb(255, 255, 255)').length, 1);
  assert.deepEqual(hovered.map(item => [item.width, item.height]), beforeHover.map(item => [item.width, item.height]));
  await key('Tab'); await evaluate(`document.querySelector('${row(early)} button[aria-label^="Fecha de inicio"]').focus()`);
  assert.equal((await visual()).find(item => item.label.startsWith('Fecha de inicio')).outline, '2px');
  await click(row(early) + ' button[aria-label^="Fecha de inicio"]'); await wait('document.querySelector(":popover-open")');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  assert.equal((await visual()).find(item => item.label.startsWith('Fecha de inicio')).background, 'rgb(255, 255, 255)');
  await key('Escape');
  checks.push('Hover de una sola propiedad, foco visible y editor abierto sin cambios de medidas; clic normal abre detalle');

  const labels = row(early) + ' button[aria-label^="Etiquetas"]';
  assert.equal(await evaluate(`document.querySelector('${labels} path').getAttribute('d')`), 'm3 12 9 9 9-9-9-9H3z');
  assert.ok(await evaluate(`document.querySelector('${labels}').getBoundingClientRect().right <= document.querySelector('${row(early)} button[aria-label^="Persona asignada"]').getBoundingClientRect().left`));
  await key('Tab'); await evaluate(`document.querySelector('${labels}').focus()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('${row(early)} .gm-row-labels')).opacity`), '1');
  await click(labels); await wait('document.querySelector(":popover-open input[name=specialty_search]")');
  assert.equal(await evaluate('Boolean(document.querySelector("[data-task-preview],dialog[open]"))'), false);
  await act(`document.querySelector(':popover-open [aria-label="Especialidades"] button[aria-pressed=false]')`);
  await button('Guardar', `document.querySelector(':popover-open')`); await wait('!document.querySelector(":popover-open")');
  assert.equal((await snapshot(early)).labels.length, 1);
  assert.equal(await evaluate('document.querySelectorAll(".gm-task-list button[aria-label^=Opciones]").length'), 0);
  assert.ok(await evaluate('Array.from(document.querySelectorAll(".gm-task-list table")).every(t=>t.querySelectorAll("col").length===6&&t.querySelectorAll("th").length===6)'));
  await capture('02_propiedad_y_etiquetas.png');
  checks.push('Icono histórico de etiquetas antes del responsable, edición y foco; sin menú final ni columna residual');

  await click(group('EN_REVISION') + ' h2 button');
  await drag(context.child, group('EN_REVISION') + ' h2', .5, '03_arrastre_subtarea.png');
  assert.equal((await snapshot(context.child)).parent_id, context.task);
  assert.equal((await snapshot(context.task)).state_code, 'PENDIENTE');
  assert.equal((await snapshot(context.grandchild)).state_code, 'BLOQUEADA');
  await drag(context.child, group('EN_CURSO') + ' h2');
  await drag(context.child, group('EN_REVISION') + ' h2');
  await drag(context.child, group('EN_CURSO') + ' h2');
  await list(); await expand(context.task); await expand(context.child);
  assert.equal((await snapshot(context.child)).state_code, 'EN_CURSO');
  checks.push('Arrastre repetido a estados vacíos y contraídos, origen discreto y una línea sin textos flotantes; solo cambia la subtarea y persiste el padre');

  await drag(same, row(context.task), .2);
  let order = (await tasks()).filter(item => item.parent_id === null && item.state_code === 'PENDIENTE').map(item => item.id);
  assert.equal(order[0], same);
  await drag(same, row(valid), .2);
  order = (await tasks()).filter(item => item.parent_id === null && item.state_code === 'PENDIENTE').map(item => item.id);
  assert.ok(order.indexOf(early) < order.indexOf(same) && order.indexOf(same) < order.indexOf(valid));
  await drag(same, group('PENDIENTE') + ' div[id] > button', .5);
  order = (await tasks()).filter(item => item.parent_id === null && item.state_code === 'PENDIENTE').map(item => item.id);
  assert.equal(order.at(-1), same);
  checks.push('Posición inicial, intermedia y final conserva el orden confirmado entre hermanos');

  const beforeCancel = moves().length;
  await begin(context.grandchild); const rejectedPoint = await over(row(early));
  await wait('document.querySelector(".gm-task-list[data-moving=true][data-drop-valid=false]")');
  assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-insertion"))'), false);
  await capture('04_destino_incompatible.png'); await release(rejectedPoint); assert.equal(moves().length, beforeCancel);
  await begin(early); const cancelPoint = await over(group('EN_REVISION') + ' h2');
  await key('Escape'); await release(cancelPoint); assert.equal(moves().length, beforeCancel);
  await click(row(early) + ' [data-task-drag-surface]'); await wait('document.querySelector("dialog[open]")'); await closeDetail();
  checks.push('Destino de otro padre rechazado con feedback y sin línea; Escape no escribe y el clic posterior abre detalle');

  const beforeScroll = moves().length;
  await begin(early);
  const edge = await evaluate(`(()=>{const e=document.querySelector('[aria-label="Tabla de tareas con desplazamiento horizontal"]');const r=e.getBoundingClientRect();return{x:r.left+140,y:r.bottom-9,scroll:e.scrollTop}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: edge.x, y: edge.y, button: 'left', buttons: 1 }); await pause(250);
  assert.ok(await evaluate('document.querySelector(\'[aria-label="Tabla de tareas con desplazamiento horizontal"]\').scrollTop') > edge.scroll);
  await key('Escape'); await release(edge); assert.equal(moves().length, beforeScroll);
  checks.push('Autoscroll en el borde durante el arrastre, cancelado sin escritura');

  const beforeState = moves().length;
  await click(row(early) + ' button[aria-label^="Estado"]'); await wait('document.querySelector(":popover-open")');
  assert.equal(await evaluate('Boolean(document.querySelector(":popover-open select"))'), false);
  assert.equal(await evaluate('document.querySelector(":popover-open").innerText.includes("Posición entre hermanos")'), false);
  await capture('05_estado_sin_posicion.png'); await key('Escape');
  await manual(early, 'EN_REVISION'); await manual(early, 'PENDIENTE');
  assert.equal(moves().length, beforeState);
  assert.ok(requests.filter(item => item.method === 'POST' && item.path.endsWith('/state/')).every(item => Object.keys(item.payload).join(',') === 'state_code'));
  checks.push('Editor de Estado sin posiciones ni sección Mover tarea; solo envía state_code al endpoint de estado');

  const surfaces = [
    ['título', '[data-task-drag-surface]'], ['fondo', 'background'],
    ['responsable', 'button[aria-label^="Persona asignada"]'],
    ['inicio', 'button[aria-label^="Fecha de inicio"]'], ['límite', 'button[aria-label^="Fecha límite"]'],
    ['prioridad', 'button[aria-label^="Prioridad"]'], ['estado', 'button[aria-label^="Estado"]'],
    ['etiquetas', 'button[aria-label^="Etiquetas"]'],
  ];
  for (const [name, surface] of surfaces) {
    const beforeClick = moves().length;
    if (surface === 'background') {
      const p = await surfacePoint(early, surface);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
    } else await click(row(early) + ' ' + surface);
    assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-list[data-moving=true]"))'), false);
    if (name === 'título' || name === 'fondo') { await wait('document.querySelector("dialog[open]")'); await closeDetail(); }
    else {
      await wait('document.querySelector(":popover-open")');
      const editorInput = await evaluate('Boolean(document.querySelector(":popover-open input:not([disabled])"))');
      if (editorInput) { await input(':popover-open input:not([disabled])', 'QA'); assert.equal(await evaluate('document.querySelector(":popover-open input:not([disabled])").value'), 'QA'); }
      const p = await point('document.querySelector(\':popover-open input:not([disabled]), :popover-open button:not([disabled])\')');
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 12, y: p.y, button: 'left', buttons: 1 });
      assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-list[data-moving=true]"))'), false, 'Contenido del editor: ' + name);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + 12, y: p.y, button: 'left', clickCount: 1 });
      await key('Escape'); await wait('!document.querySelector(":popover-open")');
    }
    assert.equal(moves().length, beforeClick, 'Clic habitual: ' + name);
    const current = await snapshot(early), target = current.state_code === 'PENDIENTE' ? 'EN_REVISION' : 'PENDIENTE';
    await drag(early, group(target) + ' h2', .5, name === 'responsable' ? '06_arrastre_desde_responsable.png' : undefined, surface);
    assert.equal((await snapshot(early)).state_code, target, 'Arrastre desde ' + name);
  }
  checks.push('Clic y arrastre desde título, fondo, responsable, inicio, límite, prioridad, estado y etiquetas; sin clic residual ni editores accidentales');
  checks.push('Inputs y botones de popovers abiertos conservan edición y gestos propios, sin mover la tarea subyacente');

  const statePoint = await surfacePoint(early, 'button[aria-label^="Estado"]'), beforeHold = moves().length;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...statePoint });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...statePoint, button: 'left', buttons: 1, clickCount: 1 });
  await pause(250);
  assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-list[data-moving=true],:popover-open"))'), false);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: statePoint.x + 3, y: statePoint.y + 3, button: 'left', buttons: 1 });
  assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-list[data-moving=true]"))'), false);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: statePoint.x + 3, y: statePoint.y + 3, button: 'left', clickCount: 1 });
  await wait('document.querySelector(":popover-open")'); await key('Escape');
  assert.equal(moves().length, beforeHold);
  checks.push('Mantener pulsado y mover menos de seis píxeles conserva el clic de Estado sin iniciar movimiento');

  const expander = 'button[aria-label*="subtareas de"]';
  const expanded = await evaluate(`document.querySelector('${row(context.task)} ${expander}').getAttribute('aria-expanded')`);
  await click(row(context.task) + ' ' + expander);
  assert.notEqual(await evaluate(`document.querySelector('${row(context.task)} ${expander}').getAttribute('aria-expanded')`), expanded);
  await click(row(context.task) + ' ' + expander);
  await drag(context.task, group('EN_REVISION') + ' h2', .5, undefined, expander);
  assert.equal(await evaluate(`document.querySelector('${row(context.task)} ${expander}').getAttribute('aria-expanded')`), expanded);
  assert.equal((await snapshot(context.child)).state_code, 'EN_CURSO');
  assert.equal((await snapshot(context.grandchild)).state_code, 'BLOQUEADA');
  await drag(context.task, group('PENDIENTE') + ' h2', .5, undefined, 'background');
  await list(); await expand(context.task); await expand(context.child);
  assert.equal((await snapshot(context.grandchild)).parent_id, context.child);
  checks.push('El expansor distingue clic de arrastre; mover al padre no propaga estados y la jerarquía persiste al recargar');

  const beforePropertyCancel = moves().length;
  await begin(early, 'button[aria-label^="Prioridad"]'); const cancelProperty = await over(group('EN_REVISION') + ' h2');
  await key('Escape'); await release(cancelProperty);
  assert.equal(moves().length, beforePropertyCancel);
  assert.equal(await evaluate('Boolean(document.querySelector("dialog[open],:popover-open"))'), false);
  checks.push('Escape al arrastrar desde una propiedad cancela sin escritura ni clic residual');

  const external = await snapshot(context.related);
  assert.equal((await request(`${context.project}/tasks/${context.related}/move/`, { method: 'POST', body: JSON.stringify({ state_code: 'BLOQUEADA', before_id: null, expected_revision: external.move_revision }) })).status, 200);
  const failedMoves = moves().length;
  await begin(context.related); const conflictPoint = await over(group('EN_REVISION') + ' h2'); await release(conflictPoint);
  await wait('document.querySelector(".gm-task-list [role=alert]")');
  assert.equal(moves().length, failedMoves + 1); assert.equal(moves().at(-1).status, 409);
  await pause(200); assert.equal(moves().length, failedMoves + 1);
  assert.equal((await snapshot(context.related)).state_code, 'BLOQUEADA');
  await button('Actualizar lista'); await wait('!document.querySelector(".gm-task-list [role=alert]")');
  checks.push('409 real conserva la confirmación del servidor, sin replay, y permite actualizar explícitamente');

  await click('a[href$="?vista=tablero"]'); await wait('document.querySelector(\'section[aria-label="Tablero"]\')');
  await click(`[aria-label="${(await snapshot(context.task)).name}"][tabindex]`); await wait('document.querySelector("dialog[open]")'); await closeDetail();
  await click('a[href$="?vista=lista"]'); await wait('document.querySelector(".gm-task-list")');
  assert.ok(requests.filter(item => item.payload && (item.path.endsWith('/state/') || item.path.endsWith('/move/'))).every(item => !('reason' in item.payload)));
  assert.deepEqual(errors, []);
  checks.push('Detalle y Tablero conservados, sin motivos ni excepciones de ejecución');

  await login('worker');
  await navigate('http://localhost:5189/proyectos/' + context.readonly); await wait(`document.querySelector('${row(context.readonly_task)}')`);
  assert.equal(await evaluate(`document.querySelector('${row(context.readonly_task)}').hasAttribute('data-drag-enabled')`), false);
  assert.equal(await evaluate(`document.querySelector('${row(context.readonly_task)} button[aria-label^="Estado"]').disabled`), true);
  checks.push('Trabajador en proyecto de lectura conserva estado deshabilitado y carece de arrastre');
  await writeFile(path.join(output, 'navegador.json'), JSON.stringify({ checks, requests, errors }, null, 2));
  console.log(JSON.stringify({ approved: checks.length, checks }, null, 2));
} catch (failure) {
  if (capture) await capture('fallo.png');
  if (evaluate) console.error(JSON.stringify({ error: String(failure), checks, errors, visible: await evaluate('document.body.innerText.slice(-1400)') }));
  throw failure;
} finally {
  socket?.close(); chrome.kill(); if (chrome.exitCode === null) await new Promise(resolve => chrome.once('exit', resolve));
  for (let n = 0; n < 30; n++) { try { await rm(profile, { recursive: true, force: true }); break; } catch { await pause(100); } }
}
