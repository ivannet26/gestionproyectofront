# Integración local — 23 y 24 de octubre de 2026

## Historial protegido

| Repositorio | HEAD inicial | origin/main integrado | Checkpoint local previo al merge |
| --- | --- | --- | --- |
| Frontend | `9c4b0040d1d62eb5940b641a9eea249619e3e388` | `a9da8fa01d87e0f5cd8a2c09860bd46f3973ffb0` | `056368f46f40059d2c71852b6f52e90d7c12ad33` |
| Backend | `7d1112520603ad72a399a8bc5fe02181bce8ff12` | `7d1112520603ad72a399a8bc5fe02181bce8ff12` | `a0cab32e92827bb0e50474a76953c86b14a853e1` |

Se ejecutó fetch en ambos repositorios. Frontend incorpora el único commit remoto nuevo mediante un merge revisado, sin squash/rebase ni selección completa de ours/theirs. Backend ya incluía origin/main: corresponde un commit normal de correcciones, no un merge artificial.

Respaldos conservados:

- Ramas `backup/frontend-before-integration-20261023-9c4b004` y `backup/backend-before-integration-20261023-7d11125`.
- Referencias `refs/backups/frontend-integration-wip-20261023` y `refs/backups/backend-integration-wip-20261023`, incluyendo archivos sin seguimiento.
- Stashes de respaldo y checkpoints anteriores, sin eliminarlos.
- La carpeta previa `docs/task-detail-verification/list-consistency/intento-previo/` se conserva sin versionar y fuera del commit. Los fallos transitorios de esta integración no se incluyen como evidencias aprobadas.

## Merge semántico

Se mantienen ProjectWorkspace como compositor, ProjectToolbar compartido, controles y estado de búsqueda comunes, iconos SVG reutilizables, avatares, densidad/columnas nuevas, scroll de Lista/Tablero, propiedades compartidas y presentación de subtareas del remoto. Se conserva el título, periodo y contador local, además del detalle compartido y la aplicación automática de plantillas.

Lista recupera movimiento desde la superficie de la fila y el título, sin asa: umbral de 6 px con Pointer Events, exclusión de controles interactivos, autoscroll, Escape/cancelación, línea única de inserción y alternativa de teclado. Se usa el endpoint/revisión existente; solo una respuesta confirmada modifica la colección compartida. Un 409 no se repite automáticamente. Las subtareas mantienen padre y atributos; los padres de contexto se muestran como referencias compactas, no como tareas del estado ajeno.

El control de agrupación conserva todas las opciones y preferencias, con solo un icono y nombre/tooltip accesible. Se corrigió una regresión del formulario remoto: el selector de orden ocupaba el ancho del selector de modo. La distribución por columnas permite operar ambos. La expansión global se coordina con Lista sin borrar preferencias de otros modos. En Tablero no se muestran controles de agrupación/expansión sin efecto; sí búsqueda, ajustes y creación compartidos.

Kanban conserva las tarjetas/columnas/scroll del remoto, pero no propaga cambios de estado a descendientes ni registra dos draggables para una misma tarea en la vista previa de hijos. También conserva el acceso al detalle común.

Los catálogos y proyecto mantienen errores persistentes con reintento, sin hacer pasar fallos por colecciones vacías. Las cargas independientes son paralelas; leases idempotentes evitan ocultar otra operación pendiente. Reintentos secundarios conservan el contenido válido sin tapar toda la pantalla. Se descartan respuestas de proyectos/sesiones anteriores y lecturas que preceden a una confirmación.

Las guías ui-ux-pro-max y web-design-guidelines se aplicaron al umbral y alternativa al arrastre, iconos con nombre accesible, foco, controles efectivos, errores/reintentos y distribución adaptable. No se cambió la identidad visual GM ni se añadieron dependencias.

## Axios

Todos los servicios de `src/features/projects/services.ts` usan la instancia central Axios y retornan data. Se mantienen rutas, métodos, parámetros y payloads. Auth conserva su arranque fetch y una única sesión compartida con Axios: token, renovación única, cookies/CSRF, versión de sesión y deduplicación de GET en curso. Se conserva ApiError con status/payload y validaciones por campo.

