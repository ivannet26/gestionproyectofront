import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createServer, resolveConfig } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));

test('same-origin API fallback has a development proxy to the conventional Django port', async () => {
  const previous = process.env.API_PROXY_TARGET;
  process.env.API_PROXY_TARGET = '';
  try {
    const config = await resolveConfig({ root, configFile, logLevel: 'silent' }, 'serve');
    assert.equal(config.server.proxy['/api/'].target, 'http://127.0.0.1:8000');
    assert.equal(config.server.proxy['/api/'].changeOrigin, false);
    assert.equal(config.env.API_PROXY_TARGET, undefined);
  } finally {
    if (previous === undefined) delete process.env.API_PROXY_TARGET;
    else process.env.API_PROXY_TARGET = previous;
  }
});

test('real Vite forwards relative auth and Axios paths, bodies, CSRF, cookies and backend errors', async () => {
  const received = [];
  const backend = createHttpServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    received.push({ path: req.url, method: req.method, headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/auth/csrf/') {
      res.setHeader('Set-Cookie', 'csrftoken=synthetic-csrf; Path=/; SameSite=Lax');
      res.end(JSON.stringify({ csrf_token: 'synthetic-csrf' }));
    } else if (req.url === '/api/auth/login/') {
      res.setHeader('Set-Cookie', 'gm_refresh=synthetic-refresh; Path=/api/auth/; HttpOnly; SameSite=Lax');
      res.end(JSON.stringify({ user: { id: 1 } }));
    } else if (req.url === '/api/auth/refresh/') {
      res.statusCode = 401;
      res.end(JSON.stringify({ detail: 'Sesión expirada' }));
    } else {
      res.end(JSON.stringify({ results: [] }));
    }
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const previous = process.env.API_PROXY_TARGET;
  process.env.API_PROXY_TARGET = `http://127.0.0.1:${backend.address().port}`;
  let vite;
  try {
    vite = await createServer({ root, configFile, logLevel: 'silent', server: { middlewareMode: true } });
    const server = createHttpServer(vite.middlewares);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const csrf = await fetch(`${origin}/api/auth/csrf/`);
      assert.equal(csrf.status, 200);
      assert.match(csrf.headers.get('content-type'), /application\/json/);
      assert.equal((await csrf.json()).csrf_token, 'synthetic-csrf');
      assert.match(csrf.headers.get('set-cookie'), /^csrftoken=/);
      const login = await fetch(`${origin}/api/auth/login/`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json', 'X-CSRFToken': 'synthetic-csrf', Cookie: 'csrftoken=synthetic-csrf' },
        body: JSON.stringify({ email: 'synthetic@example.invalid', password: 'synthetic-only' }),
      });
      assert.equal(login.status, 200);
      assert.match(login.headers.get('set-cookie'), /Path=\/api\/auth\/; HttpOnly; SameSite=Lax/);
      await login.json();
      const refresh = await fetch(`${origin}/api/auth/refresh/`, { method: 'POST' });
      assert.equal(refresh.status, 401);
      assert.equal((await refresh.json()).detail, 'Sesión expirada');
      const projects = await fetch(`${origin}/api/projects/`, { headers: { Authorization: 'Bearer synthetic-only' } });
      assert.deepEqual(await projects.json(), { results: [] });
      assert.deepEqual(received.map(({ path, method }) => [path, method]), [
        ['/api/auth/csrf/', 'GET'], ['/api/auth/login/', 'POST'], ['/api/auth/refresh/', 'POST'], ['/api/projects/', 'GET'],
      ]);
      assert.equal(received[1].headers.host, new URL(origin).host);
      assert.equal(received[1].headers.origin, origin);
      assert.equal(received[1].headers['x-csrftoken'], 'synthetic-csrf');
      assert.equal(received[1].headers.cookie, 'csrftoken=synthetic-csrf');
      assert.deepEqual(JSON.parse(received[1].body), { email: 'synthetic@example.invalid', password: 'synthetic-only' });
      assert.equal(received[3].headers.authorization, 'Bearer synthetic-only');
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  } finally {
    await vite?.close();
    await new Promise(resolve => backend.close(resolve));
    if (previous === undefined) delete process.env.API_PROXY_TARGET;
    else process.env.API_PROXY_TARGET = previous;
  }
});
