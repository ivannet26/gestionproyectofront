# Corrección integral de Lista

Versión local sobre frontend `9c4b0040d1d62eb5940b641a9eea249619e3e388` y backend `7d1112520603ad72a399a8bc5fe02181bce8ff12`. Repositorios inicialmente limpios. Verificación: 22/10/2026, 22:33–22:38, America/Lima (UTC−05:00). Sin commit ni push.

## Causas y corrección

1. **Estado y sincronización:** el backend vigente había eliminado restricciones antiguas, pero `transitions` aún se construía desde la tabla secuencial anterior. El selector manual no ofrecía el mismo regreso que el arrastre. Ahora ambos exponen los códigos configurados y el mismo contrato sin motivo. Se valida que el destino exista y pertenezca al flujo del proyecto. Se limita el guardado a estado/motivo/avance/fecha de actualización; no se reescriben otros atributos. Seleccionar el estado actual no genera otro evento. Las respuestas incluyen `updated_at`; la colección compartida descarta valores anteriores y el detalle invalida lecturas pendientes al aceptar una escritura. Se conserva `expected_revision`, el 409 y la actualización explícita, sin reintentos automáticos ni recarga de página.
2. **Padres y subtareas:** el padre PENDIENTE mostrado dentro de EN CURSO era una representación de contexto, no prueba de persistencia incorrecta. En agrupación por Estado se sustituye por una referencia compacta y abrible, sin propiedades ni celda Estado. La fila real sigue en su grupo; padre e hijos del mismo grupo conservan jerarquía. No se cambia `parent_id` ni se propagan estados a descendientes.
3. **Arrastre y marcos:** cada fila tenía su propio detector y rechazaba filas de otro padre sin resolver una posición compatible. Además `undefined === undefined` activaba `data-drop-group` en todas las agrupaciones no estatales, incluso sin gesto. Se centralizó la resolución en el contenedor, usando anclas de hermanos válidos y la misma posición para indicador/petición. Se eliminaron esos atributos, el marco y los fondos de grupos. Hay un solo indicador absoluto de 2 px, que no altera tablas. Se mantienen autoscroll, grupos contraídos como destino explícito, Escape, limpieza y cursor nativo con umbral de arrastre del navegador. En táctil se conserva scroll y se usa el menú de movimiento.
4. **Controles y contador:** se retira el botón/espacio del asa. La alternativa de teclado/clic está en Opciones existente. Agrupar por vuelve a un icono con tooltip contextual, nombre accesible y foco visible. Se elimina la explicación superior y se muestra un único contador de identidades junto al título; búsqueda indica N de M, sin contar referencias ni duplicar por grupos.

Las skills UI UX Pro Max y Web Design Guidelines guiaron el uso de controles existentes, alternativa accesible al gesto, foco visible, ausencia de saltos y conservación de la identidad GM. No se cambiaron fechas, sidebar, equipos, especialidades, autenticación ni dependencias. Se corrigió también el tipo del wrapper lazy de configuración para aceptar el borrador que su diálogo ya admitía: era un error previo de compilación, sin modificar ese flujo.

## Resultado final

| Verificación | Aprobadas | Fallidas | Omitidas |
| --- | ---: | ---: | ---: |
| Frontend completo | 86 | 0 | 0 |
| Backend dirigido SQLite | 28 | 0 | 0 |
| Consistencia API/atomicidad en MySQL 8.4 temporal | 5 | 0 | 0 |
| Bloques funcionales Chrome real + React + Django + MySQL | 7 | 0 | 0 |

Tipado, lint dirigido, build, Django check, comprobación de migraciones y `git diff --check` de ambos repositorios: correctos. Build mantiene el aviso no bloqueante de bundle mayor de 500 kB; no se aumentó el umbral. Las pruebas existentes de consultas constantes/paginación pasaron; no se afirma una mejora de latencia ni rendimiento medido en Aiven.

El navegador ejecutó ida/vuelta repetida por arrastre y selector; apertura/guardado del detalle; padre independiente; referencias compactas; inserción antes de fila; destino vacío y contraído; Escape sin petición; alternativas con teclado y táctil a 390 px; cinco agrupaciones; contador filtrado; filas largas, alineación y autoscroll. API SQLite/MySQL comprobó además antes/entre/después entre hermanos, atributos intactos, conflicto 409, ancla de otro padre, rollback tras fallo controlado, revocación/solo lectura, rechazo de código inexistente y un evento de estado por cambio válido. La prueba de colección comprueba respuestas tardías, identidad única y metadatos coherentes.

