import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { chromium } from "file:///C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const data = secrets.context, output = process.env.GM_BROWSER_REPORT_DIR;
const origin = "http://localhost:5189", api = "http://localhost:8819/api/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const records = [], network = [], errors = [], contexts = [];
const hash = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);
const day = (offset) => { const [year, month, date] = data.today.split("-").map(Number); const value = new Date(year, month - 1, date + offset, 12); return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`; };
const route = (id = data.subject, project = data.project) => `projects/${project}/tasks/${id}/`;
function observe(page, name) {
  page.on("pageerror", (error) => errors.push({ context: name, message: error.message.slice(0, 400) }));
  page.on("response", (response) => {
    const request = response.request(), pathname = new URL(response.url()).pathname;
    if (!pathname.startsWith("/api/")) return;
    const record = { context: name, path: pathname, method: request.method(), status: response.status() };
    if (request.method() === "PATCH" && /\/tasks\/\d+\/$/.test(pathname)) {
      const body = request.postDataJSON(); record.fields = Object.keys(body).sort();
      record.expected_calendar_revision = body.expected_calendar_revision;
      if (body.calendar_intent_id) record.intention_hash = hash(body.calendar_intent_id);
    }
    network.push(record);
  });
}
async function session(role, name) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, timezoneId: "America/Lima" }); contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(12000); observe(page, name);
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets[role].password);
  const login = responseFor(page, "auth/login/", "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const result = await login; assert.equal(result.status(), 200);
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return { page, context, token: (await result.json()).access, name };
}
function responseFor(page, resource, method = "PATCH") {
  return page.waitForResponse((response) => new URL(response.url()).pathname === "/api/" + resource && response.request().method() === method);
}
async function request(client, resource, method = "GET", payload) {
  const cookies = await client.context.cookies(); const csrf = cookies.find((cookie) => cookie.name === "csrftoken")?.value;
  const reply = await client.context.request.fetch(api + resource, { method, headers: { Authorization: "Bearer " + client.token, Origin: origin, ...(csrf ? { "X-CSRFToken": csrf } : {}) }, data: payload, maxRetries: 0 });
  return { status: reply.status(), body: reply.status() === 204 ? null : await reply.json() };
}
async function snapshot(client, id = data.subject, project = data.project) { const reply = await request(client, route(id, project)); assert.equal(reply.status,200); return reply.body.task; }
async function history(client, id = data.subject, project = data.project) {
  const events = []; let cursor = 0;
  for (let page = 0; page < 10; page++) {
    const reply = await request(client, route(id,project) + "activity/?cursor=" + cursor); assert.equal(reply.status,200);
    for (const group of reply.body.items) for (const event of group.events) if (["start_date","due_date"].includes(event.field)) events.push({ id: event.id, operation: event.operation_id ?? group.id, field: event.field });
    if (reply.body.next_cursor === null) return events; cursor = reply.body.next_cursor;
  }
  throw new Error("Unexpected history size in bounded QA fixture");
}
async function list(client, project = data.project) {
  await client.page.goto(origin + "/proyectos/" + project);
  await client.page.locator(".gm-task-list").waitFor();
  await client.page.locator("tr[data-task-id]").first().waitFor();
}
function row(client, id = data.subject) { return client.page.locator(`tr[data-task-id="${id}"]`).first(); }
async function property(client, field, detail = false, id = data.subject) {
  const parent = detail ? client.page.locator('dialog[open] section[aria-label="Propiedades de la tarea"]') : row(client,id);
  await parent.locator(`button[id$="-${field}"]`).click();
  const panel = client.page.locator(":popover-open"); await panel.waitFor(); return panel;
}
async function pick(panel, date) {
  for (let step=0;step<24 && await panel.locator(`[data-date="${date}"]`).count()===0;step++) {
    const first=await panel.locator("button[data-date]").first().getAttribute("data-date");
    await panel.getByRole("button",{name:date<first?"Mes anterior":"Mes siguiente",exact:true}).click();
  }
  await panel.locator(`[data-date="${date}"]`).click();
}
async function save(client, panel, expectedStatus = 200, id = data.subject) {
  const waiting = responseFor(client.page, route(id));
  await panel.getByRole("button", { name: /^(Guardar|Reintentar)$/, exact: true }).last().click();
  const reply = await waiting; assert.equal(reply.status(), expectedStatus);
  return { status: reply.status(), body: await reply.json(), sent: reply.request().postDataJSON() };
}
async function selected(client, field, date, detail = false, id = data.subject) {
  const panel = await property(client, field, detail, id);
  if (date === null) assert.equal(await panel.getByRole("button", { name: "Quitar fecha", exact: true }).isDisabled(), true);
  else assert.equal(await panel.locator(`[data-date="${date}"]`).getAttribute("aria-selected"), "true");
  await client.page.keyboard.press("Escape");
}
async function openDetail(client, id = data.subject) {
  await row(client,id).locator("button[title]").filter({ hasText: id === data.subject ? "Ventana concurrente QA" : id === data.parent ? "Padre de calendario QA" : "Subtarea de calendario QA" }).first().click();
  const dialog = client.page.locator("dialog[open]"); await dialog.locator('section[aria-label="Propiedades de la tarea"]').waitFor(); return dialog;
}
async function check(name, execute) {
  try { const details = await execute(); records.push({ name, status: "Aprobado", details }); console.log("OK " + name); }
  catch (error) {
    records.push({ name, status: "Fallido", error: error.message.slice(0,700) }); console.log("FAIL " + name + ": " + error.message.slice(0,200));
    const page = contexts[0]?.pages()[0];
    await page?.screenshot({ path: path.join(output, "fallo_" + records.length + ".png") }).catch(()=>{});
    if (page) await writeFile(path.join(output,"fallo_"+records.length+".txt"),await page.locator("body").innerText());
    throw error;
  }
}
let a,b,worker,lostPayload;
try {
  a=await session("admin","A");b=await session("admin_b","B");assert.notEqual(a.context,b.context);assert.notEqual(a.token,b.token);
  await check("Montaje y recarga reales establecen el ciclo antes de las cargas",async()=>{
    await list(a);await a.page.reload();await a.page.locator(".gm-task-list").waitFor();await row(a).waitFor();
    assert.equal(await a.page.getByText("La vista o la sesión cambió. Vuelve a consultar la tarea.",{exact:true}).count(),0);
    await a.page.screenshot({path:path.join(output,"00_montaje_actual.png")});
    return {loaded:true,reloaded:true,scope_error:false};
  });
  await check("Dos sesiones leen la misma revisión; 409 conserva borrador, consulta y reaplicación explícita",async()=>{
    await list(a);await list(b);
    const base=await snapshot(a), before=await history(a);
    const first=await property(a,"due_date"),second=await property(b,"due_date");
    await pick(first,day(20));const saved=await save(a,first);
    await pick(second,day(21));const conflict=await save(b,second,409);
    assert.equal(conflict.sent.expected_calendar_revision,base.calendar_revision);assert.equal(saved.sent.expected_calendar_revision,base.calendar_revision);
    assert.equal(conflict.body.code,"calendar_revision_conflict");
    assert.equal(await second.locator(`[data-date="${day(21)}"]`).getAttribute("aria-selected"),"true");
    assert.equal(await second.getByRole("button",{name:"Reintentar",exact:true}).isDisabled(),true);
    await b.page.screenshot({path:path.join(output,"01_conflicto_borrador.png")});
    await second.getByRole("button",{name:"Consultar fechas vigentes",exact:true}).click();
    await second.getByText("Revisión "+saved.body.calendar_revision+".",{exact:false}).waitFor();
    assert.equal(await second.locator(`[data-date="${day(21)}"]`).getAttribute("aria-selected"),"true");
    assert.equal(network.filter(item=>item.context==="B"&&item.method==="PATCH"&&item.path==="/api/"+route()).length,1);
    await b.page.screenshot({path:path.join(output,"02_consulta_sin_replay.png")});
    await second.getByRole("button",{name:"Preparar nueva intención sobre esta revisión",exact:true}).click();
    const reapplied=await save(b,second);
    assert.notEqual(reapplied.sent.calendar_intent_id,conflict.sent.calendar_intent_id);
    assert.equal(reapplied.sent.expected_calendar_revision,saved.body.calendar_revision);
    assert.deepEqual(Object.keys(reapplied.sent).sort(),["calendar_intent_id","due_date","expected_calendar_revision"]);
    const final=await snapshot(a);assert.equal(final.due_date,day(21));assert.equal(BigInt(final.calendar_revision),BigInt(base.calendar_revision)+2n);
    assert.equal((await history(a)).length,before.length+2);
    await list(b);await selected(b,"due_date",day(21));
    return { initial_revision:base.calendar_revision, final_revision:final.calendar_revision, statuses:[200,409,200], no_automatic_replay:true, history_date_events:2 };
  });
  await check("Lista y detalle conservan límite null, fecha histórica y persistencia",async()=>{
    await list(a);const before=await snapshot(a);const dialog=await openDetail(a);
    const date=await property(a,"start_date",true);await pick(date,day(-8));const first=await save(a,date);
    assert.equal(first.body.start_date,day(-8));assert.equal(first.body.parent_id,before.parent_id);assert.equal(first.body.state_code,before.state_code);
    const due=await property(a,"due_date",true);await due.getByRole("button",{name:"Quitar fecha",exact:true}).click();await save(a,due);
    assert.equal((await snapshot(a)).due_date,null);await a.page.screenshot({path:path.join(output,"03_detalle_historico_sin_limite.png")});
    await dialog.getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();
    assert.match(await row(a).locator('button[id$="-due_date"]').innerText(),/Sin fecha/);
    await list(a);await selected(a,"start_date",day(-8));assert.match(await row(a).locator('button[id$="-due_date"]').innerText(),/Sin fecha/);
    return {historical_start:day(-8),deadline:null,reloaded:true};
  });

  await check("Formulario accesible cambia ambos extremos en un solo PATCH y una operación de historial",async()=>{
    await list(a);const before=await snapshot(a),events=await history(a),dialog=await openDetail(a);
    await dialog.getByRole("button",{name:"Editar datos",exact:true}).click();
    const form=a.page.getByRole("dialog",{name:"Editar datos de tarea",exact:true});await form.waitFor();
    await form.locator("#task-start").click();let pop=a.page.locator(":popover-open");await pick(pop,day(5));
    await form.locator("#task-due").click();pop=a.page.locator(":popover-open");await pick(pop,day(5));
    const waiting=responseFor(a.page,route());await form.getByRole("button",{name:"Guardar cambios",exact:true}).click();
    const result=await waiting;assert.equal(result.status(),200);const body=await result.json(),sent=result.request().postDataJSON();
    assert.deepEqual(Object.keys(sent).sort(),["calendar_intent_id","due_date","expected_calendar_revision","start_date"]);
    assert.equal(body.start_date,day(5));assert.equal(body.due_date,day(5));assert.equal(BigInt(body.calendar_revision),BigInt(before.calendar_revision)+1n);
    for(const field of ["name","parent_id","state_code","responsible_id","priority","description","labels"])assert.deepEqual(body[field],before[field]);
    const added=(await history(a)).filter(event=>!events.some(old=>old.id===event.id));assert.equal(added.length,2);assert.equal(new Set(added.map(event=>event.operation)).size,1);
    await list(a);await selected(a,"start_date",day(5));await selected(a,"due_date",day(5));
    await a.page.screenshot({path:path.join(output,"04_ventana_de_un_dia.png")});
    return {fields:Object.keys(sent).sort(),one_day:true,revision_increment:1,history_fields:added.map(event=>event.field),history_operations:1};
  });
  await check("Tablero abre el detalle compartido y confirma una fecha sin desincronizar Lista",async()=>{
    await a.page.getByRole("navigation",{name:"Vistas del proyecto",exact:true}).getByRole("link",{name:"Tablero",exact:true}).click();
    await a.page.getByRole("button",{name:"Ventana concurrente QA",exact:true}).click();
    const dialog=a.page.locator("dialog[open]");await dialog.locator('section[aria-label="Propiedades de la tarea"]').waitFor();
    const pop=await property(a,"due_date",true);await pick(pop,day(6));const saved=await save(a,pop);
    assert.deepEqual(Object.keys(saved.sent).sort(),["calendar_intent_id","due_date","expected_calendar_revision"]);
    await selected(a,"due_date",day(6),true);await a.page.screenshot({path:path.join(output,"09_tablero_detalle_compartido.png")});
    await dialog.getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();
    await a.page.getByRole("navigation",{name:"Vistas del proyecto",exact:true}).getByRole("link",{name:"Lista",exact:true}).click();
    await selected(a,"due_date",day(6));await list(a);await selected(a,"due_date",day(6));
    return {board_detail:true,single_field:true,list_synchronized:true,reloaded:true};
  });
  await check("Respuesta perdida tras commit: misma clave; replay demorado no revierte una edición posterior",async()=>{
    await list(a);const events=await history(a);let lost;
    const target=api+route();
    const lose=async intercepted=>{
      if(intercepted.request().method()!=="PATCH")return intercepted.continue();
      const response=await intercepted.fetch({maxRetries:0});assert.equal(response.status(),200);
      lost={sent:intercepted.request().postDataJSON(),body:await response.json()};await intercepted.abort("failed");
    };
    await a.page.route(target,lose);
    let pop=await property(a,"due_date");await pick(pop,day(22));await pop.getByRole("button",{name:"Guardar",exact:true}).click();
    await pop.getByText(/No se pudo confirmar el resultado/).waitFor();assert.ok(lost);
    lostPayload=lost.sent;const committed=await snapshot(b);assert.equal(committed.due_date,day(22));
    assert.equal((await history(b)).length,events.length+1);
    await a.page.unroute(target,lose);
    await list(b);let other=await property(b,"due_date");await pick(other,day(23));const later=await save(b,other);
    let arrived,release;const held=new Promise(resolve=>{arrived=resolve;}),delivery=new Promise(resolve=>{release=resolve;});let replay;
    const hold=async intercepted=>{
      if(intercepted.request().method()!=="PATCH" || replay || intercepted.request().postDataJSON().calendar_intent_id!==lost.sent.calendar_intent_id)return intercepted.continue();
      const response=await intercepted.fetch({maxRetries:0});assert.equal(response.status(),200);replay={sent:intercepted.request().postDataJSON(),body:await response.json()};arrived();await delivery;await intercepted.fulfill({response});
    };
    await a.page.route(target,hold);
    const replayReply=a.page.waitForResponse(response=>response.url()===target && response.request().method()==="PATCH" && response.request().postDataJSON().calendar_intent_id===lost.sent.calendar_intent_id);await pop.getByRole("button",{name:"Reintentar",exact:true}).click();await held;
    assert.deepEqual(replay.sent,lost.sent);assert.equal(replay.body.calendar_receipt.replayed,true);assert.equal(replay.body.calendar_revision,later.body.calendar_revision);
    await a.page.keyboard.press("Escape");const dialog=await openDetail(a);
    pop=await property(a,"start_date",true);await pick(pop,day(-7));
    const capturedRevision=replay.body.calendar_revision;const newest=await save(a,pop);
    await writeFile(path.join(output,"replay_diagnostico.json"),JSON.stringify({held_revision:capturedRevision,new_revision:newest.body.calendar_revision,new_fields:Object.keys(newest.sent),held_fields:Object.keys(replay.sent),same_new_key:newest.sent.calendar_intent_id===replay.sent.calendar_intent_id},null,2));
    assert.ok(BigInt(newest.body.calendar_revision)>BigInt(capturedRevision));
    release();await replayReply;await a.page.unroute(target,hold);
    assert.equal(await dialog.isVisible(),true);await selected(a,"start_date",day(-7),true);
    const final=await snapshot(b);assert.equal(final.start_date,day(-7));assert.equal(final.due_date,day(23));
    assert.equal((await history(b)).length,events.length+3);
    await a.page.screenshot({path:path.join(output,"05_replay_sin_retroceso.png")});
    await dialog.getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();
    return {same_intention:true,intention_hash:hash(lost.sent.calendar_intent_id),original_revision:lost.sent.expected_calendar_revision,replayed_revision:replay.body.calendar_revision,final_revision:final.calendar_revision,history_date_events:3,no_duplicate_history:true,new_editor_kept_open:true};
  });
  await check("Errores reales 400 y 409 preservan calendario e historial; límites de familia y proyecto",async()=>{
    const before=await snapshot(a),events=await history(a),child=await snapshot(a,data.child),parent=await snapshot(a,data.parent),familyEvents=await history(a,data.parent);
    const attempts=[
      {resource:route(),body:{due_date:null},status:400},
      {resource:route(),body:{start_date:day(-31),expected_calendar_revision:before.calendar_revision,calendar_intent_id:randomUUID()},status:400},
      {resource:route(),body:{due_date:day(61),expected_calendar_revision:before.calendar_revision,calendar_intent_id:randomUUID()},status:400},
      {resource:route(data.child),body:{due_date:day(21),expected_calendar_revision:child.calendar_revision,calendar_intent_id:randomUUID()},status:400},
      {resource:route(data.parent),body:{start_date:day(-4),expected_calendar_revision:parent.calendar_revision,calendar_intent_id:randomUUID()},status:400},
      {resource:route(),body:{due_date:null,expected_calendar_revision:"1",calendar_intent_id:randomUUID()},status:409,code:"calendar_revision_conflict"},
      {resource:route(),body:{...lostPayload,due_date:day(24)},status:409,code:"calendar_intent_reused"},
    ];
    for(const item of attempts){const reply=await request(a,item.resource,"PATCH",item.body);assert.equal(reply.status,item.status);if(item.code)assert.equal(reply.body.code,item.code);}
    assert.deepEqual(await snapshot(a),before);assert.deepEqual(await snapshot(a,data.child),child);assert.deepEqual(await snapshot(a,data.parent),parent);
    assert.equal((await history(a)).length,events.length);assert.equal((await history(a,data.parent)).length,familyEvents.length);
    return {statuses:attempts.map(item=>item.status),unchanged:true,history_unchanged:true,scope:"API real, sin forzar controles inválidos"};
  });
  await check("Un límite familiar cambia durante la edición: 400 visible conserva borrador y estado confirmado",async()=>{
    await list(a);
    const toggle=row(a,data.parent).getByRole("button",{name:/Expandir subtareas/});
    if(await toggle.count())await toggle.click();
    await row(a,data.child).waitFor();
    const before=await snapshot(a,data.child),events=await history(a,data.child),parent=await snapshot(b,data.parent);
    const pop=await property(a,"due_date",false,data.child);await pick(pop,day(19));
    const changed=await request(b,route(data.parent),"PATCH",{due_date:day(15),expected_calendar_revision:parent.calendar_revision,calendar_intent_id:randomUUID()});assert.equal(changed.status,200);
    const invalid=await save(a,pop,400,data.child);
    assert.equal(await pop.locator(`[data-date="${day(19)}"]`).getAttribute("aria-selected"),"true");
    await pop.getByRole("alert").first().waitFor();
    const confirmed=await snapshot(a,data.child);
    const scalar=value=>Object.fromEntries(Object.entries(value).filter(([field])=>field!=="move_revision"));
    assert.deepEqual(scalar(confirmed),scalar(before));assert.equal((await history(a,data.child)).length,events.length);
    await a.page.screenshot({path:path.join(output,"08_validacion_familia_borrador.png")});
    await a.page.keyboard.press("Escape");await list(a);
    return {status:invalid.status,draft_preserved:true,child_confirmed_unchanged:true,history_unchanged:true};
  });
  await check("Creación por formulario y subtarea rápida conservan el contrato inicial sin precondición",async()=>{
    await list(a);await a.page.getByRole("button",{name:"Crear nueva tarea",exact:true}).click();
    const form=a.page.getByRole("dialog",{name:"Nueva tarea",exact:true});await form.locator("#task-name").fill("Alta de calendario QA");
    let waiting=responseFor(a.page,`projects/${data.project}/tasks/`,"POST");
    await form.getByRole("button",{name:"Crear tarea",exact:true}).click();let reply=await waiting;assert.equal(reply.status(),201);
    const created=(await reply.json()).task??await reply.json(),sent=reply.request().postDataJSON();
    assert.equal(sent.expected_calendar_revision,undefined);assert.equal(sent.calendar_intent_id,undefined);assert.equal(created.calendar_revision,"1");assert.ok(created.start_date>=data.today);
    await row(a,created.id).waitFor();
    const dialog=await openDetail(a,data.parent);await dialog.getByRole("button",{name:"+ Añadir tarea",exact:true}).click();
    const quick=dialog.getByRole("form",{name:"Creación rápida de tarea",exact:true});await quick.getByPlaceholder("Nombre de la tarea…",{exact:true}).fill("Subtarea rápida calendario QA");
    waiting=responseFor(a.page,`projects/${data.project}/tasks/`,"POST");await quick.getByRole("button",{name:"Guardar",exact:true}).click();reply=await waiting;assert.equal(reply.status(),201);
    const child=(await reply.json()).task??await reply.json(),childSent=reply.request().postDataJSON();
    assert.equal(childSent.expected_calendar_revision,undefined);assert.equal(childSent.calendar_intent_id,undefined);assert.equal(child.calendar_revision,"1");assert.equal(child.parent_id,data.parent);
    await dialog.getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();await list(a);
    assert.equal((await snapshot(a,created.id)).calendar_revision,"1");assert.equal((await snapshot(a,child.id)).parent_id,data.parent);
    return {statuses:[201,201],initial_revision:"1",no_edit_preconditions:true,parent_preserved:true,reloaded:true};
  });
  await check("Trabajador y administrador conservan permisos de lectura/edición en interfaz y API",async()=>{
    worker=await session("worker","trabajador");await list(worker,data.readonly);
    const readRow=row(worker,data.readonly_task),control=readRow.locator('button[id$="-due_date"]');
    assert.equal(await control.getAttribute("aria-disabled"),"true");
    const before=await snapshot(a,data.readonly_task,data.readonly),events=await history(a,data.readonly_task,data.readonly);
    const denied=await request(worker,route(data.readonly_task,data.readonly),"PATCH",{due_date:day(11),expected_calendar_revision:before.calendar_revision,calendar_intent_id:randomUUID()});assert.equal(denied.status,403);
    assert.deepEqual(await snapshot(a,data.readonly_task,data.readonly),before);assert.equal((await history(a,data.readonly_task,data.readonly)).length,events.length);
    const admin=await request(a,route(data.readonly_task,data.readonly),"PATCH",{due_date:day(11),expected_calendar_revision:before.calendar_revision,calendar_intent_id:randomUUID()});assert.equal(admin.status,200);
    await list(worker);let pop=await property(worker,"due_date");await pick(pop,day(24));const accepted=await save(worker,pop);assert.equal(accepted.body.due_date,day(24));
    await worker.page.screenshot({path:path.join(output,"06_trabajador_edicion_autorizada.png")});
    return {readonly_worker_ui:true,worker_denied:403,admin_readonly_project:200,worker_enabled_ui:200};
  });
  await check("Una lectura demorada de detalle no restaura fechas anteriores a una confirmación local",async()=>{
    await list(a);let captured,release,completed;const held=new Promise(resolve=>{captured=resolve;}),delivery=new Promise(resolve=>{release=resolve;}),delivered=new Promise(resolve=>{completed=resolve;});let once=false;
    const target=api+route(),hold=async intercepted=>{
      if(intercepted.request().method()!=="GET"||once)return intercepted.continue();once=true;
      const response=await intercepted.fetch({maxRetries:0});captured();await delivery;await intercepted.fulfill({response});completed();
    };
    await a.page.route(target,hold);
    await row(a).locator("button[title]").filter({hasText:"Ventana concurrente QA"}).first().click();await held;
    await a.page.getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();
    const pop=await property(a,"due_date");await pick(pop,day(25));const saved=await save(a,pop);
    release();await delivered;await a.page.unroute(target,hold);
    await selected(a,"due_date",day(25));assert.equal((await snapshot(a)).calendar_revision,saved.body.calendar_revision);
    return {delayed_read_discarded:true,confirmed_revision:saved.body.calendar_revision};
  });
  await check("Cambio de proyecto descarta una confirmación demorada de la vista anterior",async()=>{
    await list(a);let captured,release,completed;const held=new Promise(resolve=>{captured=resolve;}),delivery=new Promise(resolve=>{release=resolve;}),delivered=new Promise(resolve=>{completed=resolve;});
    const target=api+route(),hold=async intercepted=>{
      if(intercepted.request().method()!=="PATCH")return intercepted.continue();const response=await intercepted.fetch({maxRetries:0});assert.equal(response.status(),200);captured();await delivery;await intercepted.fulfill({response});completed();
    };
    await a.page.route(target,hold);const pop=await property(a,"due_date");await pick(pop,day(26));await pop.getByRole("button",{name:"Guardar",exact:true}).click();await held;
    const link=a.page.locator(`a[href="/proyectos/${data.second_project}"]`).first();
    if(!await link.isVisible())await a.page.getByRole("button",{name:"Expandir proyecto Segundo calendario QA",exact:true}).click();
    await link.click();await row(a,data.second_task).waitFor();release();await delivered;await a.page.unroute(target,hold);
    assert.equal(await row(a).count(),0);assert.equal(await row(a,data.second_task).count(),1);
    await a.page.reload();await row(a,data.second_task).waitFor();assert.equal((await snapshot(b)).due_date,day(26));
    return {new_project:data.second_project,old_task_absent:true,authorized_previous_commit_preserved:true};
  });
  await check("Cerrar sesión descarta respuesta demorada y no presenta datos de la sesión anterior",async()=>{
    await list(a);let captured,release,completed;const held=new Promise(resolve=>{captured=resolve;}),delivery=new Promise(resolve=>{release=resolve;}),delivered=new Promise(resolve=>{completed=resolve;});
    const target=api+route(),hold=async intercepted=>{
      if(intercepted.request().method()!=="PATCH")return intercepted.continue();const response=await intercepted.fetch({maxRetries:0});assert.equal(response.status(),200);captured();await delivery;await intercepted.fulfill({response});completed();
    };
    await a.page.route(target,hold);const pop=await property(a,"due_date");await pick(pop,day(27));await pop.getByRole("button",{name:"Guardar",exact:true}).click();await held;
    await a.page.getByRole("button",{name:"Abrir menú de perfil",exact:true}).click();
    const logout=responseFor(a.page,"auth/logout/","POST");await a.page.getByRole("menuitem",{name:"Cerrar sesión",exact:true}).click();assert.equal((await logout).status(),200);
    await a.page.getByRole("heading",{name:"Iniciar sesión",exact:true}).waitFor();release();await delivered;await a.page.unroute(target,hold);
    assert.equal(await a.page.locator("tr[data-task-id]").count(),0);assert.equal((await snapshot(b)).due_date,day(27));
    await a.page.screenshot({path:path.join(output,"07_sesion_cerrada.png")});
    return {logout:200,old_rows_absent:true,authorized_previous_commit_preserved:true};
  });
} finally {
  await writeFile(path.join(output,"resultados.json"),JSON.stringify({date:"2026-10-29",browser:await browser.version(),frontend:"actual Vite repository",database:"isolated MySQL 8.4, migration 0017",independent_contexts:contexts.length,records,network,javascript_errors:errors},null,2));
  await browser.close();
}
