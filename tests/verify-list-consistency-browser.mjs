import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = process.env.GM_BROWSER_REPORT_DIR && path.join(process.env.GM_BROWSER_REPORT_DIR, 'list-consistency');
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


  const row = id => '[data-task-id="'+id+'"]:not([data-context])';
  const list = async () => { await send('Page.navigate',{url:'http://localhost:5189/proyectos/'+context.project}); await wait('document.querySelector(".gm-task-list")'); };
  const moves = () => requests.filter(r=>r.method==='POST'&&r.path.endsWith('/move/')).length;
  const drag = async (id,target,shot,ratio=.5,cancel=false,edge=false) => {
    const from=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(row(id))+'+" [data-task-drag-surface]");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...from});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...from,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x+10,y:from.y+2,button:'left',buttons:1});
    await wait('document.querySelector("[data-moving=true]")');
    const to=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(target)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+150,y:r.y+r.height*'+ratio+'}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...to,button:'left',buttons:1});
    await wait('document.querySelector(".gm-task-insertion")');
    assert.equal(await evaluate('document.querySelectorAll(".gm-task-insertion").length'),1);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".gm-task-group")).some(e=>getComputedStyle(e).outlineStyle!=="none")'),false);
    assert.ok(await evaluate('Array.from(document.querySelectorAll(".gm-task-group table")).every(table=>Array.from(table.querySelectorAll("tr[data-task-id]")).every(row=>Array.from(row.cells).every((cell,index)=>Math.abs(cell.getBoundingClientRect().width-table.querySelectorAll("th")[index].getBoundingClientRect().width)<2)))'));
    if(edge){
      const near=await evaluate('(()=>{const n=document.querySelector(\'[aria-label="Tabla de tareas con desplazamiento horizontal"]\'),r=n.getBoundingClientRect();return{x:r.left+180,y:r.bottom-9,scroll:n.scrollTop}})()');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:near.x,y:near.y,button:'left',buttons:1});await pause(250);
      assert.ok(await evaluate('document.querySelector(\'[aria-label="Tabla de tareas con desplazamiento horizontal"]\').scrollTop')>near.scroll);
    }
    if(shot)await capture(shot);
    const before=moves();
    if(cancel)await key('Escape');
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...to,button:'left',clickCount:1});
    await wait('!document.querySelector("[data-moving=true],.gm-task-insertion")');
    if(!cancel){for(let n=0;n<100&&moves()===before;n++)await pause(50);await wait('!document.querySelector(".gm-task-list[aria-busy=true]")');}
    assert.equal(moves(),before+(cancel?0:1));assert.equal(await evaluate('Boolean(document.querySelector("dialog[open]"))'),false);
  };
  const manual = async (id,state) => {
    await click(row(id)+' button[aria-label^="Estado"]');await wait('document.querySelector(":popover-open")');
    await act('Array.from(document.querySelector(":popover-open").querySelectorAll("button")).find(e=>e.querySelector("[data-state='+state+']"))');
    await save();await wait('document.querySelector('+JSON.stringify(row(id)+' [data-state="'+state+'"]')+')');
    assert.equal((await detail(context.project,id)).state_code,state);
  };
  const group = state => 'section[data-group-key="state:'+state+'"]';
  const allDetails = async () => (await request(context.project+'/tasks/')).data;
  await login('admin');await list();
  assert.equal(await evaluate('document.querySelectorAll("[data-task-count]").length'),1);
  assert.equal(await evaluate('document.querySelector("#task-list-grouping").innerText'),"");
  assert.equal(await evaluate('document.body.innerText.includes("tareas únicas visibles")'),false);
  await click(row(context.task)+' button[aria-label^="Expandir subtareas"]');
  const initial=await detail(context.project,context.child);
  for(let round=0;round<2;round++){
    await drag(context.child,group('EN_CURSO')+' h2',round===0?'01_arrastre_subtarea.png':null);
    await wait('document.querySelector('+JSON.stringify(group('EN_CURSO')+' '+row(context.child))+')');
    assert.equal(await evaluate('Boolean(document.querySelector('+JSON.stringify(group('EN_CURSO')+' '+row(context.task))+'))'),false);
    assert.equal(await evaluate('Boolean(document.querySelector('+JSON.stringify(group('EN_CURSO')+' [data-parent-reference="'+context.task+'"]')+'))'),true);
    await drag(context.child,group('PENDIENTE')+' h2');
    await wait('document.querySelector('+JSON.stringify(group('PENDIENTE')+' '+row(context.child))+')');
  }
  for(const state of ['EN_CURSO','PENDIENTE','EN_CURSO'])await manual(context.child,state);
  const saved=await detail(context.project,context.child);
  for(const field of ['parent_id','name','description','assignees','start_date','due_date','labels','priority','estimated_minutes'])assert.deepEqual(saved[field],initial[field],field);
  assert.equal((await detail()).state_code,'PENDIENTE');
  await capture('02_subtareas_estados_distintos.png');
  checks.push('Subtarea ida/vuelta repetida por arrastre y selector; padre intacto y referencia compacta sin propiedades ni doble conteo');
  await drag(context.task,group('EN_CURSO')+' h2');
  assert.equal((await detail()).state_code,'EN_CURSO');
  assert.equal((await detail(context.project,context.child)).state_code,'EN_CURSO');
  await manual(context.task,'PENDIENTE');
  await list();await open(context.project,context.child);
  assert.equal(await evaluate('document.querySelector("dialog [data-state=EN_CURSO]").textContent.includes("EN CURSO")'),true);
  await field('Estado');await button('PENDIENTE',':popover-open');await save();await click('dialog button[aria-label="Cerrar detalle de tarea"]');
  await wait('!document.querySelector("dialog[open]")');
  checks.push('Padre no propaga cambios; selector y detalle comparten códigos y metadatos confirmados; persistencia tras recargar/reabrir');
  await drag(context.reason_task,row(context.related),'03_insercion_entre_filas.png',.15);
  const ordered=await allDetails();
  assert.ok(ordered.findIndex(t=>t.id===context.reason_task)<ordered.findIndex(t=>t.id===context.related));
  await drag(context.reason_task,group('BLOQUEADA')+' h2',null,.5,true);
  await click(group('OBSERVADA')+' h2 button');
  await drag(context.reason_task,group('OBSERVADA')+' h2');
  assert.equal((await detail(context.project,context.reason_task)).state_code,'OBSERVADA');
  await list();
  checks.push('Inserción antes de fila, estado vacío/contraído, Escape sin petición y limpieza del indicador; orden persistente');
  await evaluate('document.querySelector('+JSON.stringify(row(context.reason_task)+' button[aria-label^="Opciones"]')+').focus()');await key('Enter');
  await wait('document.querySelector(\'select[name="move_state"]\')');
  await evaluate('(()=>{const e=document.querySelector(\'select[name="move_state"]\');e.value="EN_CURSO";e.dispatchEvent(new Event("change",{bubbles:true}))})()');
  await button('Confirmar movimiento',':popover-open');await wait('document.querySelector('+JSON.stringify(group('EN_CURSO')+' '+row(context.reason_task))+')');
  assert.equal((await detail(context.project,context.reason_task)).state_code,'EN_CURSO');
  checks.push('Alternativa de teclado accesible dentro de Opciones, sin asa ni espacio reservado');
  const grouping=async mode=>{
    await click('#task-list-grouping');
    await click('button[aria-label^="Opciones de agrupación"]');
    await act('Array.from(document.querySelectorAll("[role=menuitemradio]")).find(e=>e.getClientRects().length&&e.textContent.trim()==='+JSON.stringify(mode)+')');
    await key('Escape');
    await wait('!document.querySelector(":popover-open")');
  };
  for(const mode of ['Persona asignada','Prioridad','Etiquetas','Fecha límite','Estado']){
    await grouping(mode);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".gm-task-group")).some(e=>getComputedStyle(e).outlineStyle!=="none")'),false);
    assert.equal(await evaluate('Boolean(document.querySelector(".gm-task-insertion"))'),false);
    if(mode==='Persona asignada'){
      await evaluate('document.querySelector(\'[aria-label="Tabla de tareas con desplazamiento horizontal"]\').scrollTop=0');
      await capture('04_agrupacion_responsable.png');
    }
    if(mode!=='Estado')assert.equal(await evaluate('Boolean(document.querySelector(\'tr[data-drag-enabled="true"]\'))'),false);
    assert.equal(await evaluate('document.querySelector("[data-task-count]").textContent'), '5 tareas');
  }
  checks.push('Cinco agrupaciones sin marcos ni drop implícito; botón de icono y contador único estable');
  await click('button[aria-label="Buscar tareas"]');await input('input[name="task_search"]','Informe técnico');
  await wait('document.querySelector("[data-task-count]").textContent==="1 de 5 tareas"');await key('Escape');
  await wait('document.querySelector("[data-task-count]").textContent==="5 tareas"');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await pause(100);
  const touchPoint=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(row(context.related)+' button[aria-label^="Opciones"]')+');e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchPoint,radiusX:2,radiusY:2}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait('document.querySelector(\'select[name="move_state"]\')');
  assert.equal(await evaluate('Boolean(document.querySelector("[data-moving=true]"))'),false);
  assert.ok(await evaluate('(()=>{const r=document.querySelector(":popover-open").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()'));
  await key('Escape');
  checks.push('Contador filtrado 1 de 5 sin duplicación; opciones táctiles a 390 px sin iniciar arrastre ni recortar panel');
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  for(let n=0;n<14;n++)assert.equal((await request(context.project+'/tasks/',{method:'POST',body:JSON.stringify({name:'Fila larga para verificar desplazamiento, columnas y truncado '+n+' · texto adicional '.repeat(5),state_code:'PENDIENTE'})})).status,201);
  await list();await drag(context.related,group('PENDIENTE')+' h2',null,.5,true,true);
  checks.push('Autoscroll real al borde inferior, filas largas y columnas estables durante el gesto; cancelación sin petición');
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