## Capturas reales y respaldos

- [Arrastre de subtarea a estado vacío](01_arrastre_subtarea.png).
- [Subtareas con estado distinto de su padre](02_subtareas_estados_distintos.png).
- [Inserción entre filas sin marcos](03_insercion_entre_filas.png).
- [Agrupación por responsable, sin contornos laterales](04_agrupacion_responsable.png).

`navegador.json` conserva los siete bloques y método/ruta/estado de las peticiones, sin credenciales. `frontend-test.log`, `backend-sqlite.log`, `backend-mysql.log` y `build.log` contienen salidas finales. `intento-previo/` conserva el fallo del guion por el selector del botón de cierre; no es una captura aprobada ni un defecto final.

No se declara que las capturas demuestren todos los negativos. No se probó teléfono físico ni lector de pantalla. No se ejecutó la suite completa de backend: algunas pruebas históricas de supervisión/dependencias/entregables aún esperan reglas anteriores al commit `7d11125`. Un descubrimiento inicial incluyó esas clases importadas; se aisló correctamente el módulo dirigido. No se restauraron esas restricciones para hacer pasar ensayos antiguos. Las expectativas afectadas de creación rápida y presentación se actualizaron al contrato vigente manteniendo los negativos de entrada, permisos y fechas.

## Comandos ejecutados

Desde frontend:

```powershell
npx tsc -b
npm test
npx eslint src/features/projects/TaskList src/features/projects/ProjectWorkspace/ProjectHeader.tsx src/features/projects/ProjectWorkspace/ProjectWorkspace.tsx src/features/projects/TaskDetail/useTaskDetail.ts src/features/projects/taskCollection.ts src/features/projects/TaskStatusConfiguration/TaskStatusConfiguration.tsx tests/projectIntegrations.test.mjs tests/projectHeader.test.mjs tests/taskGroupControls.test.mjs tests/quickTaskPresentation.test.mjs tests/verify-list-consistency-browser.mjs
npm run build
git diff --check
```

Desde backend:

```powershell
$env:AUTH_TEST_SQLITE='1'
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_list_consistency --noinput
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_list_consistency apps.projects.tests.test_performance apps.projects.tests.test_quick_tasks apps.projects.tests.test_task_inline --noinput
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_list_consistency_mysql
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_detail_browser.ps1 -BrowserTest verify-list-consistency-browser.mjs
git diff --check
```

Las ejecuciones finales con respaldo añaden `2>&1 | Tee-Object -FilePath` hacia los logs de esta carpeta. Los wrappers levantan MySQL nuevo con datos sintéticos en loopback, ejecutan las fixtures/migraciones existentes solo allí y eliminan contenedores, servidores y credenciales al finalizar. Aiven y bases compartidas no se tocaron.

## Archivos modificados

Frontend:

- `TaskList/TaskList.tsx`, `useTaskMove.ts`, `taskDropPosition.ts`, `TaskMoveControl.tsx`, `taskListInteractions.css`: filas, referencias, destinos y alternativa accesible.
- `TaskList/TaskCell.tsx`, `TaskGroupingControl.tsx`: destinos compartidos y botón de agrupación.
- `ProjectWorkspace/ProjectWorkspace.tsx`, `ProjectHeader.tsx`, `taskCollection.ts`, `types.ts`, `TaskDetail/useTaskDetail.ts`: reconciliación, versiones y contador.
- `TaskStatusConfiguration/TaskStatusConfiguration.tsx`: compatibilidad de tipos del wrapper.
- `tests/projectHeader.test.mjs`, `projectIntegrations.test.mjs`, `quickTaskPresentation.test.mjs`, `taskGroupControls.test.mjs`, `verify-list-consistency-browser.mjs`: contratos, interacción y ensayo real.
- Esta carpeta: capturas e informe.

Backend:

- `apps/projects/services/tasks.py`, `presentation.py`: validación del destino, guardado limitado, noop y metadatos coherentes para ambos controles.
- `apps/projects/tests/test_list_consistency.py`, `test_list_consistency_mysql.py`: cinco casos funcionales reutilizados en ambos motores.
- `apps/projects/tests/test_performance.py`, `test_quick_tasks.py`: expectativas del contrato vigente.
- `scripts/verify_task_detail_browser.ps1`, `verify_task_status_mysql.ps1`: admisión de los nuevos guiones en los wrappers existentes.

No se cambió SQL ni el esquema y no hay migraciones nuevas pendientes por esta corrección.
