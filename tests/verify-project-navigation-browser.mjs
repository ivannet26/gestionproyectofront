import assert from "node:assert/strict";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { chromium } from "file:///C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const credentials=JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH,"utf8")),data=credentials.context,output=process.env.GM_BROWSER_REPORT_DIR;
const origin="http://localhost:5189",api="http://localhost:8819/api/";
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const checks=[],network=[],errors=[],contexts=[];
function responseFor(page,predicate){return page.waitForResponse(response=>{const url=new URL(response.url());return url.pathname==="/api/projects/"&&response.request().method()==="GET"&&predicate(url);});}
async function login(role){
  const context=await browser.newContext({viewport:{width:1600,height:1050},timezoneId:"America/Lima"});contexts.push(context);
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on("pageerror",error=>errors.push({role,message:error.message.slice(0,500)}));
  page.on("response",async response=>{
    const url=new URL(response.url()),request=response.request();
    if(!["/api/projects/","/api/projects/areas/"].includes(url.pathname))return;
    const record={role,path:url.pathname,method:request.method(),status:response.status(),area:url.searchParams.get("area_id"),project:url.searchParams.get("project_id"),associated:url.searchParams.get("associated"),continuation:url.searchParams.has("cursor")};
    try{if(request.method()==="GET"&&response.status()===200){const body=await response.json();record.count=body.results.length;record.ids=body.results.map(item=>item.id);record.hasMore=body.next_cursor!==null;}}catch{record.delivery="cancelled";}
    network.push(record);
  });
  await page.goto(origin);await page.getByLabel("Correo electrónico",{exact:true}).fill(credentials[role].email);await page.getByLabel("Contraseña",{exact:true}).fill(credentials[role].password);
  const waiting=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/auth/login/"&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Ingresar",exact:true}).click();const response=await waiting;assert.equal(response.status(),200);
  await page.getByRole("button",{name:"Abrir menú de perfil",exact:true}).waitFor();
  return {page,context,token:(await response.json()).access,role};
}
const nav=client=>client.page.getByRole("navigation",{name:"Navegación principal",exact:true});
const areaButton=(container,name)=>container.getByRole("button",{name:new RegExp("^(Expandir|Contraer) área "+name+"$")});
async function revealArea(client,container,name){
  await container.locator('button[aria-label*=" área "]').first().waitFor();
  for(let attempt=0;attempt<6;attempt++){
    const button=areaButton(container,name);if(await button.count()){await button.scrollIntoViewIfNeeded();return button;}
    const end=container.getByText("Más áreas al desplazarte…",{exact:true});await button.or(end).first().waitFor();
    if(await button.count()){await button.scrollIntoViewIfNeeded();return button;}
    const count=await container.locator('button[aria-label*=" área "]').count();
    await end.scrollIntoViewIfNeeded();
    await container.locator('button[aria-label*=" área "]').nth(count).waitFor();
  }
  throw Error("No se alcanzó el área autorizada: "+name);
}
async function expand(client,container,name){const button=await revealArea(client,container,name);if(await button.getAttribute("aria-expanded")!=="true")await button.click();return button.locator("..");}
async function moreProjects(client,branch){
  const before=await branch.locator('button[aria-label^="Expandir proyecto"],button[aria-label^="Contraer proyecto"]').count();
  await branch.getByText("Más proyectos al desplazarte…",{exact:true}).scrollIntoViewIfNeeded();
  await client.page.waitForFunction(({id,before})=>globalThis.document.getElementById(id)?.querySelectorAll('button[aria-label^="Expandir proyecto"],button[aria-label^="Contraer proyecto"]').length>before,{id:await branch.locator('div[id^="project-area-"]').getAttribute("id"),before});
}
async function snapshot(client,pathname){
  const response=await client.context.request.get(api+pathname,{headers:{Authorization:"Bearer "+client.token}});return {status:response.status(),body:await response.json()};
}
async function clean(container){const text=await container.innerText();for(const value of ["Ver todos los proyectos","Anterior","Siguiente","Actualizar listado","en esta página","resultados"])assert.ok(!text.includes(value),value);assert.equal(await container.locator('input[type="search"]').count(),0);}
async function check(name,fn){try{const details=await fn();checks.push({name,status:"Aprobado",details});console.log("OK "+name);}catch(error){checks.push({name,status:"Fallido",error:error.message.slice(0,900)});await contexts[0]?.pages()[0]?.screenshot({path:path.join(output,"fallo_"+checks.length+".png")}).catch(()=>{});await writeFile(path.join(output,"fallo_"+checks.length+".txt"),await contexts[0].pages()[0].locator("body").innerText());throw error;}}
function mutate(action,id){execFileSync(path.resolve("../backend/.venv/Scripts/python.exe"),["-m","apps.projects.tests.project_navigation_browser_server",action,String(id)],{cwd:path.resolve("../backend"),env:process.env,stdio:"pipe"});}
async function notify(page,areaIds){await page.evaluate(ids=>globalThis.dispatchEvent(new CustomEvent("gm-project-directory-changed",{detail:{areaIds:ids}})),areaIds);}
let admin,worker,created;
try{
  admin=await login("admin");
  await check("Submenú compacto y arranque acotado sin descargar proyectos ni tareas",async()=>{
    const container=nav(admin);await container.getByRole("list",{name:"Áreas con proyectos asociados",exact:true}).waitFor();
    await container.locator('button[aria-label*=" área "]').first().waitFor();await clean(container);
    assert.equal(network.filter(item=>item.role==="admin"&&item.path==="/api/projects/"&&item.method==="GET").length,0);
    const reads=network.filter(item=>item.role==="admin"&&item.path==="/api/projects/areas/"&&item.status===200);assert.ok(reads.length>=1);assert.equal(reads[0].count,25);
    assert.equal(await areaButton(container,data.old_area_name).count(),0);
    await admin.page.screenshot({path:path.join(output,"01_menu_compacto.png")});return {initial_area_rows:25,project_reads:0,all_projects_downloaded:false};
  });
  await check("Continuación de áreas alcanza un área ausente de la primera carga y navega su proyecto",async()=>{
    const branch=await expand(admin,nav(admin),data.old_area_name);const folder=branch.getByRole("button",{name:"Expandir proyecto Proyecto antiguo QA",exact:true});await folder.click();
    await branch.getByRole("link",{name:"Lista de tareas de Proyecto antiguo QA",exact:true}).click();await admin.page.getByRole("heading",{name:"Proyecto antiguo QA",exact:true}).waitFor();
    await admin.page.screenshot({path:path.join(output,"02_area_y_proyecto_anteriores.png")});return {area:data.old_area,project:data.old_project,opened:true};
  });
  await check("Error de continuación conserva filas; reintento y desplazamiento acceden a proyectos posteriores a 200",async()=>{
    const branch=await expand(admin,nav(admin),data.area_name);await branch.getByRole("button",{name:"Expandir proyecto Proyecto QA 232",exact:true}).waitFor();
    let failed=false;const target="**/api/projects/?**";
    const fail=async route=>{const url=new URL(route.request().url());if(!failed&&url.searchParams.get("area_id")===String(data.area)&&url.searchParams.has("cursor")){failed=true;await route.abort("failed");}else await route.continue();};
    await admin.page.route(target,fail);
    const count=await branch.locator('button[title^="Proyecto QA"]').count();await branch.getByText("Más proyectos al desplazarte…",{exact:true}).scrollIntoViewIfNeeded();
    await branch.getByRole("alert").waitFor();assert.equal(await branch.locator('button[title^="Proyecto QA"]').count(),count);
    await admin.page.screenshot({path:path.join(output,"03_error_sin_perder_filas.png")});
    const waiting=responseFor(admin.page,url=>url.searchParams.get("area_id")===String(data.area)&&url.searchParams.has("cursor"));await branch.getByRole("button",{name:"Reintentar",exact:true}).click();assert.equal((await waiting).status(),200);await admin.page.unroute(target,fail);
    await branch.getByRole("alert").waitFor({state:"detached"});
    for(let step=0;step<12&&!await branch.getByRole("button",{name:"Expandir proyecto Proyecto QA 000",exact:true}).count();step++)await moreProjects(admin,branch);
    await branch.getByRole("button",{name:"Expandir proyecto Proyecto QA 000",exact:true}).scrollIntoViewIfNeeded();
    const labels=await branch.locator('button[title^="Proyecto QA"]').evaluateAll(items=>items.map(item=>item.getAttribute("title")));assert.equal(labels.length,233);assert.equal(new Set(labels).size,233);
    assert.equal(await branch.getByRole("button",{name:"Expandir proyecto Proyecto QA 234",exact:true}).count(),0);
    await admin.page.screenshot({path:path.join(output,"04_proyecto_mas_alla_de_200.png")});return {associated_projects:233,unique:233,oldest_reachable:true,retry:true};
  });
  await check("URL directa conserva el proyecto seleccionado sin drenar su área",async()=>{
    const start=network.length;await admin.page.goto(origin+"/proyectos/"+data.first_project);await admin.page.getByRole("heading",{name:"Proyecto QA 000",exact:true}).waitFor();
    const link=nav(admin).getByRole("link",{name:"Lista de tareas de Proyecto QA 000",exact:true});await link.waitFor();assert.equal(await link.getAttribute("aria-current"),"page");
    const reads=network.slice(start).filter(item=>item.role==="admin"&&item.path==="/api/projects/"&&item.method==="GET");assert.ok(reads.every(item=>item.area!==null||item.project!==null));assert.ok(reads.every(item=>item.count<=25));
    assert.equal(reads.filter(item=>item.continuation).length,0);await link.scrollIntoViewIfNeeded();await admin.page.screenshot({path:path.join(output,"05_url_directa.png")});return {selected:true,summary_lookup:true,no_continuation_drain:true};
  });
  await check("Alta real del proyecto asignado aparece en su área y mantiene permisos",async()=>{
    await nav(admin).getByRole("button",{name:"Proyectos",exact:true}).hover();
    await admin.page.getByRole("button",{name:"Crear proyecto",exact:true}).click();const first=admin.page.getByRole("dialog",{name:"Crear proyecto · Paso 1 de 2",exact:true});
    await first.getByLabel("Nombre *",{exact:true}).fill("Nuevo proyecto de navegación QA");await first.locator("#project-areas").click();await admin.page.getByRole("button",{name:data.area_name,exact:true}).click();await first.getByRole("button",{name:"Continuar",exact:true}).click();
    const second=admin.page.getByRole("dialog",{name:"Crear proyecto · Paso 2 de 2",exact:true});await second.getByRole("radio",{name:"Crear proyecto con trabajadores asignados",exact:true}).check();
    await second.getByRole("checkbox",{name:/Nombre sintético worker/}).check();const waiting=admin.page.waitForResponse(reply=>new URL(reply.url()).pathname==="/api/projects/"&&reply.request().method()==="POST");await second.getByRole("button",{name:"Crear con asignados",exact:true}).click();const reply=await waiting;assert.equal(reply.status(),201);created=await reply.json();
    await admin.page.waitForURL(origin+"/proyectos/"+created.id);const link=nav(admin).getByRole("link",{name:"Lista de tareas de Nuevo proyecto de navegación QA",exact:true});await link.waitFor();await link.scrollIntoViewIfNeeded();
    const saved=await snapshot(admin,"projects/"+created.id+"/");assert.equal(saved.status,200);assert.ok(saved.body.participants.some(item=>item.id===data.worker_id));await admin.page.screenshot({path:path.join(output,"06_alta_reflejada_en_area.png")});return {status:201,project:created.id,area:data.area,participants_persisted:true};
  });
  await check("Organización conserva su sección y alcance más amplio sin controles técnicos",async()=>{
    await admin.page.getByRole("link",{name:"Organización",exact:true}).click();const section=admin.page.getByRole("region",{name:"Proyectos",exact:true});await section.waitFor();await section.scrollIntoViewIfNeeded();await clean(section);
    const branch=await expand(admin,section,data.area_name);await branch.getByRole("link",{name:"Proyecto QA 234",exact:true}).waitFor();assert.equal(await nav(admin).getByRole("button",{name:"Expandir proyecto Proyecto QA 234",exact:true}).count(),0);
    await branch.getByRole("link",{name:"Nuevo proyecto de navegación QA",exact:true}).waitFor();
    await areaButton(section,data.area_name).evaluate(element=>element.scrollIntoView({block:"start"}));await admin.page.screenshot({path:path.join(output,"07b_organizacion_area_y_proyectos.png")});
    await section.getByRole("button",{name:"Contraer área "+data.area_name,exact:true}).click();await section.evaluate(element=>element.scrollIntoView({block:"start"}));await admin.page.screenshot({path:path.join(output,"07_organizacion_proyectos.png")});return {unassociated_accessible_in_organization:true,unassociated_absent_from_menu:true,section_preserved:true};
  });
  await check("Actualización y retiro QA invalidan únicamente el área afectada sin recargar la aplicación",async()=>{
    await admin.page.goto(origin);const container=nav(admin);const oldBranch=await expand(admin,container,data.old_area_name);await oldBranch.getByRole("button",{name:"Expandir proyecto Proyecto antiguo QA",exact:true}).waitFor();
    const main=await expand(admin,container,data.area_name);await main.getByRole("button",{name:"Expandir proyecto Nuevo proyecto de navegación QA",exact:true}).waitFor();const start=network.length;
    mutate("rename",data.old_project);await notify(admin.page,[data.old_area]);await oldBranch.getByRole("button",{name:"Expandir proyecto Proyecto renombrado QA",exact:true}).waitFor();
    mutate("archive",data.old_project);await notify(admin.page,[data.old_area]);await areaButton(container,data.old_area_name).waitFor({state:"detached"});
    assert.equal(network.slice(start).filter(item=>item.role==="admin"&&item.path==="/api/projects/"&&item.area===String(data.area)).length,0);
    await admin.page.screenshot({path:path.join(output,"08_retiro_y_actualizacion.png")});return {fixture_only_mutations:true,real_business_edit_ui_available:false,affected_area_only:true,unaffected_area_reads:0};
  });
  await check("Cambio rápido de área cancela una lectura demorada y conserva el área posterior",async()=>{
    const container=nav(admin),extra=data.extras[31],other=data.extras[30];let arrived,release,complete;const held=new Promise(r=>{arrived=r;}),gate=new Promise(r=>{release=r;}),delivered=new Promise(r=>{complete=r;});let interceptedOnce=false,aborted=false;
    const hold=async route=>{const url=new URL(route.request().url());if(interceptedOnce||url.searchParams.get("area_id")!==String(extra.area_id))return route.continue();interceptedOnce=true;const response=await route.fetch({maxRetries:0});arrived();await gate;try{await route.fulfill({response});}catch(error){if(!route.request().failure())throw error;aborted=true;}finally{complete();}};
    await admin.page.route("**/api/projects/?**",hold);const first=await expand(admin,container,extra.area_name);await held;
    await areaButton(container,extra.area_name).click();const next=await expand(admin,container,other.area_name);await next.getByRole("button",{name:"Expandir proyecto Proyecto técnico QA 30",exact:true}).waitFor();release();await delivered;await admin.page.unroute("**/api/projects/?**",hold);
    assert.equal(await first.isVisible(),true);assert.equal(await areaButton(container,extra.area_name).getAttribute("aria-expanded"),"false");assert.equal(await next.getByRole("button",{name:"Expandir proyecto Proyecto técnico QA 31",exact:true}).count(),0);return {cancelled_or_ignored_previous_read:true,request_cancelled:aborted};
  });
  worker=await login("worker");
  await check("Trabajador conserva sus áreas y permisos; Organización no abre el CRUD administrativo",async()=>{
    const container=nav(worker);await areaButton(container,data.area_name).waitFor();assert.equal(await container.locator('button[aria-label*="Área técnica QA"]').count(),0);assert.equal(await container.getByRole("button",{name:"Crear proyecto",exact:true}).count(),0);
    await worker.page.goto(origin+"/proyectos/"+data.first_project);await worker.page.getByRole("heading",{name:"Proyecto QA 000",exact:true}).waitFor();await container.getByRole("link",{name:"Lista de tareas de Proyecto QA 000",exact:true}).waitFor();
    assert.equal((await snapshot(worker,"projects/"+data.hidden_project+"/")).status,404);assert.equal((await snapshot(worker,"organization/areas/")).status,403);
    await worker.page.getByRole("link",{name:"Organización",exact:true}).click();const section=worker.page.getByRole("region",{name:"Proyectos",exact:true});await section.scrollIntoViewIfNeeded();await clean(section);const branch=await expand(worker,section,data.area_name);await branch.getByRole("link",{name:"Proyecto QA 234",exact:true}).waitFor();return {worker_direct_project:true,unauthorized_project:404,administrative_catalog:403,organization_available:true};
  });
  await check("Pantalla estrecha y teclado mantienen navegación sin desbordamiento",async()=>{
    await admin.page.setViewportSize({width:375,height:812});await admin.page.goto(origin+"/proyectos/"+data.first_project);await admin.page.getByRole("heading",{name:"Proyecto QA 000",exact:true}).waitFor();
    const button=await revealArea(admin,nav(admin),data.area_name);await button.focus();await admin.page.keyboard.press("ArrowLeft");assert.equal(await button.getAttribute("aria-expanded"),"false");await admin.page.keyboard.press("ArrowRight");assert.equal(await button.getAttribute("aria-expanded"),"true");
    const link=nav(admin).getByRole("link",{name:"Lista de tareas de Proyecto QA 000",exact:true});await link.scrollIntoViewIfNeeded();assert.equal(await admin.page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
    await clean(nav(admin));await admin.page.screenshot({path:path.join(output,"09_navegacion_estrecha.png")});return {viewport:375,keyboard_expansion:true,horizontal_page_overflow:false};
  });
  await check("Cerrar sesión invalida una lectura de área pendiente y descarta contenido anterior",async()=>{
    await admin.page.setViewportSize({width:1600,height:1050});await admin.page.goto(origin);const extra=data.extras[31];let arrived,release,complete;const held=new Promise(r=>{arrived=r;}),gate=new Promise(r=>{release=r;}),delivered=new Promise(r=>{complete=r;});
    const hold=async route=>{const url=new URL(route.request().url());if(url.searchParams.get("area_id")!==String(extra.area_id))return route.continue();const response=await route.fetch({maxRetries:0});arrived();await gate;try{await route.fulfill({response});}catch(error){if(!route.request().failure())throw error;}finally{complete();}};
    await admin.page.route("**/api/projects/?**",hold);await expand(admin,nav(admin),extra.area_name);await held;await admin.page.getByRole("button",{name:"Abrir menú de perfil",exact:true}).click();
    const logout=admin.page.waitForResponse(reply=>new URL(reply.url()).pathname==="/api/auth/logout/"&&reply.request().method()==="POST");await admin.page.getByRole("menuitem",{name:"Cerrar sesión",exact:true}).click();assert.equal((await logout).status(),200);
    await admin.page.getByRole("heading",{name:"Iniciar sesión",exact:true}).waitFor();release();await delivered;await admin.page.unroute("**/api/projects/?**",hold);assert.equal(await nav(admin).count(),0);return {logout:200,previous_navigation_absent:true};
  });
}finally{
  await writeFile(path.join(output,"resultados.json"),JSON.stringify({date:"2026-10-29",browser:await browser.version(),dataset:data.project_count,checks,network,javascript_errors:errors,independent_contexts:contexts.length},null,2));await browser.close();
}
