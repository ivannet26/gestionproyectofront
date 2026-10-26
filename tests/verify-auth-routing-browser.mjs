import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

assert.ok(process.env.GM_QA_SECRETS_PATH && process.env.GM_BROWSER_REPORT_DIR);
assert.ok(!process.env.VITE_API_BASE_URL, 'La regresión debe probar el fallback al mismo origen');
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, 'utf8'));
const output = path.join(process.env.GM_BROWSER_REPORT_DIR, 'auth-routing-20261024');
await mkdir(output, { recursive: true });
const origin = 'http://localhost:5189';
const profile = await mkdtemp(path.join(tmpdir(), 'gm-auth-routing-chrome-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const requests = [], errors = [], checks = [], pending = new Map(), network = new Map();
let socket, sequence = 0, documents = 0, phase = 'arranque';
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await pause(100); }
  }
  assert.ok(port, 'Chrome no inició');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item?.reject(Error(message.error.message)); else item?.resolve(message.result);
      return;
    }
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) documents++;
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request, url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) network.set(message.params.requestId, { phase, url: request.url, path: url.pathname, method: request.method });
    }
    if (message.method === 'Network.responseReceived') {
      const entry = network.get(message.params.requestId);
      if (entry) {
        entry.status = message.params.response.status;
        entry.contentType = message.params.response.mimeType;
        requests.push(entry);
      }
    }
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = async expression => {
    for (let attempt = 0; attempt < 140; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw Error('Tiempo agotado: ' + expression);
  };
  const click = async expression => {
    await wait(expression);
    const point = await evaluate(`(()=>{const e=${expression};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  };
  const navigate = async (method, params = {}) => {
    const previous = documents;
    await send(method, params);
    for (let attempt = 0; attempt < 100 && documents === previous; attempt++) await pause(100);
    assert.ok(documents > previous, 'No se confirmó la nueva navegación');
    await wait('document.readyState === "complete"');
  };
  const input = async (selector, value) => {
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  };
  const inPhase = (name, suffix) => requests.filter(item => item.phase === name && item.path.endsWith(suffix));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
  await navigate('Page.navigate', { url: `${origin}/proyectos` });
  await wait('document.querySelector("#login-email")');
  assert.equal(inPhase('arranque', '/auth/csrf/')[0]?.status, 200);
  assert.equal(inPhase('arranque', '/auth/csrf/')[0]?.contentType, 'application/json');
  assert.deepEqual(inPhase('arranque', '/auth/refresh/').map(item => item.status), [401]);
  checks.push('Arranque sin sesión: CSRF JSON 200 y una renovación 401 legítima de Django');

  phase = 'login';
  await input('#login-email', credentials.admin.email);
  await input('#login-password', credentials.admin.password);
  await click('document.querySelector("form button[type=submit]")');
  await wait('document.querySelector("aside")');
  for (let attempt = 0; attempt < 100 && !inPhase('login', '/api/projects/').some(item => item.status === 200); attempt++) await pause(100);
  assert.deepEqual(inPhase('login', '/auth/login/').map(item => item.status), [200]);
  assert.ok(inPhase('login', '/api/projects/').some(item => item.status === 200));
  const cookies = (await send('Network.getCookies', { urls: [`${origin}/api/auth/`] })).cookies;
  assert.ok(cookies.some(cookie => cookie.name === 'csrftoken'));
  assert.ok(cookies.some(cookie => cookie.name === 'gm_refresh' && cookie.httpOnly && cookie.path === '/api/auth/'));
  checks.push('Login real 200, cookie CSRF y refresh HttpOnly; Proyectos carga mediante Axios');

  phase = 'proyecto';
  await navigate('Page.navigate', { url: `${origin}/proyectos/${credentials.context.project}` });
  await wait('document.querySelector(".gm-task-list [data-task-id]")');
  assert.ok(requests.some(item => item.phase === phase && item.path.endsWith('/tasks/') && item.status === 200));
  checks.push('Proyecto y Lista integrados cargan por el mismo proxy sin base API explícita');

  phase = 'recarga';
  await navigate('Page.reload');
  await wait('document.querySelector(".gm-task-list [data-task-id]")');
  assert.deepEqual(inPhase('recarga', '/auth/refresh/').map(item => item.status), [200]);
  assert.equal(inPhase('recarga', '/auth/login/').length, 0);
  assert.ok(requests.some(item => item.phase === phase && item.path.endsWith('/tasks/') && item.status === 200));
  checks.push('Recarga conserva la sesión con una única renovación y vuelve a cargar Proyectos');

  phase = 'logout';
  await click(`document.querySelector('button[aria-label="Abrir menú de perfil"]')`);
  await click('Array.from(document.querySelectorAll("[role=menuitem]")).find(e=>e.textContent.includes("Cerrar sesión"))');
  await wait('document.querySelector("#login-email")');
  assert.deepEqual(inPhase('logout', '/auth/logout/').map(item => item.status), [200]);
  assert.equal((await send('Network.getCookies', { urls: [`${origin}/api/auth/`] })).cookies.some(cookie => cookie.name === 'gm_refresh'), false);
  phase = 'recarga-tras-logout';
  await navigate('Page.reload');
  await wait('document.querySelector("#login-email")');
  assert.deepEqual(inPhase(phase, '/auth/refresh/').map(item => item.status), [401]);
  assert.equal(requests.some(item => item.phase === phase && item.path.startsWith('/api/projects/')), false);
  checks.push('Logout borra la cookie de renovación; recargar mantiene el acceso cerrado');

  phase = 'proteccion-csrf';
  assert.equal(await evaluate(`fetch('/api/auth/login/',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)`), 403);
  checks.push('Django conserva CSRF: un POST sin cabecera CSRF recibe 403');
  assert.ok(requests.every(item => new URL(item.url).origin === origin));
  assert.ok(requests.filter(item => item.status === 200).every(item => item.contentType === 'application/json'));
  assert.equal(requests.some(item => item.status === 404 || item.status >= 500), false);
  assert.deepEqual(errors, []);
  await pause(150);
  const serverLog = await readFile(path.join(path.dirname(process.env.GM_QA_SECRETS_PATH), 'server-errors.log'), 'utf8');
  const django = Array.from(serverLog.matchAll(/"(GET|POST) (\/api\/[\w/]+) HTTP\/1\.1" (\d+)/g), match => ({ method: match[1], path: match[2], status: Number(match[3]) }));
  for (const [method, route, status] of [['GET', '/api/auth/csrf/', 200], ['POST', '/api/auth/login/', 200], ['POST', '/api/auth/refresh/', 200], ['POST', '/api/auth/logout/', 200], ['POST', '/api/auth/login/', 403]]) {
    assert.ok(django.some(item => item.method === method && item.path === route && item.status === status), `Falta evidencia en Django: ${method} ${route} ${status}`);
  }
  assert.ok(django.some(item => item.path.endsWith('/tasks/') && item.status === 200));
  checks.push('Registro Django confirma CSRF, login, refresh, Proyectos, logout y rechazo CSRF; sin 404/500 ni excepciones de navegador');
  await writeFile(path.join(output, 'navegador.json'), JSON.stringify({ checks, requests, django, errors }, null, 2));
  console.log(JSON.stringify({ approved: checks.length, checks, report: path.join(output, 'navegador.json') }, null, 2));
} finally {
  socket?.close(); chrome.kill();
  if (chrome.exitCode === null) await new Promise(resolve => chrome.once('exit', resolve));
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await rm(profile, { recursive: true, force: true }); break; } catch { await pause(100); }
  }
}
