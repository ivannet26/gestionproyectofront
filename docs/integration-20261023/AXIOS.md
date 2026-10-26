# Transporte Axios de Proyectos

La integración migra todos los servicios de `src/features/projects/services.ts` a la instancia `src/core/api/httpClient.ts`. Conserva rutas, métodos, parámetros, payloads y resultados; los servicios retornan `response.data` y no almacenan estado. Las mutaciones envían objetos a Axios, no JSON doblemente serializado.

## Una sola sesión

`auth/api.ts` conserva el arranque de autenticación mediante fetch, su token en memoria, la promesa compartida de renovación y el contador de versión de sesión. Expone utilidades mínimas al cliente Axios: comprobación de versión, expiración, CSRF e invalidación/deduplicación. No importa el cliente Axios, por lo que no existe dependencia circular ni otra sesión paralela.

La base usa `VITE_API_BASE_URL` y, si no está definida, `/api/` del mismo origen. No se fija localhost para despliegue ni se modifica `.env`. El cliente conserva cookies y usa el token CSRF vigente en las mutaciones cuando está disponible.

Los interceptores comprueban la versión antes de enviar, después de renovar y al recibir una respuesta. Un resultado de una sesión anterior se rechaza; no puede aplicarse tras cerrar sesión o cambiar autorizaciones. Los hooks existentes siguen siendo responsables de descartar respuestas de otro proyecto y de reconciliar colecciones confirmadas.

## Reintentos y errores

- Solo un 401 permite renovar y repetir una vez. Respuestas 401 tardías que usaron el token anterior reutilizan el token ya renovado, sin otra rotación.
- La renovación fallida expira la sesión compartida. Un segundo 401 termina el recorrido sin bucle.
- No se repiten automáticamente mutaciones ante errores de red ambiguos, 400, 403 o 409.
- Los errores HTTP de Axios se convierten a `ApiError`, manteniendo `status`, `payload` y mensajes de validación por campo/categoría. Las cancelaciones conservan su semántica Axios.

## Lecturas simultáneas

El cliente comparte únicamente GET predeterminados que coinciden en URL y versión de sesión, mediante el mismo registro in-flight de autenticación. Configuraciones explícitas, señales de cancelación y mutaciones no se comparten. No es una caché persistente: cada lectura vuelve a consultarse una vez finalizada la anterior. Errores, confirmación de mutaciones y limpieza de sesión eliminan las entradas pertinentes.

No se afirma una reducción medida de latencia por utilizar Axios. Las pruebas verifican las cantidades de solicitudes y las garantías de concurrencia, no tiempos de producción.

## Verificación dirigida

`node --experimental-vm-modules --test tests/api.test.mjs tests/axiosTransport.test.mjs tests/projectFavorite.test.mjs`

Las pruebas nuevas usan la librería Axios instalada con un adapter sintético, sin servidor ni credenciales reales. Comprueban contratos de servicio, cabeceras/cookies/CSRF, base de entorno, simultaneidad, renovación única, 401 tardío, expiración, cambio de permisos, deduplicación e invalidación, errores HTTP íntegros, cancelación independiente y ausencia de repetición ante red/409. Las ocho pruebas anteriores del transporte de autenticación también se mantienen.
