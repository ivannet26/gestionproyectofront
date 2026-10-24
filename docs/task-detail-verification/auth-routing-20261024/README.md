# Regresión de autenticación después del merge — 24 de octubre de 2026

## Causa comprobada antes de modificar

Los procesos habituales estaban activos: Vite en `http://localhost:5173` y Django en `127.0.0.1:8000`. Frontend tenía únicamente `.env.example`, sin `.env`; el módulo servido usaba `VITE_API_BASE_URL || ""`. El checkpoint anterior al merge usaba `http://localhost:8000` como fallback. El merge adoptó el mismo origen para despliegue, pero `vite.config.ts` no tenía ningún proxy.

Chrome nuevo, sin cookies, reprodujo el mensaje «No se pudo completar la solicitud». Se usó una dirección sintética inexistente en el formulario; las solicitudes quedaron en Vite, sin contactar la API de Django.

| Orden | URL del entorno habitual | Método | HTTP | Respuesta |
| --- | --- | --- | --- | --- |
| 1 | `http://localhost:5173/api/auth/csrf/` | GET | 200 | `text/html`: documento de entrada de Vite, no JSON de CSRF |
| 2 | `http://localhost:5173/api/auth/refresh/` | POST | 404 | Cuerpo vacío de Vite |
| 3 | `http://localhost:5173/api/auth/csrf/` | GET | 200 | Mismo HTML al enviar el formulario |
| 4 | `http://localhost:5173/api/auth/login/` | POST | 404 | Cuerpo vacío de Vite; la UI muestra el error genérico |

La primera respuesta incorrecta fue CSRF, aunque su código fuera 200. El primer error HTTP fue refresh 404. El parser existente tolera JSON inválido como objeto vacío, por lo que el error visible apareció al recibir el 404 sin detalle.

Como control, `GET http://127.0.0.1:8000/api/auth/csrf/` devolvió HTTP 200, `application/json`, con las claves `ok` y `csrf_token`. No se almacenaron valores del token ni cabeceras sensibles. Esto sitúa la causa en el enrutamiento del frontend; no hay evidencia que implique la migración 0016. La consola del Django habitual no estaba adjunta a este chat: el registro Django comprobado y conservado abajo corresponde exclusivamente al servidor aislado.

## Corrección

Vite reenvía `/api/` al Django de desarrollo, conservando ruta, método, cuerpo, cookies y Origin/Host. El destino predeterminado es `http://127.0.0.1:8000`, configurable con `API_PROXY_TARGET`. No se añadieron rewrites de rutas, bypass de CSRF/CORS, cambios de cuentas ni dependencias.

`auth/api.ts` y `httpClient.ts` permanecen intactos: ambos consumen la misma base, vacía para mismo origen o el valor explícito de `VITE_API_BASE_URL`. Se conservan Axios, el token compartido y la única promesa de renovación. El destino local pertenece al servidor de desarrollo y no se incorpora al bundle del cliente. En producción, la base vacía requiere que el servidor web reenvíe `/api/` antes del fallback SPA; también se conserva la opción de una base HTTPS explícita al compilar.

No se necesita ninguna variable nueva para Django en el puerto 8000. Si el destino local cambia, usa `API_PROXY_TARGET=http://127.0.0.1:8000` sustituyendo únicamente su puerto/origen por el real y reinicia Vite con `npm run dev`. `VITE_API_BASE_URL` puede permanecer sin definir o vacía para utilizar el proxy. No se sobrescribió ningún `.env` ni hace falta reiniciar Django por esta corrección.

## Archivos de la corrección

- `frontend/vite.config.ts`: proxy de desarrollo y destino configurable.
- `frontend/.env.example`: ejemplo de mismo origen y variable del proxy.
- `frontend/README.md`: configuración local y despliegue.
- `frontend/tests/authRouting.test.mjs`: regresión con Vite real y upstream sintético; comprueba destino predeterminado, configuración alternativa, rutas, cuerpos, CSRF, cookies, errores y que la variable del servidor no se expone al cliente.
- `frontend/tests/verify-auth-routing-browser.mjs`: recorrido Chrome real sin base API explícita y registro seguro de solicitudes.
- `backend/scripts/verify_task_detail_browser.ps1`: opción para ejecutar ese recorrido con el fixture MySQL existente; conserva las opciones anteriores y restaura las variables del proceso al terminar.
- Este informe y `navegador.json`: evidencias sin contraseñas, cuerpos de login, cookies ni tokens.

## Verificaciones aprobadas

- Entorno habitual, después de corregir: Chrome obtiene CSRF 200 JSON y refresh 401 JSON con `detail: Sesión expirada`, esperado sin sesión; el formulario se muestra sin error. El Vite en ejecución recargó su configuración automáticamente.
- `npm test`: **115/115** aprobadas, incluidas las dos nuevas de proxy y las de sesión/renovación/concurrencia.
- `npx tsc -b`: aprobado.
- `npx eslint vite.config.ts tests/authRouting.test.mjs tests/verify-auth-routing-browser.mjs`: aprobado.
- `node --check tests/verify-auth-routing-browser.mjs`: aprobado.
- `npm run build`: aprobado; conserva el aviso previo de chunk superior a 500 kB, sin cambiar su umbral.
- `scripts/verify_task_detail_browser.ps1 -BrowserTest verify-auth-routing-browser.mjs`: **7 comprobaciones aprobadas** en Chrome, Django y MySQL 8.4 temporales. Login 200, cookies CSRF/refresh HttpOnly, Proyectos/Lista 200 por Axios, recarga con una renovación 200, logout 200, recarga posterior con renovación 401, POST sin CSRF rechazado con 403. Todas las URL usan el origen de Vite; no hay 404/500 ni excepciones del navegador. `navegador.json` contiene las solicitudes y las líneas HTTP sanitizadas del registro Django que confirman el procesamiento real.
- `git diff --check`: aprobado en ambos repositorios.

El recorrido usa el fixture sintético existente en una base temporal y puertos aislados, sin modificar cuentas o contraseñas del entorno habitual. El primer intento del nuevo driver se detuvo por una espera de recarga que todavía veía el documento anterior; se corrigió esperando la navegación principal real y se repitió satisfactoriamente. No fue necesario cambiar código de aplicación adicional.

## Pendiente y límites

No se intentó un login con credenciales reales en el entorno habitual: no se proporcionaron ni se extrajeron credenciales. Allí sí se reprodujo el fallo inicial y se confirmó el arranque de autenticación corregido; el ciclo autenticado completo se aprobó con datos sintéticos aislados.

No se ejecutaron migraciones en Aiven ni escrituras de prueba sobre bases compartidas. No se hizo push ni commit. Se conservan los HEAD de integración, respaldos y checkpoints; la corrección queda en el árbol de trabajo para revisión. Los servidores/contenedor y credenciales del recorrido aislado se eliminaron al terminar; los servidores habituales se conservaron.
