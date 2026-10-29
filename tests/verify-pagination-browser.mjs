import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189", api = "http://localhost:8819/api/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], traffic = [], pages = [];
let admin, worker;
const main = (page) => page.locator("main");
const responseFor = (page, route, search) => page.waitForResponse((response) => {
  const url = new URL(response.url());
  return url.pathname === "/api/" + route && response.request().method() === "GET"
    && (search === undefined || url.searchParams.get("search") === search)
    && !url.searchParams.has("associated");
});
const check = async (name, run) => { await run(); checks.push(name); console.log("OK " + name); };
function observe(page, role) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) traffic.push({ role, path: url.pathname, method: request.method(), cursor: url.searchParams.has("cursor") });
  });
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (response.request().method() !== "GET" || !["/api/projects/", "/api/auth/admin/accounts/", "/api/auth/admin/recovery-requests/"].includes(url.pathname)) return;
    const body = await response.json().catch(() => null);
    if (body?.results) pages.push({ role, path: url.pathname, status: response.status(), count: body.results.length, total: body.total, cursor: url.searchParams.has("cursor") });
  });
}
async function login(page, role) {
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(credentials[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials[role].password);
  const reply = page.waitForResponse((r) => r.url().endsWith("/api/auth/login/") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const response = await reply; assert.equal(response.status(), 200);
  const token = (await response.json()).access;
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return token;
}
async function search(page, label, text, route) {
  await page.getByRole("searchbox", { name: label, exact: true }).fill(text);
  const response = responseFor(page, route, text || null);
  const [result] = await Promise.all([response,
    page.getByRole("searchbox", { name: label, exact: true }).locator("xpath=ancestor::form[1]").getByRole("button", { name: /^Buscar/ }).click(),
  ]);
  assert.equal(result.status(), 200);
  const body = await result.json();
  if (body.results.length) {
    if (route === "projects/") await main(page).getByRole("link", { name: body.results[0].name, exact: false }).first().waitFor();
    else await page.waitForFunction((name) => globalThis.document.querySelector("tbody")?.textContent.includes(name), body.results[0].name);
  } else await main(page).getByRole("status").filter({ hasText: /No hay|Sin / }).waitFor();
  return body;
}
async function walk(page, label, read) {
  const nav = page.getByRole("navigation", { name: "Paginación de " + label, exact: true });
  let values = await read();
  while (await nav.getByRole("button", { name: "Siguiente", exact: true }).isEnabled()) {
    const previous = JSON.stringify(await read());
    await nav.getByRole("button", { name: "Siguiente", exact: true }).click();
    await page.waitForFunction(() => !globalThis.document.querySelector("main [aria-busy='true']"));
    let current = await read();
    if (JSON.stringify(current) === previous) {
      await page.waitForResponse((r) => r.request().method() === "GET" && new URL(r.url()).searchParams.has("cursor"));
      await page.waitForFunction(() => !globalThis.document.querySelector("main [aria-busy='true']"));
      current = await read();
    }
    assert.notEqual(JSON.stringify(current), previous);
    values.push(...current); assert.ok(values.length < 400);
  }
  return values;
}
async function holdNext(page, matches) {
  let used = false, release, ready, done;
  const gate = new Promise((yes) => { release = yes; });
  const arrived = new Promise((yes) => { ready = yes; });
  const finished = new Promise((yes) => { done = yes; });
  const handler = async (route) => {
    if (!used && route.request().method() === "GET" && matches(new URL(route.request().url()))) {
      used = true; const reply = await route.fetch(); ready(); await gate; await route.fulfill({ response: reply }); done();
    } else await route.fallback();
  };
  await page.route("**/api/**", handler);
  return { ready: arrived, async release() { release(); await finished; await page.evaluate(() => new Promise((yes) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(yes)))); }, dispose: () => page.unroute("**/api/**", handler) };
}
async function failNext(page, matches) {
  let used = false;
  const handler = async (route) => {
    if (!used && route.request().method() === "GET" && matches(new URL(route.request().url()))) {
      used = true; const reply = await route.fetch();
      await route.fulfill({ response: reply, status: 503, json: { detail: "Fallo QA controlado" } });
    } else await route.fallback();
  };
  await page.route("**/api/**", handler);
  return () => page.unroute("**/api/**", handler);
}
const cardIds = (page) => main(page).locator("ul li a").evaluateAll((links) => links.map((link) => Number(link.getAttribute("href").split("/").at(-1))));
const accountEmails = (page) => page.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.children[1].textContent.trim()));
const requestNames = (page) => page.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.children[0].textContent.trim()));
try {
  admin = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); observe(admin, "admin");
  const token = await login(admin, "admin");
  await check("Proyectos: las 240 filas son accesibles, ordenadas y sin duplicados; selección y regreso conservan página", async () => {
    await admin.getByRole("link", { name: "Ver todos los proyectos", exact: true }).click();
    await main(admin).getByRole("navigation", { name: "Paginación de proyectos", exact: true }).getByText("25 en esta página · 240 resultados").waitFor();
    const ids = await walk(admin, "proyectos", () => cardIds(admin));
    assert.equal(ids.length, 240); assert.equal(new Set(ids).size, 240);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
    assert.ok(ids.includes(credentials.context.first_project));
    await main(admin).getByRole("link", { name: /Proyecto QA 000/ }).click();
    await admin.waitForURL(origin + "/proyectos/" + credentials.context.first_project);
    await admin.getByText("Proyecto actual fuera de esta página", { exact: true }).waitFor();
    await admin.goBack();
    await main(admin).getByRole("link", { name: /Proyecto QA 000/ }).waitFor();
  });
  await check("Proyectos: búsqueda remota fuera del antiguo corte y respuestas fuera de orden descartadas", async () => {
    const body = await search(admin, "Buscar proyectos", "Proyecto QA 000", "projects/");
    assert.equal(body.results[0].id, credentials.context.first_project); assert.equal(body.total, 1);
    const gate = await holdNext(admin, (url) => url.pathname === "/api/projects/" && url.searchParams.get("search") === "Proyecto QA 010" && !url.searchParams.has("associated"));
    await admin.getByRole("searchbox", { name: "Buscar proyectos", exact: true }).fill("Proyecto QA 010");
    await main(admin).getByRole("button", { name: "Buscar", exact: true }).click(); await gate.ready;
    await search(admin, "Buscar proyectos", "Proyecto QA 011", "projects/");
    await gate.release(); await gate.dispose();
    assert.match(await main(admin).innerText(), /Proyecto QA 011/);
    assert.ok(!(await main(admin).innerText()).includes("Proyecto QA 010"));
  });
  await check("Proyectos: fallo de página conserva contenido, reintento recupera y vacío real se distingue", async () => {
    await search(admin, "Buscar proyectos", "", "projects/");
    const before = await cardIds(admin);
    const dispose = await failNext(admin, (url) => url.pathname === "/api/projects/" && url.searchParams.has("cursor") && !url.searchParams.has("associated"));
    await main(admin).getByRole("button", { name: "Siguiente", exact: true }).click();
    await main(admin).getByRole("button", { name: "Reintentar proyectos", exact: true }).waitFor();
    assert.deepEqual(await cardIds(admin), before);
    await admin.screenshot({ path: path.join(output, "01_error_pagina_proyectos.png") });
    await main(admin).getByRole("button", { name: "Reintentar proyectos", exact: true }).click();
    await admin.waitForFunction((id) => !globalThis.document.querySelector("main ul a")?.getAttribute("href").endsWith("/" + id), before[0]);
    await dispose();
    const empty = await search(admin, "Buscar proyectos", "ningun-registro-qa", "projects/"); assert.equal(empty.total, 0);
  });
  await check("Organización: consumidor paginado busca un proyecto fuera de los primeros 200", async () => {
    await admin.getByRole("link", { name: "Organización", exact: true }).click();
    await admin.getByRole("region", { name: "Proyectos", exact: true }).getByRole("navigation").getByText("25 en esta página · 240 resultados").waitFor();
    await search(admin, "Buscar proyectos de organización", "Proyecto QA 000", "projects/");
    await admin.getByRole("region", { name: "Proyectos", exact: true }).getByRole("link", { name: "Proyecto QA 000", exact: true }).waitFor();
  });
  await check("Cuentas: 79 registros alcanzables y búsqueda/activo sobre el conjunto completo", async () => {
    await admin.getByRole("link", { name: "Cuentas y accesos", exact: true }).click();
    await main(admin).getByRole("navigation", { name: "Paginación de cuentas", exact: true }).getByText("25 en esta página · 79 resultados").waitFor();
    const emails = await walk(admin, "cuentas", () => accountEmails(admin));
    assert.equal(emails.length, 79); assert.equal(new Set(emails).size, 79);
    await search(admin, "Buscar cuentas", "QA000", "auth/admin/accounts/");
    assert.match(await admin.locator("tbody").innerText(), /QA000/);
    await admin.getByLabel("Filtrar por estado", { exact: true }).selectOption("false");
    const reply = responseFor(admin, "auth/admin/accounts/", "QA000");
    await admin.getByRole("button", { name: "Buscar cuenta", exact: true }).click(); assert.equal((await (await reply).json()).total, 1);
  });
  await check("Cuentas: catálogo secundario fallido conserva filas y dispone de reintento", async () => {
    const dispose = await failNext(admin, (url) => url.pathname === "/api/auth/admin/areas/");
    await admin.reload();
    await admin.getByRole("button", { name: "Reintentar áreas para cuentas", exact: true }).waitFor();
    await admin.locator("tbody tr").first().waitFor();
    assert.equal(await admin.getByRole("button", { name: "Registrar e invitar", exact: true }).isDisabled(), true);
    await admin.getByRole("button", { name: "Reintentar áreas para cuentas", exact: true }).click();
    await admin.getByRole("button", { name: "Registrar e invitar", exact: true }).waitFor();
    await admin.waitForFunction(() => [...globalThis.document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Registrar e invitar" && !b.disabled));
    await dispose();
  });
  await check("Alta de cuenta reemplaza una lectura pendiente, descarta su respuesta antigua y envía una sola mutación", async () => {
    const gate = await holdNext(admin, (url) => url.pathname === "/api/auth/admin/accounts/");
    await admin.getByRole("navigation", { name: "Paginación de cuentas", exact: true }).getByRole("button", { name: "Actualizar listado", exact: true }).click();
    await gate.ready;
    await admin.getByRole("button", { name: "Registrar e invitar", exact: true }).click();
    const dialog = admin.getByRole("dialog", { name: "Registrar e invitar", exact: true });
    await dialog.getByLabel("Nombres", { exact: true }).fill("Invitado QA");
    await dialog.getByLabel("Apellidos", { exact: true }).fill("Paginación");
    await dialog.getByLabel("Correo electrónico", { exact: true }).fill("nuevo-paginacion@example.invalid");
    await dialog.getByLabel("Área o áreas", { exact: true }).selectOption(String(credentials.context.area));
    const reply = admin.waitForResponse((r) => r.url().endsWith("/api/auth/admin/invitations/") && r.request().method() === "POST");
    const refreshed = responseFor(admin, "auth/admin/accounts/");
    await dialog.getByRole("button", { name: "Registrar e invitar", exact: true }).click();
    assert.equal((await reply).status(), 201);
    await dialog.waitFor({ state: "hidden" });
    assert.equal((await (await refreshed).json()).total, 80);
    await admin.getByRole("navigation", { name: "Paginación de cuentas", exact: true }).getByText("25 en esta página · 80 resultados").waitFor();
    await gate.release(); await gate.dispose();
    assert.equal(await admin.getByRole("navigation", { name: "Paginación de cuentas", exact: true }).getByText("25 en esta página · 80 resultados").count(), 1);
    const body = await search(admin, "Buscar cuentas", "nuevo-paginacion@example.invalid", "auth/admin/accounts/");
    assert.equal(body.total, 1);
    await admin.screenshot({ path: path.join(output, "02_cuenta_nueva_busqueda.png") });
    assert.equal(traffic.filter((item) => item.path === "/api/auth/admin/invitations/" && item.method === "POST").length, 1);
  });
  await check("Recuperaciones: 70 solicitudes recorridas con desempate estable y búsqueda posterior al antiguo límite", async () => {
    await admin.getByRole("link", { name: "Recuperaciones", exact: true }).click();
    await main(admin).getByRole("navigation", { name: "Paginación de solicitudes", exact: true }).getByText("25 en esta página · 70 resultados").waitFor();
    const names = await walk(admin, "solicitudes", () => requestNames(admin));
    assert.equal(names.length, 70); assert.equal(new Set(names).size, 70);
    const body = await search(admin, "Buscar solicitudes", "QA075", "auth/admin/recovery-requests/");
    assert.equal(body.results[0].id, credentials.context.last_recovery);
    await admin.screenshot({ path: path.join(output, "03_solicitud_fuera_corte.png") });
  });
  await check("Resolución confirmada quita la solicitud y actualiza contador y página vacía", async () => {
    const reply = admin.waitForResponse((r) => r.url().endsWith("/issue/") && r.request().method() === "POST");
    await admin.getByRole("button", { name: "Verificar y enviar", exact: true }).click(); assert.equal((await reply).status(), 200);
    await main(admin).getByText("Sin solicitudes para los filtros aplicados.", { exact: true }).waitFor();
    await main(admin).getByRole("navigation", { name: "Paginación de solicitudes", exact: true }).getByText("0 en esta página · 0 resultados").waitFor();
  });
  await check("Respuesta ambigua de una mutación no se reproduce; actualización explícita reconcilia el servidor", async () => {
    await search(admin, "Buscar solicitudes", "QA074", "auth/admin/recovery-requests/");
    const pathMatch = "/api/auth/admin/recovery-requests/";
    const count = () => traffic.filter((item) => item.method === "POST" && item.path.startsWith(pathMatch) && item.path.endsWith("/issue/")).length;
    const before = count();
    let used = false;
    const handler = async (route) => {
      if (!used && route.request().method() === "POST" && new URL(route.request().url()).pathname.endsWith("/issue/")) {
        used = true; const reply = await route.fetch(); assert.equal(reply.status(), 200); await route.abort("failed");
      } else await route.fallback();
    };
    await admin.route("**/api/**", handler);
    await admin.getByRole("button", { name: "Verificar y enviar", exact: true }).click();
    await main(admin).getByRole("alert").waitFor();
    assert.equal(count(), before + 1); assert.equal(await admin.locator("tbody tr").count(), 1);
    await admin.getByRole("navigation", { name: "Paginación de solicitudes", exact: true }).getByRole("button", { name: "Actualizar listado", exact: true }).click();
    await main(admin).getByText("Sin solicitudes para los filtros aplicados.", { exact: true }).waitFor();
    assert.equal(count(), before + 1);
    await admin.unroute("**/api/**", handler);
  });
  await check("Alta de proyecto actualiza el conjunto mediante una lectura explícita sin ampliar páginas", async () => {
    const result = await admin.request.post(api + "projects/", { headers: { Authorization: "Bearer " + token }, data: {
      name: "Proyecto nuevo de paginación QA", area_ids: [credentials.context.area], mode: "available", end_date: null,
    } });
    assert.equal(result.status(), 201);
    await admin.getByRole("link", { name: "Ver todos los proyectos", exact: true }).click();
    const body = await search(admin, "Buscar proyectos", "Proyecto nuevo de paginación QA", "projects/");
    assert.equal(body.total, 1); assert.equal(body.results[0].id, (await result.json()).id);
  });
  worker = await browser.newPage({ viewport: { width: 1440, height: 960 } }); observe(worker, "worker");
  const workerToken = await login(worker, "worker");
  await check("Trabajador: accede a todos sus proyectos y backend deniega cuentas/recuperaciones y proyectos ajenos", async () => {
    await worker.getByRole("link", { name: "Ver todos los proyectos", exact: true }).click();
    const response = await search(worker, "Buscar proyectos", "Proyecto QA 000", "projects/");
    assert.equal(response.total, 1);
    const all = await worker.request.get(api + "projects/", { headers: { Authorization: "Bearer " + workerToken } });
    assert.equal((await all.json()).total, 236);
    for (const route of ["auth/admin/accounts/", "auth/admin/recovery-requests/"]) {
      const denied = await worker.request.get(api + route, { headers: { Authorization: "Bearer " + workerToken } });
      assert.equal(denied.status(), 403);
    }
    const hidden = await search(worker, "Buscar proyectos", "fuera de ámbito", "projects/"); assert.equal(hidden.total, 0);
    await worker.reload(); await worker.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
    await worker.getByRole("button", { name: "Abrir menú de perfil" }).click();
    await worker.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await worker.getByRole("heading", { name: "Iniciar sesión", exact: true }).waitFor();
  });
  assert.deepEqual(errors, []);
  assert.ok(pages.length > 30 && pages.every((entry) => entry.count <= 25));
  await writeFile(path.join(output, "navegador.json"), JSON.stringify({ date: new Date().toISOString(), engine: await browser.version(), checks, errors, pages, traffic }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors: errors.length, boundedPages: pages.length }));
} catch (error) {
  await writeFile(path.join(output, "fallo.json"), JSON.stringify({ completed: checks, error: error.stack, errors }, null, 2));
  if (admin) await admin.screenshot({ path: path.join(output, "fallo.png") }).catch(() => {});
  console.error(error.message); process.exitCode = 1;
} finally { await browser.close(); }
