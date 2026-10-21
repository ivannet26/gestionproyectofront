# Arrastre y fechas de creación

Verificación final: 21/10/2026, 10:45–10:49, America/Lima (UTC−05:00). Árboles locales sobre frontend main `85b11de4e8bf6bf8d0c73c3455ac05950f3d1af1` y backend `ec94f876b201c7f690d1fcc01242b147cf6f9006`. Ambos estaban limpios antes de este ajuste; no se hizo commit ni push.

## Resultado y causa

El arrastre estaba limitado al control de movimiento y sus destinos se derivaban de las transiciones secuenciales; reutilizaba además la confirmación con motivo. Ahora la fila completa inicia el arrastre (nombre, propiedades y espacio de celda); los campos de edición abiertos no se arrastran. Los destinos incluyen cualquier estado configurado permitido por permisos, responsables, dependencias, entregables y jerarquía. Se aplica una sola petición sin motivo ni confirmación adicional. El selector ordinario de cambio de estado conserva su contrato anterior.

La presentación sigue las skills UI UX Pro Max y Web Design Guidelines: identidad GM conservada, destinos con tinte de su estado, vista previa compacta, inserción sin desalinear columnas y alternativa de teclado/clic para no depender del arrastre. Sin dependencias nuevas.

Las tareas nuevas usan como mínimo hoy en Lima, respetando también proyecto/padre. El formulario completo y el inline deshabilitan fechas anteriores; la API las rechaza sin registros parciales. No se cambian fechas existentes; siguen editables dentro de los límites originales. La fixture sintética simula explícitamente una tarea histórica del 7 de octubre.

## Verificaciones realmente ejecutadas

| Verificación | Resultado final |
| --- | --- |
| Frontend `npm test` | 84 aprobadas, 0 fallidas, 0 omitidas |
| Backend dirigido SQLite | 149 aprobadas, 0 fallidas, 0 omitidas |
| Integración MySQL temporal | 16 aprobadas, 0 fallidas, 0 omitidas |
| Regresión de estados MySQL temporal | 13 aprobadas, 0 fallidas, 0 omitidas |
| Chrome real + React + Django + MySQL | 6 comprobaciones aprobadas; sin errores de ejecución JS |
| Tipado, lint dirigido, build, Django check, comprobación de migraciones, diff --check en ambos repositorios | Correctos |

Build conserva el aviso de bundle mayor de 500 kB; no se modificó la estrategia de empaquetado. El lint de TypeScript/JavaScript final no tiene avisos; una invocación anterior que incluía CSS indicó que ese archivo no está cubierto por ESLint.

El navegador verificó arrastre nativo desde nombre/fecha/responsable/celda, salto no secuencial a Cerrado, Bloqueada y En revisión, una petición por movimiento, orden tras recargar, alternativa con teclado, creación completa e inline desde hoy, edición de fechas históricas y rechazo de creación pasada sin datos parciales. El detalle está en `navegador.json`, sin credenciales. No se afirma prueba en teléfono físico ni ejecución del antiguo guion completo de integraciones durante este ajuste.

Capturas reales finales: `01_arrastre_desde_nombre.png`, `02_linea_insercion.png`, `03_creacion_desde_hoy.png`, `04_tarea_existente_preservada.png`. `intento-previo/` conserva el fallo intermedio del guion por desplazamiento bajo encabezado sticky; no representa el resultado final. La primera regresión MySQL detectó que el ensayo de reversión 0010 debía deshacer primero 0014; se corrigió el orden del ensayo y pasó la regresión final, sin debilitar la protección de migraciones.

## Comandos

Desde frontend:

```powershell
npm test
npx tsc -b
npx eslint src/features/projects/TaskForm/TaskForm.tsx src/features/projects/TaskForm/TaskProperties.tsx src/features/projects/TaskForm/taskDates.ts src/features/projects/TaskList/QuickTaskRow.tsx src/features/projects/TaskList/TaskList.tsx src/features/projects/TaskList/TaskMoveControl.tsx src/features/projects/TaskList/useTaskMove.ts tests/projectIntegrations.test.mjs tests/quickTaskPresentation.test.mjs tests/verify-project-integrations-browser.mjs tests/verify-list-refinements-browser.mjs
npm run build
git diff --check
```

Desde backend:

```powershell
$env:AUTH_TEST_SQLITE='1'
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_project_integrations apps.projects.tests.test_quick_tasks apps.projects.tests.test_task_inline --noinput
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_project_integrations apps.projects.tests.test_projects apps.projects.tests.test_task_detail apps.projects.tests.test_performance apps.projects.tests.test_assignees apps.projects.tests.test_state_templates apps.projects.tests.test_quick_tasks apps.projects.tests.test_task_inline apps.projects.tests.test_task_states --noinput
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_project_integrations_mysql
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_state_templates_mysql
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_detail_browser.ps1 -BrowserTest verify-list-refinements-browser.mjs
git diff --check
```

El primer dirigido SQLite pasó 37 pruebas; está incluido en las 149 de la regresión posterior, no se suma dos veces.

## Despliegue pendiente

La migración nueva `0014_task_direct_move` mantiene los procedimientos anteriores como envoltorio compatible y añade el modo directo con las mismas protecciones de integridad. Se probó instalación y restauración sobre MySQL 8.4 local desechable. No se alteraron migraciones anteriores ni modelos.

Antes de usar esta versión contra MySQL hay que detener las escrituras de tareas y aplicar 0014 con `TASK_MOVE_MIGRATION_MAINTENANCE=1`, desde una sesión de despliegue autorizada; después desactivar la variable. La reversión exige la misma parada y valida las definiciones antes de restaurarlas; el DDL de MySQL no es transaccional. No se aplicó a Aiven ni a bases compartidas. Los wrappers eliminaron contenedores, servidores y credenciales temporales.