Solo un 401 permite repetir una vez tras renovar; no se repiten mutaciones por red, 400, 403 o 409. La base depende de VITE_API_BASE_URL o del mismo origen, no de localhost fijo. No se modificó .env. El detalle técnico y las pruebas de concurrencia están en `AXIOS.md`.

No se declara una mejora de latencia por dividir componentes o usar Axios. Se verificaron cantidades de solicitudes y coherencia funcional, no tiempos de producción.

## Backend y migración

No había commits remotos adicionales. Se revisó 7d11125 contra su padre c6900c1: sus ediciones de SQL/migraciones históricas no actualizan bases donde ya fueron aplicadas. Sin volver a editar esas migraciones, 0016 alinea los helpers SQL con la política vigente y conserva preflight estricto, autenticación/ámbito, destino habilitado, bloqueo, auditoría, respaldo y restauración ante fallo DDL.

Los servicios siguen usando ORM dentro de atomic; no se invoca desde allí el wrapper público con COMMIT interno. No se reinstalan motivos, responsable obligatorio ni restricciones funcionales descartadas. Cambiar estado o mover conserva el motivo histórico y atributos ajenos al estado.

Revisión operativa: `backend/apps/projects/migrations/reviews/0016_task_state_policy_consistency.md`.

## Aprobado

| Verificación | Resultado |
| --- | --- |
| Frontend `npm test` | 113 pruebas aprobadas: autenticación, Axios, concurrencia, agrupación/expansión, Pointer Events, Kanban, carga y contratos previos |
| TypeScript `npx tsc -b` | Correcto |
| ESLint | Correcto en todo `src/features/projects` y transporte, carga y AppShell afectados; también pruebas nuevas de Pointer/Kanban |
| Build de producción | Correcto; permanece el aviso de chunk mayor de 500 kB, sin elevar umbrales |
| SQLite explícito | 12 pruebas de Lista/plantillas y 9 de configuración/plantillas existentes: 21 aprobadas |
| MySQL 8.4 real temporal | 14 de política/migración nueva y upgrade, 5 de Lista y 7 de plantillas: 26 aprobadas |
| Chrome + Django + MySQL temporales | 13 comprobaciones de integración y 5 de regresión de plantillas: 18 aprobadas, sin excepciones de ejecución |
| Django check / makemigrations --check --dry-run | Correctos, sin diferencias de modelos |
| Compileall dirigido | Correcto |
| git diff --check y revisión de conflictos | Correctos antes de confirmar |

El navegador verifica movimiento repetido de ida/vuelta, subtareas, posición inicial/intermedia/final, estados vacíos/contraídos, autoscroll, cancelación, columnas estables, agrupación/expansión, móvil de 390 px, búsqueda, persistencia, detalle/propiedades y Lista/Tablero. Un JWT firmado realmente expirado se introduce en dos GET simultáneos: el servidor devuelve dos 401 y Axios hace una sola renovación posterior; la renovación de arranque de una navegación completa se contabiliza separadamente. También se prueba un 409 real sin replay, destino inválido, trabajador readonly frente a administrador, error real 404 y fallo de red inducido exclusivamente en la lectura de catálogos, seguido de reintento.

Evidencias: `docs/task-detail-verification/integration-20261023/navegador.json` y cuatro capturas; las tres capturas y reporte de `template-application/` se actualizaron al recorrido integrado. Los tokens y contraseñas sintéticos solo estuvieron en el archivo temporal de credenciales del wrapper, nunca en reportes ni commits. Contenedores, servidores y credenciales temporales se eliminaron.

## Pendiente o no ejecutado

- Despliegue de 0016: requiere detener escrituras y `TASK_STATE_POLICY_MAINTENANCE=1`; no se ejecutó en Aiven ni bases compartidas.
- MySQL valida las migraciones funcionales de Proyectos sobre el baseline sintético aislado existente, tanto instalación actual como actualización de definiciones previas. No se afirma una instalación desde cero de toda la infraestructura externa al módulo.
- Ruff está configurado, pero no instalado en el entorno; no se añadió una dependencia. Se ejecutaron las comprobaciones Django, compilación y pruebas indicadas.
- Gantt continúa siendo el placeholder existente; no se implementó en esta integración.

No se hizo push ni despliegue. Los commits locales finales se identifican en la entrega y el log de cada repositorio; los HEAD iniciales, checkpoints y remotos integrados deben ser ancestros de esos resultados.
