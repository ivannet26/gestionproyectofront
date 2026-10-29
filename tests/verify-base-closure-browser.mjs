import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189", api = "http://localhost:8819/api/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], requests = [];
const replyFor = (page, route, method) => page.waitForResponse((r) => new URL(r.url()).pathname === "/api/" + route && r.request().method() === method);
const check = async (name, run) => { await run(); checks.push(name); console.log("OK " + name); };
function observe(page, role) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) requests.push({ role, path: url.pathname, method: request.method() });
  });
}
async function login(page, role) {
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(credentials[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials[role].password);
  const reply = replyFor(page, "auth/login/", "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const result = await reply; assert.equal(result.status(), 200);
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return (await result.json()).access;
}
async function request(page, token, route, method = "GET", data) {
  const response = await page.request.fetch(api + route, { method, headers: { Authorization: "Bearer " + token }, data });
  return { status: response.status(), body: response.status() === 204 ? null : await response.json() };
}
async function openProfile(page) {
  await page.getByRole("button", { name: "Abrir menú de perfil" }).click();
  await page.getByRole("menuitem", { name: "Añadir especialidad" }).click();
  const dialog = page.getByRole("dialog", { name: "Mis especialidades", exact: true });
  await dialog.waitFor();
  await page.waitForFunction(() => !globalThis.document.querySelector("#profile-specialty")?.disabled);
  return dialog;
}
let worker, admin, adminToken, workerToken, teamMember, newProject;
try {
  worker = await browser.newPage({ viewport: { width: 1440, height: 960 } }); observe(worker, "worker");
  workerToken = await login(worker, "worker");
  await check("Perfil final: alta y baja propias atraviesan serializers y locks del bloque 2, sin abrir CRUD administrativo", async () => {
    const dialog = await openProfile(worker), id = credentials.context.specialties[0];
    await dialog.getByLabel("Añadir especialidad", { exact: true }).selectOption(String(id));
    const reply = replyFor(worker, "workers/me/specialties/", "POST");
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    const response = await reply; assert.equal(response.status(), 201); assert.equal((await response.json()).level, 1);
    await dialog.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).waitFor();
    const saved = await request(worker, workerToken, "workers/me/specialties/");
    assert.equal(saved.body.find((s) => s.id === id).level, 1);
    assert.equal((await request(worker, workerToken, "organization/specialties/")).status, 403);
    assert.equal(requests.filter((r) => r.role === "worker" && r.path === "/api/organization/specialties/").length, 0);
    await worker.screenshot({ path: path.join(output, "01_perfil_backend_final.png") });
    const removed = replyFor(worker, "workers/me/specialties/", "DELETE");
    await dialog.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).click();
    assert.equal((await removed).status(), 204);
    await dialog.getByRole("status").filter({ hasText: "Aún no tienes especialidades." }).waitFor();
    assert.equal((await request(worker, workerToken, "workers/me/specialties/")).body.length, 0);
    await dialog.getByRole("button", { name: "Cerrar", exact: true }).first().click();
  });
  admin = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); observe(admin, "admin");
  adminToken = await login(admin, "admin");
  const team = credentials.context.teams[1], teamPath = "teams/teams/" + team + "/members/";
  const workers = await request(admin, adminToken, "workers/?search=" + encodeURIComponent("Ángela"));
  assert.equal(workers.status, 200);
  const person = workers.body.find((item) => item.first_names.includes("Ángela"));
  assert.ok(person);
  async function addMember() {
    await admin.getByRole("button", { name: "Añadir integrante", exact: true }).click();
    const dialog = admin.getByRole("dialog", { name: "Añadir a Revisión QA", exact: true });
    await dialog.getByLabel("Código de trabajador").fill(person.code);
    const response = replyFor(admin, teamPath, "POST");
    await dialog.getByRole("button", { name: "Añadir", exact: true }).click();
    const result = await response; assert.equal(result.status(), 201);
    const member = await result.json();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await admin.locator("tbody").getByText(/Ángela/).waitFor();
    return member;
  }
  await check("Equipo final: alta, baja, filtro de inactivos y reincorporación conservan ID e integridad", async () => {
    await admin.goto(origin + "/equipos/" + team);
    await admin.getByRole("heading", { name: "Revisión QA", exact: true }).waitFor();
    await admin.locator("tbody").getByText(/José/).waitFor();
    teamMember = await addMember();
    const removal = replyFor(admin, teamPath + teamMember.id + "/", "DELETE");
    await admin.getByRole("button", { name: /^Quitar a Ángela/ }).click();
    assert.equal((await removal).status(), 204);
    await admin.getByLabel("Filtrar integrantes por estado").selectOption("inactivo");
    await admin.locator("tbody").getByText(/Ángela/).waitFor();
    const inactive = await request(admin, adminToken, teamPath + "?all=1");
    assert.ok(inactive.body.find((item) => item.id === teamMember.id).left_date);
    await admin.getByLabel("Filtrar integrantes por estado").selectOption("activo");
    await admin.waitForFunction(() => !globalThis.document.querySelector("tbody")?.textContent.includes("Ángela"));
    const rejoined = await addMember();
    assert.equal(rejoined.id, teamMember.id);
    const final = await request(admin, adminToken, teamPath);
    assert.equal(final.body.filter((item) => item.worker === person.id).length, 1);
    assert.equal(final.body.find((item) => item.id === teamMember.id).left_date, null);
  });
  await check("Formulario completo: proyecto por equipo reincorporado, solo lectura aplicada en backend y directorio paginado actualizado", async () => {
    await admin.getByRole("link", { name: "Ver todos los proyectos", exact: true }).click();
    await admin.locator("main").getByRole("button", { name: "+ Crear proyecto", exact: true }).click();
    const first = admin.getByRole("dialog", { name: "Crear proyecto · Paso 1 de 2", exact: true });
    await first.getByLabel("Nombre *", { exact: true }).fill("Cierre base · equipo QA");
    await first.locator("#project-areas").click();
    await admin.getByRole("button", { name: "Ingeniería · pruebas aisladas", exact: true }).click();
    await first.getByRole("button", { name: "Continuar", exact: true }).click();
    const second = admin.getByRole("dialog", { name: "Crear proyecto · Paso 2 de 2", exact: true });
    assert.equal(await second.getByRole("switch", { name: "Permitir edición en el proyecto" }).getAttribute("aria-checked"), "false");
    await second.getByRole("radio", { name: "Crear proyecto con trabajadores asignados", exact: true }).check();
    await second.getByRole("button", { name: "Equipos", exact: true }).click();
    await second.locator('input[name="project_team"][value="' + team + '"]').check();
    await admin.screenshot({ path: path.join(output, "02_proyecto_equipo_reincorporado.png") });
    const response = replyFor(admin, "projects/", "POST");
    await second.getByRole("button", { name: "Crear con asignados", exact: true }).click();
    const created = await response; assert.equal(created.status(), 201); newProject = await created.json();
    await admin.waitForURL(origin + "/proyectos/" + newProject.id);
    const saved = await request(admin, adminToken, "projects/" + newProject.id + "/");
    assert.equal(saved.body.name, "Cierre base · equipo QA");
    assert.deepEqual(saved.body.team_ids, [team]); assert.equal(saved.body.end_date, null);
    assert.equal(saved.body.worker_state, false); assert.equal(saved.body.worker_create, false);
    assert.ok(saved.body.participants.some((item) => item.id === person.id));
    const task = await request(admin, adminToken, "projects/" + newProject.id + "/tasks/", "POST", { name: "Lectura final QA", state_code: "PENDIENTE", responsible_id: person.id });
    assert.equal(task.status, 201);
    const statePath = "projects/" + newProject.id + "/tasks/" + task.body.id + "/state/";
    assert.equal((await request(worker, workerToken, statePath, "POST", { state_code: "EN_CURSO" })).status, 403);
    assert.equal((await request(admin, adminToken, statePath, "POST", { state_code: "EN_CURSO" })).status, 200);
    await admin.getByRole("link", { name: "Ver todos los proyectos", exact: true }).click();
    await admin.locator("main").getByRole("link", { name: "Cierre base · equipo QA", exact: false }).waitFor();
    await admin.reload();
    await admin.locator("main").getByRole("link", { name: "Cierre base · equipo QA", exact: false }).waitFor();
    assert.equal(requests.filter((r) => r.role === "admin" && r.path === "/api/projects/" && r.method === "POST").length, 1);
  });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "navegador.json"), JSON.stringify({ date: new Date().toISOString(), engine: browser.version(), checks, errors, requests, project_id: newProject.id, rejoined_membership_id: teamMember.id }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors: errors.length }));
} catch (error) {
  await (admin ?? worker)?.screenshot({ path: path.join(output, "fallo.png") });
  await writeFile(path.join(output, "fallo.json"), JSON.stringify({ date: new Date().toISOString(), completed: checks, errors, error: error.stack }, null, 2));
  throw error;
} finally { await browser.close(); }
