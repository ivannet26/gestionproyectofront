import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

assert.ok(process.env.GM_QA_SECRETS_PATH && process.env.GM_BROWSER_REPORT_DIR);
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, 'utf8'));
const context = credentials.context;
assert.ok(context.grandchild && context.date_cases);
const output = path.join(process.env.GM_BROWSER_REPORT_DIR, 'list-root-drag-20261027');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'gm-list-presentation-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const startedAt = new Date().toISOString();
const checks = [], errors = [], requests = [], network = new Map(), pending = new Map();
let socket, sequence = 0, documents = 0, token, evaluate, capture;
try {
  let port;
  for (let n = 0; n < 100; n++) { try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await pause(100); } }
  assert.ok(port);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject, method }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item?.reject(Error(item.method + ': ' + message.error.message)); else item?.resolve(message.result); return; }
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
  const moves = () => requests.filter(item => item.method === 'POST' && item.path.endsWith('/move/'));
  const manual = async (id, state) => { await click(row(id) + ' button[aria-label^="Estado"]'); await wait('document.querySelector(":popover-open")'); await act(`Array.from(document.querySelector(':popover-open').querySelectorAll('button')).find(e=>e.querySelector('[data-state="${state}"]'))`); await button('Guardar', `document.querySelector(':popover-open')`); await wait('!document.querySelector(":popover-open")'); await wait(`document.querySelector('${row(id)} [data-state="${state}"]')`); assert.equal((await snapshot(id)).state_code, state); };
  const closeDetail = async () => { await click('button[aria-label="Cerrar detalle de tarea"]'); await wait('!document.querySelector("dialog[open]")'); };
  capture = async filename => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(output, filename), Buffer.from(result.data, 'base64')); };
  const surfacePoint = async (id, surface) => {
    if (surface !== 'background') return point(`document.querySelector(${JSON.stringify(row(id) + ' ' + surface)})`);
    return evaluate(`(()=>{const e=document.querySelector('${row(id)} td');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+3,y:r.y+r.height/2}})()`);
  };
  const login = async role => { token = undefined; await send('Network.clearBrowserCookies'); await navigate('http://localhost:5189/proyectos'); await wait('document.querySelector("#login-email")'); await input('#login-email', credentials[role].email); await input('#login-password', credentials[role].password); await click('form button[type="submit"]'); await wait('document.querySelector("aside")'); for (let n = 0; n < 100 && !token; n++) await pause(50); assert.ok(token); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

  await login('admin'); await list();
  const openTree = async () => { for(const id of [context.task,context.child]) if(await evaluate(`document.querySelector('${row(id)} button[aria-label^="Expandir subtareas"]')!==null`)) await expand(id); };
  const assertTree = async state => {
    for(const [id,depth] of [[context.task,0],[context.child,1],[context.grandchild,2]]) {
      assert.equal(await evaluate(`document.querySelector('${row(id)}').dataset.depth`),String(depth));
      assert.equal(await evaluate(`document.querySelector('${row(id)}').closest('[data-group-key]').dataset.groupKey`),'state:'+state);
    }
    const ids=await evaluate('Array.from(document.querySelectorAll("tr[data-task-id]"),e=>e.dataset.taskId)');
    assert.equal(ids.length,new Set(ids).size);
    assert.equal(await evaluate('document.querySelectorAll(".gm-parent-reference").length'),0);
    assert.equal(await evaluate('document.querySelector(".gm-task-list").innerText.includes("junto a su padre")'),false);
  };
  const realWrites = () => requests.filter(r=>['POST','PUT','PATCH','DELETE'].includes(r.method)&&r.path.startsWith('/api/projects/'));
  const attrs = t => ({id:t.id,parent_id:t.parent_id,name:t.name,description:t.description,start_date:t.start_date,due_date:t.due_date,priority:t.priority,labels:t.labels,assignees:t.assignees,estimated_minutes:t.estimated_minutes});
  await openTree();await assertTree('PENDIENTE');
  const initial=await tasks();
  const count=await evaluate(`Number(document.querySelector('${group('PENDIENTE')} h2 button').innerText.match(/([0-9]+) tareas?/)[1])`);
  const rootMembers=initial.filter(t=>t.id===context.task||t.parent_id===context.task||t.parent_id===context.child||t.state_code==='PENDIENTE'&&t.parent_id===null).length;
  assert.equal(count,rootMembers);
  await capture('01_arbol_raiz_pendiente.png');
  await click(row(context.task)+' button[aria-label^="Contraer subtareas"]');
  assert.equal(await evaluate(`document.querySelector('${row(context.child)}')!==null`),false);
  assert.equal(await evaluate(`document.querySelector('${group('EN_CURSO')} tr[data-task-id="${context.child}"]')!==null`),false);
  await openTree();await assertTree('PENDIENTE');
  checks.push('Tres niveles con estados propios distintos, sección de la raíz, contadores inclusivos y sin copias al contraer/expandir');

  const descendantsBefore=initial.filter(t=>[context.child,context.grandchild].includes(t.id));
  await manual(context.child,'EN_REVISION');await assertTree('PENDIENTE');
  assert.deepEqual(attrs(await snapshot(context.child)),attrs(descendantsBefore[0]));
  const grandchildBefore=await snapshot(context.grandchild);
  await list();await openTree();await assertTree('PENDIENTE');
  assert.equal(await evaluate(`document.querySelector('${row(context.child)}').dataset.ownState`),'EN_REVISION');
  await manual(context.task,'EN_CURSO');await assertTree('EN_CURSO');
  assert.equal((await snapshot(context.child)).state_code,'EN_REVISION');
  assert.equal((await snapshot(context.grandchild)).state_code,grandchildBefore.state_code);
  await list();await openTree();await assertTree('EN_CURSO');await capture('02_raiz_cambiada_recarga.png');
  await manual(context.task,'PENDIENTE');
  checks.push('Cambios manuales de hijo y raíz independientes; agrupación idéntica tras guardar, recargar y volver al proyecto');

  const downAt=async p=>{assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y),'Coordenadas de pulsación no disponibles');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});};
  const moveTo=async p=>{assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y),'Coordenadas de movimiento no disponibles');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1});await pause(40);};
  const releaseAt=async p=>{assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y),'Coordenadas al soltar no disponibles');await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await pause(100);};
  const cancelAt=async p=>{await key('Escape');await releaseAt(p);assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),0);assert.equal(await evaluate('Boolean(document.querySelector("dialog[open],:popover-open"))'),false);};
  const startAt=async(id,surface)=>{await evaluate(`document.querySelector('${row(id)}').scrollIntoView({block:'center'})`);const p=await surfacePoint(id,surface);const bounds=await evaluate(`(()=>{const r=document.querySelector('${row(id)}').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`);await downAt(p);await moveTo({x:p.x+10,y:p.y+2});await wait('document.querySelector(".gm-task-list[data-moving=true]")');return{p,bounds};};
  const verifyPreview=async({bounds},dx=10,dy=2)=>{
    const info=await evaluate(`(()=>{const e=document.querySelector('[data-task-preview]'),r=e?.getBoundingClientRect();return e?{x:r.x,y:r.y,width:r.width,height:r.height,task:e.dataset.taskPreview,inert:e.inert,hidden:e.getAttribute('aria-hidden'),controls:e.querySelectorAll('button,a,input,textarea,select,[tabindex],[popover],[role=tooltip]').length,cells:e.querySelectorAll('td').length,rows:e.querySelectorAll('tr').length,pointer:getComputedStyle(e).pointerEvents}:null})()`);
    assert.ok(info);assert.equal(info.rows,1);assert.equal(info.cells,6);assert.equal(info.controls,0);assert.ok(info.inert);assert.equal(info.hidden,'true');assert.equal(info.pointer,'none');
    for(const [key,expected]of Object.entries({x:bounds.x+dx,y:bounds.y+dy,width:bounds.width,height:bounds.height}))assert.ok(Math.abs(info[key]-expected)<1.1,`${key}: ${info[key]} != ${expected}`);
    assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),1);
    assert.ok(await evaluate('document.querySelectorAll(".gm-task-insertion").length<=1'));
    assert.ok(await evaluate('Number(getComputedStyle(document.querySelector("tr[data-dragging=true]")).opacity)<1'));
    const actual=await evaluate(`(()=>{const r=document.querySelector('tr[data-dragging=true]').getBoundingClientRect();return{width:r.width,height:r.height}})()`);
    assert.ok(Math.abs(actual.width-bounds.width)<1.1&&Math.abs(actual.height-bounds.height)<1.1,'La fila original conserva sus dimensiones');
    return info;
  };
  if(!process.env.GM_QA_DRAG_ONLY){
  const beforeClicks=realWrites().length;
  for(const surface of ['[data-task-drag-surface]','button[aria-label^="Persona asignada"]','button[aria-label^="Fecha de inicio"]','button[aria-label^="Fecha límite"]','button[aria-label^="Prioridad"]','button[aria-label^="Estado"]','button[aria-label^="Etiquetas"]','button[aria-label*="subtareas de"]','background']){
    await evaluate(`document.querySelector('${row(context.task)}').scrollIntoView({block:'center'})`);
    if(surface==='background'){const p=await surfacePoint(context.task,surface);await downAt(p);await releaseAt(p);await wait('document.querySelector("dialog[open]")');await closeDetail();continue;}
    await click(row(context.task)+' '+surface);
    if(surface==='[data-task-drag-surface]'){await wait('document.querySelector("dialog[open]")');await closeDetail();}
    else if(surface.includes('subtareas'))await openTree();
    else{await wait('document.querySelector(":popover-open")');await key('Escape');}
  }
  assert.equal(realWrites().length,beforeClicks);
  checks.push('Clic normal en título, fondo, responsable, fechas, prioridad, estado, etiquetas y expansor conserva su acción sin escrituras');

  const surfaces=['[data-task-drag-surface]','button[aria-label^="Persona asignada"]','button[aria-label^="Fecha de inicio"]','button[aria-label^="Fecha límite"]','button[aria-label^="Prioridad"]','button[aria-label^="Estado"]','button[aria-label^="Etiquetas"]','button[aria-label*="subtareas de"]','background'];
  for(const surface of surfaces){const gesture=await startAt(context.task,surface);await verifyPreview(gesture);if(surface==='[data-task-drag-surface]')await capture('03_preview_fila.png');await cancelAt({x:gesture.p.x+10,y:gesture.p.y+2});}
  assert.equal(realWrites().length,beforeClicks);
  checks.push('Arrastre real desde nueve superficies incluidas propiedades y fondo; preview pasiva, seis columnas, punto de agarre estable y Escape sin clic residual');

  await evaluate(`document.querySelector('${row(context.task)}').scrollIntoView({block:'center'})`);
  const samples=await evaluate(`(()=>{const r=document.querySelector('${row(context.task)}'),b=r.getBoundingClientRect();const a=[];for(const dy of [.01,.25,.75,b.height/2,b.height-.75,b.height-.25,b.height-.01])for(const dx of [.01,.25,1,b.width-1,b.width-.25,b.width-.01])a.push({name:'borde',x:b.left+dx,y:b.top+dy});for(const c of r.cells){const q=c.getBoundingClientRect();for(const dx of [.01,.25,1,q.width-1,q.width-.25,q.width-.01])a.push({name:'celda',x:q.left+dx,y:q.top+q.height/2});}return a;})()`);
  const coverage=[];
  for(const p of (process.env.GM_QA_FAST?samples.slice(0,4):samples)){const owner=await evaluate(`document.elementFromPoint(${p.x},${p.y})?.closest('tr[data-task-id]')?.dataset.taskId??null`);await downAt(p);await moveTo({x:p.x+10,y:p.y+2});const actual=await evaluate('document.querySelector("tr[data-dragging=true]")?.dataset.taskId??null');if(owner)assert.equal(actual,owner,JSON.stringify({p,owner,actual}));else assert.ok(actual,JSON.stringify({p,owner,actual}));assert.equal(await evaluate('document.querySelectorAll("tr[data-dragging=true]").length'),1);coverage.push({...p,owner,actual});await cancelAt({x:p.x+10,y:p.y+2});}
  await writeFile(path.join(output,'cobertura-superficie.json'),JSON.stringify(coverage,null,2));
  checks.push(`${coverage.length} puntos reales de bordes, esquinas, padding y separaciones; una sola fila recibe el gesto, incluso en bordes compartidos`);

  await evaluate(`(()=>{window.__qaPointer=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','blur','click'])document.addEventListener(type,e=>{if(e.type!=='pointermove'||window.__qaPointer.at(-1)?.type!=='pointermove')window.__qaPointer.push({type:e.type,buttons:e.buttons,x:e.clientX,y:e.clientY,target:e.target.tagName});},true)})()`);
  await point(`document.querySelector('${row(context.task)} button[aria-label^="Estado"]')`);await pause(100);
  const hold=await surfacePoint(context.task,'button[aria-label^="Estado"]');await downAt(hold);await pause(400);assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),0);await moveTo({x:hold.x+3,y:hold.y+2});assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-list[data-moving=true]"))'),false);await releaseAt({x:hold.x+3,y:hold.y+2});await wait('document.querySelector(":popover-open")');
  const popup=await point(`document.querySelector(':popover-open')`);await downAt(popup);await moveTo({x:popup.x+20,y:popup.y+5});assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),0);await releaseAt({x:popup.x+20,y:popup.y+5});
  await click(':popover-open input[type=search]');await send('Input.insertText',{text:'CURSO'});assert.equal(await evaluate('document.querySelector(":popover-open input").value'),'CURSO');const edit=await point(`document.querySelector(':popover-open input')`);await downAt(edit);await moveTo({x:edit.x+30,y:edit.y+2});assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),0);await releaseAt({x:edit.x+30,y:edit.y+2});await key('Escape');
  checks.push('Pulsación inmóvil, movimiento inferior al umbral, contenido de popovers y edición de búsqueda mantienen interacción propia');
  }
  await evaluate(`(()=>{window.__qaPointer=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','blur','click'])document.addEventListener(type,e=>{if(e.type!=='pointermove'||window.__qaPointer.at(-1)?.type!=='pointermove')window.__qaPointer.push({type:e.type,buttons:e.buttons,x:e.clientX,y:e.clientY,target:e.target.tagName});},true)})()`);

  const stable=attrs(await snapshot(context.child));const childGesture=await startAt(context.child,'button[aria-label^="Prioridad"]');await verifyPreview(childGesture);
  const overState=async(state)=>{for(let n=0;n<150;n++){const geometry=await evaluate(`(()=>{const r=document.querySelector('[role="region"][aria-label^="Tabla de tareas"]').getBoundingClientRect(),h=document.querySelector('${group(state)} h2').getBoundingClientRect();return{top:r.top,bottom:r.bottom,x:r.left+200,header:h.top,y:h.top+h.height/2}})()`);if(geometry.y>geometry.top+45&&geometry.y<geometry.bottom-45){const p={x:geometry.x,y:geometry.y};await moveTo(p);return p;}await moveTo({x:geometry.x,y:geometry.header<geometry.top?geometry.top+4:geometry.bottom-4});await pause(50);}throw Error('No se pudo alcanzar el estado con autoscroll: '+state);};
  const target=await overState('BLOQUEADA');await wait('document.querySelector(".gm-task-insertion")');
  const lineParent=await evaluate(`(()=>{const e=document.querySelector('.gm-task-insertion'),l=e.getBoundingClientRect(),p=document.querySelector('${group('PENDIENTE')}').getBoundingClientRect();return l.top>=p.top&&l.top<=p.bottom})()`);assert.ok(lineParent,'La inserción debe permanecer en el árbol de la raíz');
  await capture('03_subtarea_arrastre_cursor.png');const beforeMove=moves().length;await releaseAt(target);for(let n=0;n<100&&moves().length===beforeMove;n++)await pause(50);assert.equal(moves().at(-1).status,200);assert.equal(await evaluate('Boolean(document.querySelector("dialog[open],:popover-open,[data-task-preview]"))'),false);
  assert.equal((await snapshot(context.child)).state_code,'BLOQUEADA');assert.deepEqual(attrs(await snapshot(context.child)),stable);assert.equal((await snapshot(context.grandchild)).state_code,grandchildBefore.state_code);
  await assertTree('PENDIENTE');await list();await openTree();await assertTree('PENDIENTE');await capture('04_subtarea_recarga_bajo_raiz.png');
  checks.push('Arrastre de subtarea cambia solo su estado, conserva padre/atributos y muestra línea dentro del árbol; jerarquía estable al confirmar y recargar');

  const scrollGesture=await startAt(context.task,'[data-task-drag-surface]');const end=await evaluate(`(()=>{const r=document.querySelector('[role="region"][aria-label^="Tabla de tareas"]').getBoundingClientRect();return{x:r.left+200,y:r.bottom-5}})()`);await moveTo(end);const scrollStart=await evaluate(`document.querySelector('[role="region"][aria-label^="Tabla de tareas"]').scrollTop`);await pause(650);const scrollEnd=await evaluate(`document.querySelector('[role="region"][aria-label^="Tabla de tareas"]').scrollTop`);assert.ok(scrollEnd>scrollStart);await verifyPreview(scrollGesture,end.x-scrollGesture.p.x,end.y-scrollGesture.p.y);await capture('05_preview_autoscroll.png');await cancelAt(end);
  checks.push('Vista previa sigue el cursor durante autoscroll, fuera del recorte de la tabla, y desaparece al cancelar');

  await list();await openTree();const rootAttrs=attrs(await snapshot(context.task));await startAt(context.task,'background');await point(`document.querySelector('${row(context.related)}')`);const rect=await evaluate(`(()=>{const r=document.querySelector('${row(context.related)}').getBoundingClientRect();return{x:r.x+20,y:r.bottom-3}})()`);await moveTo(rect);await wait('document.querySelector(".gm-task-insertion")');const reorderCount=moves().length;await releaseAt(rect);for(let n=0;n<100&&moves().length===reorderCount;n++)await pause(50);assert.equal(moves().at(-1).status,200);const afterReorder=await tasks();assert.ok(afterReorder.findIndex(t=>t.id===context.task)>afterReorder.findIndex(t=>t.id===context.related));assert.deepEqual(attrs(await snapshot(context.task)),rootAttrs);assert.equal((await snapshot(context.task)).state_code,'PENDIENTE');
  await list();await openTree();await assertTree('PENDIENTE');await capture('06_reordenamiento_persistido.png');
  checks.push('Reordenamiento válido entre raíces hermanas, sin cambios de padre, estado o propiedades, confirmado tras recarga');

  const stale=await snapshot(context.related);assert.equal((await request(`${context.project}/tasks/${context.related}/move/`,{method:'POST',body:JSON.stringify({state_code:'BLOQUEADA',before_id:null,expected_revision:stale.move_revision})})).status,200);
  await startAt(context.related,'[data-task-drag-surface]');const conflictTarget=await overState('EN_REVISION');const conflicts=moves().length;await releaseAt(conflictTarget);await wait('document.querySelector(".gm-task-list [role=alert]")');assert.equal(moves().length,conflicts+1);assert.equal(moves().at(-1).status,409);await pause(300);assert.equal(moves().length,conflicts+1);assert.equal(await evaluate('document.querySelectorAll("[data-task-preview]").length'),0);assert.equal((await snapshot(context.related)).state_code,'BLOQUEADA');await button('Actualizar lista');await wait('!document.querySelector(".gm-task-list [role=alert]")');
  checks.push('409 real sin reintento, vista previa limpiada, estado confirmado conservado y actualización explícita');
  assert.ok(requests.filter(r=>r.payload&&(r.path.endsWith('/state/')||r.path.endsWith('/move/'))).every(r=>!('reason'in r.payload)));
  await click('a[href$="?vista=tablero"]');await wait('document.querySelector("section[aria-label=Tablero]")');const own=(await snapshot(context.child));assert.equal(await evaluate(`Boolean(document.querySelector('section[aria-label="${own.state_name}"] [aria-label="${own.name}"]'))`),true);await click('a[href$="?vista=lista"]');await wait('document.querySelector(".gm-task-list")');
  checks.push('Tablero conserva su agrupación por estados propios; Lista, detalle y tablero comparten estados persistidos sin motivos');
  await login('worker');await navigate('http://localhost:5189/proyectos/'+context.readonly);await wait(`document.querySelector('${row(context.readonly_task)}')`);assert.equal(await evaluate(`document.querySelector('${row(context.readonly_task)}').hasAttribute('data-drag-enabled')`),false);
  checks.push('Permisos de lectura preservados: sin arrastre ni cambio de estado para trabajador');
  assert.deepEqual(errors,[]);await writeFile(path.join(output,'navegador.json'),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),browser:await send('Browser.getVersion'),checks,requests,errors},null,2));console.log(JSON.stringify({approved:checks.length,checks},null,2));
}catch(failure){if(capture)await capture('fallo.png');if(evaluate)console.error(JSON.stringify({error:String(failure),checks,errors,page:await evaluate('({href:location.href,ready:document.readyState,pointers:window.__qaPointer,html:document.documentElement.outerHTML.slice(0,150)})'),visible:await evaluate('document.body.innerText.slice(-1200)')}));throw failure;}finally{socket?.close();chrome.kill();if(chrome.exitCode===null)await new Promise(resolve=>chrome.once('exit',resolve));if(path.dirname(path.resolve(profile))===path.resolve(tmpdir())&&path.basename(profile).startsWith('gm-list-presentation-'))await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}

