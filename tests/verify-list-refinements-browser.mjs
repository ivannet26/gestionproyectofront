import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = process.env.GM_BROWSER_REPORT_DIR && path.join(process.env.GM_BROWSER_REPORT_DIR, 'list-refinements');
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


  const row = id => '[data-task-id="'+id+'"]:not([data-context])';
  const list = async () => { await send('Page.navigate', { url:'http://localhost:5189/proyectos/'+context.project }); await wait('document.querySelector(".gm-task-list")'); };
  const moves = () => requests.filter(r=>r.method==='POST'&&r.path.endsWith('/move/')).length;
  const nativeMove = async (selector, target, captureName, after=false) => {
    dragPayload=undefined;
    await send('Input.setInterceptDrags',{enabled:true});
    const from=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...from});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...from,button:'left',buttons:1,clickCount:1});
    for(let n=1;n<=10&&!dragPayload;n++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x+n*6,y:from.y+5,button:'left',buttons:1});await pause(50);}
    assert.ok(dragPayload,'Debe arrastrar desde '+selector);
    const to=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(target)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+120,y:r.y+r.height*'+(after?'.8':'.25')+'}})()');
    await send('Input.dispatchDragEvent',{type:'dragEnter',...to,data:dragPayload});
    await send('Input.dispatchDragEvent',{type:'dragOver',...to,data:dragPayload});
    await wait('document.querySelector("[data-drop],[data-drop-group=true]")');
    if (after) assert.equal(await evaluate('(()=>{const r=document.querySelector("tr[data-drop]");return Array.from(r.cells).every((cell,index)=>Math.abs(cell.getBoundingClientRect().width-r.closest("table").querySelectorAll("th")[index].getBoundingClientRect().width)<2)})()'),true,'Indicador sin alterar columnas');
    if(captureName)await capture(captureName);
    const before=moves();
    await send('Input.dispatchDragEvent',{type:'drop',...to,data:dragPayload});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...to,button:'left',clickCount:1});
    await send('Input.setInterceptDrags',{enabled:false});
    await wait('!document.querySelector("[data-moving=true]")');
    for(let n=0;n<100&&moves()===before;n++)await pause(70);
    assert.equal(moves(),before+1,'Una solicitud por movimiento');
    await wait('!document.querySelector(\'[aria-busy="true"]\')');
    assert.equal(await evaluate('Boolean(document.querySelector("dialog[open],:popover-open"))'),false);
  };
  await login('admin'); await list(); await wait('document.querySelector('+JSON.stringify(row(context.reason_task))+')');
  const initial=(await request(context.project+'/tasks/'+context.reason_task+'/')).data.task;
  await nativeMove(row(context.reason_task)+' td:first-child button:not([aria-label])','section[aria-label="CERRADO"] h2','01_arrastre_desde_nombre.png');
  assert.equal((await detail(context.project,context.reason_task)).state_code,'COMPLETADA');
  await nativeMove(row(context.reason_task)+' td:nth-child(3) button','section[aria-label="BLOQUEADA"] h2');
  assert.equal((await detail(context.project,context.reason_task)).state_code,'BLOQUEADA');
  await nativeMove(row(context.reason_task)+' td:nth-child(2) button','section[aria-label="EN_REVISION"] h2');
  const changed=await detail(context.project,context.reason_task);
  assert.equal(changed.state_code,'EN_REVISION');
  for(const field of ['parent_id','start_date','due_date','assignees','labels','description','priority'])assert.deepEqual(changed[field],initial[field],field);
  checks.push('Arrastre real desde nombre, fecha y responsables; saltos a Cerrado/Bloqueada/En revisión sin modal ni motivo; una solicitud y atributos conservados');
  const anchor=await request(context.project+'/tasks/',{method:'POST',body:JSON.stringify({name:'Ancla QA nueva',state_code:'EN_REVISION',responsible_ids:[initial.assignees[0].id],due_date:null,priority:null})});
  assert.equal(anchor.status,201);
  await list(); await wait('document.querySelector('+JSON.stringify(row(anchor.data.id))+')');
  await nativeMove(row(context.reason_task)+' td:first-child',row(anchor.data.id),'02_linea_insercion.png',true);
  let items=(await request(context.project+'/tasks/')).data;
  assert.ok(items.findIndex(t=>t.id===context.reason_task)>items.findIndex(t=>t.id===anchor.data.id));
  await list(); await wait('document.querySelector('+JSON.stringify(row(context.reason_task))+')');
  checks.push('Arrastre desde área de celda, línea de inserción entre filas y orden persistente al recargar');
  await evaluate('document.querySelector('+JSON.stringify(row(context.reason_task)+' button[aria-label^="Reubicar"]')+').focus()');await key('Enter');
  await wait('document.querySelector(\'select[name="move_state"]\')');
  await evaluate('(()=>{const e=document.querySelector(\'select[name="move_state"]\');e.value="CANCELADA";e.dispatchEvent(new Event("change",{bubbles:true}))})()');
  await button('Confirmar movimiento',':popover-open');await wait('document.querySelector(\'section[aria-label="CANCELADA"] '+row(context.reason_task)+'\')');
  assert.equal(await evaluate('Boolean(document.querySelector("dialog[open]"))'),false);
  checks.push('Alternativa de teclado/clic aplica directamente otro estado sin solicitar motivo');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  await act('Array.from(document.querySelectorAll("main button")).find(e=>e.textContent.trim()==="Tarea")');await wait('document.querySelector("dialog input[name=name]")');
  await click('dialog #task-start');await wait('document.querySelector(":popover-open [data-date]")');
  assert.equal(await evaluate('document.querySelectorAll(":popover-open [data-past=true]:not(:disabled)").length'),0);
  assert.equal(await evaluate('document.querySelector(":popover-open [aria-selected=true]").dataset.date'),today);await key('Escape');
  await click('dialog #task-due');await wait('document.querySelector(":popover-open [data-date]")');
  assert.equal(await evaluate('document.querySelectorAll(":popover-open [data-past=true]:not(:disabled)").length'),0);await key('Escape');
  await capture('03_creacion_desde_hoy.png');await button('Cancelar','dialog');await wait('!document.querySelector("dialog[open]")');
  await evaluate('document.querySelector(\'section[aria-label="PENDIENTE"] button[id$="-create"]\').scrollIntoView({block:"center"})');
  await click('section[aria-label="PENDIENTE"] button[id$="-create"]');
  await wait('document.querySelector(\'form[aria-label="Creación rápida de tarea"]\')');
  await click('form[aria-label="Creación rápida de tarea"] button[aria-label^="Fecha límite"]');await wait('document.querySelector(":popover-open [data-date]")');
  assert.equal(await evaluate('document.querySelectorAll(":popover-open [data-past=true]:not(:disabled)").length'),0);await key('Escape');await key('Escape');
  checks.push('Formulario completo y creación rápida bloquean pasado solo para tareas nuevas; inicio predeterminado hoy en Lima');
  await open();const legacy=await detail();assert.ok(legacy.start_date<today);
  await field('Fecha de inicio');assert.ok(await evaluate('document.querySelectorAll(":popover-open [data-past=true]:not(:disabled)").length')>0);await key('Escape');
  await field('Fecha límite');
  await act('Array.from(document.querySelectorAll(":popover-open [data-past=true]:not(:disabled)")).at(-1)');await save();
  await field('Prioridad');await button('Alta',':popover-open');await save();
  assert.equal((await detail()).start_date,legacy.start_date);assert.ok((await detail()).due_date<today);
  await capture('04_tarea_existente_preservada.png');
  checks.push('Tarea existente conserva inicio pasado al editar prioridad y permite límite pasado dentro de su jerarquía');
  const yesterday=new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  const count=items.length;
  for(const dates of [{start_date:yesterday},{due_date:yesterday}])assert.equal((await request(context.project+'/tasks/',{method:'POST',body:JSON.stringify({name:'Fecha rechazada QA',state_code:'PENDIENTE',...dates})})).status,400);
  items=(await request(context.project+'/tasks/')).data;assert.equal(items.length,count);
  assert.equal(items.some(t=>t.name==='Fecha rechazada QA'),false);
  checks.push('API rechaza inicio y límite pasados en creación sin registros parciales; sin modificar fechas existentes');
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
