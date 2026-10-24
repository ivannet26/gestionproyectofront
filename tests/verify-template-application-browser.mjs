import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = process.env.GM_BROWSER_REPORT_DIR && path.join(process.env.GM_BROWSER_REPORT_DIR, 'template-application');
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
      if (request.url.startsWith('http://localhost:8819/api/')) network.set(message.params.requestId, { path: new URL(request.url).pathname, method: request.method, ...(request.url.endsWith('/task-states/') && request.postData ? { payload: JSON.parse(request.postData) } : {}) });
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
  const act = async expression => { const point = await evaluate(`(()=>{const e=${expression};if(!e)throw Error('Control ausente: '+${JSON.stringify(expression)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }); await pause(60); };
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


  const project = context.scrum;
  const config = async () => (await request(project+'/task-states/')).data;
  const patches = () => requests.filter(r=>r.path.endsWith('/task-states/')&&r.method==='PATCH');
  const editor = 'dialog[open]';
  const choose = async name => {
    await click(editor+' button[aria-haspopup="dialog"]');
    await button(name, editor+' [aria-label="Plantillas de estado"]');
    await wait('!document.querySelector(\'[aria-label="Plantillas de estado"]\')');
  };
  const settings = async () => {
    await click('button[aria-label="Ajustes de estados"]');
    await wait('document.querySelector(\'[aria-label="Añadir estado a Activo"]\')');
  };
  const listing = async () => {
    await send('Page.navigate',{url:'http://localhost:5189/proyectos/'+project});
    await wait('document.querySelector(".gm-task-list")');
  };
  await login('admin');
  await listing();
  const before = await config();
  const childBefore = await detail(project,context.scrum_child);
  assert.equal(childBefore.state_category,'active');
  await click('button[aria-label="Buscar tareas"]');
  await input('input[name="task_search"]','COMPLETADO aún activo');
  await settings();
  await choose('Marketing');
  assert.equal(await evaluate('document.querySelectorAll("dialog footer button").length'),2);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("dialog footer button")).filter(e=>e.textContent==="Guardar como plantilla").length'),1);
  assert.equal(await evaluate('document.querySelector("dialog").innerText.includes("Reasignar estados utilizados")||Boolean(document.querySelector("dialog textarea,dialog select[name*=reason]"))'),false);
  for(const name of ['No iniciado','Activo','Completado','Cerrado']) assert.ok(await evaluate('Boolean(document.querySelector('+JSON.stringify('dialog section[aria-label="'+name+'"]')+'))'));
  await button('Guardar como plantilla',editor);
  await wait('document.querySelector(\'input[name="template_name"]\')');
  await key('Escape');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),1);
  await button('Guardar como plantilla',editor);
  await input('input[name="template_name"]','Marketing sintético independiente');
  await button('Guardar','dialog:last-of-type');
  await wait('!document.querySelector(\'input[name="template_name"]\')');
  assert.deepEqual(await config(),before);
  assert.equal(patches().length,0);
  await capture('01_editor_sin_reasignacion.png');
  checks.push('Cuatro categorías, un botón de guardar sin menú; guardar una plantilla y Escape por capas no aplican el flujo');

  await button('Aplicar cambios',editor);
  await wait('!document.querySelector("dialog[open]")');
  await wait('document.querySelector(\'[data-task-id="'+context.scrum_child+'"]\')?.innerText.includes("EN EJECUCIÓN")');
  const applied = await config();
  const child = await detail(project,context.scrum_child);
  assert.equal(child.state_name,'EN EJECUCIÓN');
  assert.equal(child.state_category,'active');
  assert.equal(child.parent_id,childBefore.parent_id);
  assert.equal(child.progress,childBefore.progress);
  assert.equal(await evaluate('document.querySelector(\'input[name="task_search"]\').value'),'COMPLETADO aún activo');
  assert.equal(patches().length,1);
  assert.deepEqual(Object.keys(patches()[0].payload).sort(),['revision','states','template']);
  assert.equal(requests.filter(r=>r.method==='PATCH'&&/\/tasks\/\d+\/$/.test(r.path)).length,0);
  const history=(await request(project+'/tasks/'+context.scrum_child+'/activity/')).data;
  const events=history.items.flatMap(item=>item.events);
  assert.equal(events.filter(e=>e.field==='state_code').length,1);
  checks.push('Scrum COMPLETADO se conserva en Activo por posición; un PATCH, búsqueda intacta e historial único sin motivos');

  await click('a[href$="?vista=tablero"]');
  await wait('document.querySelector(\'section[aria-label="Tablero"]\')');
  assert.ok(await evaluate('document.querySelector(\'section[aria-label="EN EJECUCIÓN"]\')?.innerText.includes("COMPLETADO aún activo")'));
  await act('Array.from(document.querySelectorAll(\'section[aria-label="EN EJECUCIÓN"] div\')).find(e=>e.textContent==="COMPLETADO aún activo")');
  await wait('document.querySelector(\'dialog section[aria-label="Propiedades de la tarea"]\')');
  assert.ok(await evaluate('document.querySelector(\'dialog section[aria-label="Propiedades de la tarea"]\').innerText.includes("EN EJECUCIÓN")'));
  await key('Escape');
  await listing();
  assert.ok(await evaluate('document.body.innerText.includes("EN EJECUCIÓN")'));
  checks.push('Lista, Kanban y detalle compartido coherentes; configuración y tareas persisten al recargar');

  const added = await request(project+'/task-states/',{method:'PATCH',body:JSON.stringify({
    template:'custom',revision:applied.revision,states:[...applied.states,{code:'draft_browser_done',name:'VALIDADO',category:'done',color:'#0d9488'}],
  })});
  assert.equal(added.status,200);
  const done=added.data.states.find(s=>s.category==='done');
  const created=await request(project+'/tasks/',{method:'POST',body:JSON.stringify({name:'Completado sintético',state_code:done.code})});
  assert.equal(created.status,201,JSON.stringify(created.data));
  await listing();
  await settings();await choose('Marketing');
  const baseline=await config();
  await button('Aplicar cambios',editor);
  await wait('document.querySelector(\'section[aria-label="Completado"] [role="alert"]\')');
  assert.deepEqual(await config(),baseline);
  assert.ok(await evaluate('document.querySelector(\'section[aria-label="Completado"] [role="alert"]\')===document.activeElement'));
  await capture('02_error_en_categoria.png');
  await click('button[aria-label="Añadir estado a Completado"]');
  await input('input[name="state_name"]','VALIDADO NUEVO');await key('Enter');
  await button('Aplicar cambios',editor);
  await wait('!document.querySelector("dialog[open]")');
  const repaired=await detail(project,created.data.id);
  assert.equal(repaired.state_category,'done');
  assert.equal(repaired.state_name,'VALIDADO NUEVO');
  checks.push('Completado con tareas y sin destino: error inline con foco y cero escrituras; Añadir estado permite corregir y aplicar');

  await settings();
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await pause(150);
  assert.ok(await evaluate('(()=>{const r=document.querySelector("dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()'));
  assert.ok(await evaluate('Array.from(document.querySelectorAll("dialog footer button")).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})'));
  await button('Guardar como plantilla',editor);
  await wait('document.querySelector(\'input[name="template_name"]\')');
  await key('Escape');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),1);
  await capture('03_editor_movil.png');
  await key('Escape');
  await wait('!document.querySelector("dialog[open]")');
  checks.push('390 px: pie compacto sin recortes, foco y Escape del formulario de nombre antes del editor');
  assert.deepEqual(errors,[]);
  await writeFile(path.join(output,'navegador.json'),JSON.stringify({date:new Date().toISOString(),checks,errors,requests},null,2));
  console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
} catch (failure) {
  await capture?.('_ultima_falla.png');
  if(evaluate)await writeFile(path.join(output,'error.json'),JSON.stringify({message:failure.message,checks,errors,page:await evaluate('document.body.innerText').catch(()=>''),requests},null,2));
  throw failure;
} finally {
  socket?.close();chrome.kill();await pause(400);await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});
}
