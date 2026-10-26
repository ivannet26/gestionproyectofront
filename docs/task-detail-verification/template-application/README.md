# Aplicación automática de plantillas — 23 de octubre de 2026

## Resultado

El editor conserva No iniciado, Activo, Completado y Cerrado, en ese orden. El backend usa la categoría persistida y la posición configurada de sus hijos: conserva códigos presentes; para los retirados toma la posición equivalente y, si no existe, el último destino de la misma categoría. Un destino único absorbe todos los orígenes de su categoría. Scrum «COMPLETADO» sigue perteneciendo a Activo.

Si faltan destinos en una categoría utilizada, la petición falla antes de crear códigos o modificar el flujo. El editor muestra el error en esa sección, le da foco y permite corregirlo con «Añadir estado». No hay formulario de reasignación, motivos ni confirmación adicional de aplicación.

Un solo «Guardar como plantilla» abre el formulario de nombre y crea una plantilla particular sin aplicar el flujo. Se retiraron la flecha, el menú redundante y la rama de guardado/actualización asociada al botón anterior. Se conservaron los tokens GM, controles existentes, foco visible, Escape por capas y adaptación móvil, siguiendo las guías de diseño y accesibilidad consultadas.

## Persistencia y sincronización

- `PATCH /api/projects/<id>/task-states/` calcula la correspondencia con datos actuales bajo el bloqueo del proyecto. Una revisión obsoleta devuelve 409.
- Configuración, códigos nuevos, reasignaciones e historial comparten una transacción y el autor/operación autenticados. No se usa la transición funcional ordinaria para sustituir un hijo de la misma categoría.
- Incluye subtareas y registros archivados. Conserva parentesco, archivo, progreso, motivo histórico, responsables, fechas, prioridad, estimación, etiquetas, descripción y posiciones manuales. Los códigos históricos no se eliminan.
- El payload de frontend contiene solo `template`, `revision` y `states`. La antigua entrada `reassignments` se acepta por compatibilidad en backend, pero no determina destinos ni motivos.
- La respuesta incluye la colección autorizada confirmada junto con la configuración. Workspace actualiza ambas fuentes conjuntamente; Lista y Kanban reconstruyen grupos y contadores con los mismos datos. Búsqueda y preferencias siguen montadas.
- El detalle compartido invalida sus recursos y páginas por versión de configuración; descarta lecturas y callbacks anteriores. El transporte existente invalida lecturas compartidas al confirmar una mutación.
- Kanban también abre el detalle compartido: su anterior acción `detail` abría un modal genérico sin contenido.

## Archivos principales

Backend:

- `apps/projects/services/statuses.py`: correspondencia, validación de categorías, transacción, auditoría y respuesta confirmada.
- `apps/projects/serializers.py`: descarta la reasignación manual recibida por compatibilidad.
- `apps/projects/tests/test_template_application.py` y `test_template_application_mysql.py`: cobertura dirigida nueva.
- `test_state_templates.py`, `test_state_templates_mysql.py` y `test_task_states.py`: expectativas afectadas adaptadas a la nueva regla.
- Wrappers `scripts/verify_task_status_mysql.ps1` y `verify_task_detail_browser.ps1`: admiten las verificaciones nuevas.

Frontend:

- `TaskStatusConfiguration/useTaskStatusConfiguration.ts` y `TaskStatusConfigurationDialog.tsx`: aplicación simple, errores por categoría y único guardado independiente.
- `ProjectWorkspace/ProjectWorkspace.tsx`, `TaskDetail/TaskDetailContent.tsx`, `TaskDetail/useTaskDetail.ts` y `types.ts`: colección/configuración confirmadas e invalidación del detalle.
- `tests/stateTemplates.test.mjs`, `taskDetail.test.mjs`, `verify-state-browser.mjs` y `verify-template-application-browser.mjs`: contratos y recorridos actualizados.

Se conservaron los cambios locales previos de la vista Lista; no se revirtieron ni se incluyeron en esta descripción como trabajo nuevo.

## Verificaciones ejecutadas

| Entorno | Resultado |
| --- | --- |
| SQLite explícito, `AUTH_TEST_SQLITE=1` | 21 pruebas dirigidas: 7 nuevas, 5 de consistencia de Lista, 6 de plantillas y 3 de configuración existente |
| MySQL 8.4 temporal real | 7 pruebas nuevas, con triggers reales: historial único, archivadas, atributos conservados y rollback después de escrituras |
| Chrome + Django + MySQL temporales | 5 recorridos aprobados; sin excepciones de ejecución |
| Frontend `npm test` | 88 aprobadas |
| `npx tsc -b` y ESLint dirigido | Correctos |
| `npm run build` | Correcto; permanece la advertencia de bundle mayor de 500 kB |
| Django `check`, `makemigrations --check --dry-run` | Correctos; sin cambios de esquema |
| `git diff --check`, frontend y backend | Correctos |

MySQL y navegador se ejecutaron con datos sintéticos en contenedores nuevos y puertos loopback. Los wrappers eliminaron contenedores, servidores y credenciales temporales. No se conectó Aiven ni una base compartida. No se modificó SQL ni ninguna migración; no hay migraciones pendientes por este cambio. Sin commit ni push.

Repetición de las pruebas nuevas, desde backend:

```powershell
$env:AUTH_TEST_SQLITE='1'
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_template_application --noinput
./scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_template_application_mysql
./scripts/verify_task_detail_browser.ps1 -BrowserTest verify-template-application-browser.mjs
```

Las 14 pruebas SQLite adicionales corresponden a `test_list_consistency` y los métodos dirigidos de `StateTemplateTests` (presets, persistencia, aplicación automática, rollback, identidad y aislamiento) y `TaskStateFlowTests` (orden de categorías, subtarea archivada y revisión obsoleta). No se ejecutaron suites completas ajenas al cambio.

## Evidencias y límite existente

- `navegador.json`: cinco recorridos y peticiones de interfaz, sin credenciales.
- `01_editor_sin_reasignacion.png`: editor sin formulario secundario ni botón duplicado.
- `02_error_en_categoria.png`: error inline al retirar Completado con tareas.
- `03_editor_movil.png`: editor a 390 px con pie accesible.

Gantt continúa siendo el placeholder existente «pendiente de implementación». No hay un gráfico operativo que sincronizar o comprobar; no se añadió una vista Gantt en este cambio.
