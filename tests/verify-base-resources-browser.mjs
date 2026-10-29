import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

assert.ok(process.env.GM_QA_SECRETS_PATH && process.env.GM_BROWSER_REPORT_DIR);
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189", api = "http://localhost:8819/api/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], requests = [];
let worker, admin;
const tick = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const check = async (name, run) => { await run(); checks.push(name); console.log("OK " + name); };
function observe(page, role) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/")) requests.push({ role, path: url.pathname, method: request.method() }); });
}
async function login(page, role) {
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(credentials[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials[role].password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login/") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const result = await response; assert.equal(result.status(), 200);
  const token = (await result.json()).access;
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return token;
}
async function openProfile(page) {
  await page.getByRole("button", { name: "Abrir menú de perfil" }).click();
  await page.getByRole("menuitem", { name: "Añadir especialidad" }).click();
  await page.getByRole("dialog", { name: "Mis especialidades" }).waitFor();
}
async function closeProfile(page) { await page.getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }).first().click(); }
async function failNext(page, matches) {
  let used = false;
  const handler = async (route) => {
    if (!used && route.request().method() === "GET" && matches(new URL(route.request().url()))) {
      used = true; const response = await route.fetch();
      await route.fulfill({ response, status: 503, json: { detail: "Fallo QA controlado" } });
    } else await route.fallback();
  };
  await page.route("**/api/**", handler);
  return () => page.unroute("**/api/**", handler);
}
async function holdNext(page, matches) {
  let release, ready, finished, used = false;
  const gate = new Promise((resolve) => { release = resolve; });
  const entered = new Promise((resolve) => { ready = resolve; });
  const done = new Promise((resolve) => { finished = resolve; });
  const handler = async (route) => {
    if (!used && route.request().method() === "GET" && matches(new URL(route.request().url()))) {
      used = true; const response = await route.fetch(); ready();
      await gate; await route.fulfill({ response }); finished();
    } else await route.fallback();
  };
  await page.route("**/api/**", handler);
  return { ready: entered, async release() { release(); await done; await tick(page); }, dispose: () => page.unroute("**/api/**", handler) };
}
const ownPath = "/api/workers/me/specialties/", optionsPath = "/api/workers/me/specialty-options/";
const count = (role, route) => requests.filter((r) => r.role === role && r.path === route && r.method === "GET").length;

try {
  worker = await browser.newPage({ viewport: { width: 1440, height: 960 } }); observe(worker, "worker");
  let workerToken = await login(worker, "worker");
  await check("Perfil trabajador: catálogo mínimo, alta propia persistida y rechazo del CRUD administrativo", async () => {
    await openProfile(worker);
    await worker.waitForFunction(() => !document.querySelector("#profile-specialty").disabled);
    await worker.getByLabel("Añadir especialidad", { exact: true }).selectOption(String(credentials.context.specialties[0]));
    await worker.getByRole("dialog").getByRole("button", { name: "Agregar", exact: true }).click();
    await worker.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).waitFor();
    const persisted = await worker.request.get(api + "workers/me/specialties/", { headers: { Authorization: "Bearer " + workerToken } });
    assert.ok((await persisted.json()).some((item) => item.id === credentials.context.specialties[0]));
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const url = method === "GET" || method === "POST" ? "organization/specialties/" : "organization/specialties/" + credentials.context.specialties[0] + "/";
      const denied = await worker.request.fetch(api + url, { method, headers: { Authorization: "Bearer " + workerToken }, data: { name: "QA sin permiso" } });
      assert.equal(denied.status(), 403);
    }
    assert.equal(count("worker", "/api/organization/specialties/"), 0);
    await closeProfile(worker);
  });

  await check("Perfil parcial: falla catálogo, conserva especialidad y reintenta solo opciones", async () => {
    const dispose = await failNext(worker, (url) => url.pathname === optionsPath);
    await openProfile(worker);
    await worker.getByRole("button", { name: "Reintentar opciones de especialidades", exact: true }).waitFor();
    await worker.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).waitFor();
    const mine = count("worker", ownPath);
    assert.equal(await worker.getByRole("button", { name: "Agregar", exact: true }).isDisabled(), true);
    await worker.getByRole("button", { name: "Reintentar opciones de especialidades", exact: true }).click();
    await worker.waitForFunction(() => !document.querySelector("#profile-specialty").disabled);
    assert.equal(count("worker", ownPath), mine);
    await worker.screenshot({ path: path.join(output, "01_perfil_recuperado.png") });
    await closeProfile(worker); await dispose();
  });

  await check("Perfil parcial: falla listado propio, opciones válidas no autorizan una escritura", async () => {
    const dispose = await failNext(worker, (url) => url.pathname === ownPath);
    await openProfile(worker);
    await worker.getByRole("button", { name: "Reintentar tus especialidades", exact: true }).waitFor();
    assert.equal(await worker.getByRole("button", { name: "Agregar", exact: true }).isDisabled(), true);
    const options = count("worker", optionsPath);
    await worker.getByRole("button", { name: "Reintentar tus especialidades", exact: true }).click();
    await worker.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).waitFor();
    assert.equal(count("worker", optionsPath), options);
    await closeProfile(worker); await dispose();
  });

  await check("Equipos trabajador: lectura autorizada y acciones administrativas ausentes y rechazadas", async () => {
    const areasBefore = count("worker", "/api/organization/areas/");
    await worker.goto(origin + "/equipos");
    await worker.getByRole("link", { name: "Ver detalle" }).first().waitFor();
    assert.equal(await worker.getByRole("button", { name: "Nuevo equipo", exact: true }).count(), 0);
    assert.equal(count("worker", "/api/organization/areas/"), areasBefore);
    await worker.getByRole("link", { name: "Ver detalle" }).first().click();
    await worker.getByRole("heading", { name: "Estructuras QA", exact: true }).waitFor();
    assert.equal(await worker.getByRole("button", { name: "Añadir integrante", exact: true }).count(), 0);
    assert.equal(await worker.getByRole("button", { name: /^Quitar a / }).count(), 0);
    const eligible = await worker.request.get(api + "teams/teams/" + credentials.context.teams[0] + "/members/", {
      headers: { Authorization: "Bearer " + workerToken },
    });
    assert.equal(eligible.status(), 200);
    const denied = await worker.request.post(api + "teams/teams/" + credentials.context.teams[2] + "/members/", {
      headers: { Authorization: "Bearer " + workerToken }, data: { worker_id: (await eligible.json())[0].worker },
    });
    assert.equal(denied.status(), 403);
  });

  admin = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); observe(admin, "admin");
  const adminToken = await login(admin, "admin");
  await check("Perfil administrador conserva lectura y edición propia", async () => {
    await openProfile(admin);
    await admin.waitForFunction(() => !document.querySelector("#profile-specialty").disabled);
    await admin.getByLabel("Añadir especialidad", { exact: true }).selectOption(String(credentials.context.specialties[1]));
    await admin.getByRole("dialog").getByRole("button", { name: "Agregar", exact: true }).click();
    await admin.getByRole("button", { name: "Quitar Diseño estructural", exact: true }).waitFor();
    await admin.getByRole("button", { name: "Quitar Diseño estructural", exact: true }).click();
    await admin.getByRole("status").filter({ hasText: "Aún no tienes especialidades" }).waitFor();
    const access = await admin.request.get(api + "organization/specialties/", { headers: { Authorization: "Bearer " + adminToken } });
    assert.equal(access.status(), 200);
    await closeProfile(admin);
  });

  await check("Trabajadores: búsqueda fuera de orden y filtros área/activo efectivos", async () => {
    await admin.goto(origin + "/trabajadores");
    await admin.locator("tbody tr").first().waitFor();
    const gate = await holdNext(admin, (url) => url.pathname === "/api/workers/" && url.searchParams.get("search") === "José");
    await admin.getByRole("searchbox", { name: "Buscar trabajadores" }).fill("José");
    await admin.getByRole("button", { name: "Buscar trabajador", exact: true }).click(); await gate.ready;
    await admin.getByRole("searchbox", { name: "Buscar trabajadores" }).fill("Ángela");
    await admin.getByRole("button", { name: "Buscar trabajador", exact: true }).click();
    await admin.waitForFunction(() => document.querySelector("tbody")?.textContent.includes("Ángela") && !document.querySelector("tbody")?.textContent.includes("José"));
    await gate.release(); await gate.dispose();
    assert.ok(!(await admin.locator("tbody").innerText()).includes("José"));
    await admin.getByRole("button", { name: "Limpiar", exact: true }).click();
    await admin.getByLabel("Filtrar por área", { exact: true }).selectOption(String(credentials.context.other_area));
    await admin.getByLabel("Filtrar por estado", { exact: true }).selectOption("false");
    const filtered = admin.waitForRequest((r) => {
      const url = new URL(r.url()); return url.pathname === "/api/workers/" && url.searchParams.get("area_id") === String(credentials.context.other_area) && url.searchParams.get("active") === "false";
    });
    await admin.getByRole("button", { name: "Buscar trabajador", exact: true }).click(); await filtered;
    await admin.getByText("No hay trabajadores para los filtros aplicados.", { exact: true }).waitFor();
  });

  await check("Trabajadores: actualización conserva datos, error no equivale a vacío y reintento recupera", async () => {
    await admin.getByRole("button", { name: "Limpiar", exact: true }).click();
    await admin.locator("tbody tr").first().waitFor();
    const dispose = await failNext(admin, (url) => url.pathname === "/api/workers/" && url.searchParams.get("search") === "sin-resultados-qa");
    await admin.getByRole("searchbox", { name: "Buscar trabajadores" }).fill("sin-resultados-qa");
    await admin.getByRole("button", { name: "Buscar trabajador", exact: true }).click();
    await admin.getByRole("button", { name: "Reintentar trabajadores", exact: true }).waitFor();
    assert.ok(await admin.locator("tbody tr").count() > 0);
    assert.equal(await admin.getByText("No hay trabajadores para los filtros aplicados.", { exact: true }).count(), 0);
    await admin.screenshot({ path: path.join(output, "02_error_trabajadores_con_datos.png") });
    await admin.getByRole("button", { name: "Reintentar trabajadores", exact: true }).click();
    await admin.getByText("No hay trabajadores para los filtros aplicados.", { exact: true }).waitFor();
    await dispose();
  });

  await check("Organización: fallo de especialidades independiente, error visible y reintento", async () => {
    const dispose = await failNext(admin, (url) => url.pathname === "/api/organization/specialties/");
    await admin.goto(origin + "/organizacion");
    const specialties = admin.getByRole("region", { name: "Especialidades", exact: true });
    await specialties.getByRole("button", { name: "Reintentar especialidades", exact: true }).waitFor();
    await admin.getByRole("region", { name: "Áreas", exact: true }).locator("li").first().waitFor();
    await admin.getByRole("region", { name: "Equipos", exact: true }).locator("li").first().waitFor();
    assert.equal(await specialties.getByText("No hay especialidades registradas.", { exact: true }).count(), 0);
    await specialties.getByRole("button", { name: "Reintentar especialidades", exact: true }).click();
    await specialties.getByText("Ingeniería civil", { exact: true }).waitFor(); await dispose();
  });

  const teamA = credentials.context.teams[0], teamB = credentials.context.teams[1];
  await check("Detalle de equipo: navegación rápida descarta respuesta del equipo anterior", async () => {
    await admin.goto(origin + "/equipos");
    const gate = await holdNext(admin, (url) => url.pathname === "/api/teams/teams/" + teamA + "/");
    await admin.locator("tr").filter({ hasText: "Estructuras QA" }).getByRole("link", { name: "Ver detalle" }).click();
    await gate.ready; await admin.goBack();
    await admin.locator("tr").filter({ hasText: "Revisión QA" }).getByRole("link", { name: "Ver detalle" }).click();
    await admin.getByRole("heading", { name: "Revisión QA", exact: true }).waitFor();
    await gate.release(); await gate.dispose();
    assert.equal(await admin.getByRole("heading", { name: "Estructuras QA", exact: true }).count(), 0);
  });

  await check("Detalle parcial: miembros fallidos no ocultan equipo, reintento solo de miembros", async () => {
    const membersPath = "/api/teams/teams/" + teamB + "/members/", detailPath = "/api/teams/teams/" + teamB + "/";
    const dispose = await failNext(admin, (url) => url.pathname === membersPath);
    await admin.reload();
    await admin.getByRole("heading", { name: "Revisión QA", exact: true }).waitFor();
    await admin.getByRole("button", { name: "Reintentar integrantes", exact: true }).waitFor();
    assert.equal(await admin.getByText("Este equipo no tiene integrantes.", { exact: true }).count(), 0);
    const detailCount = count("admin", detailPath);
    await admin.getByRole("button", { name: "Reintentar integrantes", exact: true }).click();
    await admin.locator("tbody tr").first().waitFor();
    assert.equal(count("admin", detailPath), detailCount);
    await admin.screenshot({ path: path.join(output, "03_equipo_recuperado.png") }); await dispose();
  });



  await check("Integrantes: filtros rápidos activo/inactivo cargan y descartan el filtro anterior", async () => {
    const found = await admin.request.get(api + "workers/?search=" + encodeURIComponent("Ángela"), {
      headers: { Authorization: "Bearer " + adminToken },
    });
    const member = await admin.request.post(api + "teams/teams/" + teamB + "/members/", {
      headers: { Authorization: "Bearer " + adminToken }, data: { worker_id: (await found.json())[0].id },
    });
    assert.equal(member.status(), 201);
    const removed = await admin.request.delete(api + "teams/teams/" + teamB + "/members/" + (await member.json()).id + "/", {
      headers: { Authorization: "Bearer " + adminToken },
    });
    assert.equal(removed.status(), 204);
    await admin.reload();
    await admin.locator("tbody").getByText(/Ángela/).waitFor();
    const gate = await holdNext(admin, (url) => url.pathname === "/api/teams/teams/" + teamB + "/members/" && !url.searchParams.has("all"));
    await admin.getByLabel("Filtrar integrantes por estado").selectOption("activo"); await gate.ready;
    await admin.getByLabel("Filtrar integrantes por estado").selectOption("inactivo");
    await admin.waitForFunction(() => !document.querySelector("section[aria-busy='true']"));
    await gate.release(); await gate.dispose();
    assert.match(await admin.locator("tbody").innerText(), /Ángela/);
    assert.ok(!(await admin.locator("tbody").innerText()).includes("José"));
    await admin.getByLabel("Filtrar integrantes por estado").selectOption("");
    await admin.locator("tbody").getByText(/José/).waitFor();
  });

  await check("Cerrar modal de integrante invalida búsqueda pendiente y evita un alta tardía", async () => {
    const lookup = await admin.request.get(api + "workers/?search=" + encodeURIComponent("Ángela"), {
      headers: { Authorization: "Bearer " + adminToken },
    });
    assert.equal(lookup.status(), 200);
    const code = (await lookup.json())[0].code;
    const gate = await holdNext(admin, (url) => url.pathname === "/api/workers/" && url.searchParams.get("search") === code);
    await admin.getByRole("button", { name: "Añadir integrante", exact: true }).click();
    const modal = admin.getByRole("dialog", { name: "Añadir a Revisión QA", exact: true });
    await modal.getByLabel("Código de trabajador").fill(code);
    const writes = requests.filter((r) => r.role === "admin" && r.method === "POST" && r.path.endsWith("/members/")).length;
    await modal.getByRole("button", { name: "Añadir", exact: true }).click(); await gate.ready;
    await modal.getByRole("button", { name: "Cancelar", exact: true }).click();
    await gate.release(); await gate.dispose();
    assert.equal(requests.filter((r) => r.role === "admin" && r.method === "POST" && r.path.endsWith("/members/")).length, writes);
    assert.equal(await modal.count(), 0);
  });

  await check("Cerrar perfil con lectura pendiente y cerrar sesión invalida respuestas anteriores", async () => {
    await worker.goto(origin);
    const gate = await holdNext(worker, (url) => url.pathname === ownPath);
    await openProfile(worker); await gate.ready; await closeProfile(worker);
    await worker.getByRole("button", { name: "Abrir menú de perfil" }).click();
    await worker.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await worker.getByRole("heading", { name: "Iniciar sesión", exact: true }).waitFor();
    workerToken = await login(worker, "worker");
    await gate.release(); await gate.dispose();
    await worker.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
    await openProfile(worker);
    await worker.getByRole("button", { name: "Quitar Ingeniería civil", exact: true }).waitFor();
    await closeProfile(worker);
    await worker.reload(); await worker.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  });

  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "navegador.json"), JSON.stringify({ date: new Date().toISOString(), engine: await browser.version(), checks, errors, requests }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors: errors.length }));
} catch (error) {
  await writeFile(path.join(output, "fallo.json"), JSON.stringify({ completed: checks, error: error.message, errors }, null, 2));
  if (admin) await admin.screenshot({ path: path.join(output, "fallo.png") }).catch(() => {});
  console.error(error.message); process.exitCode = 1;
} finally { await browser.close(); }
