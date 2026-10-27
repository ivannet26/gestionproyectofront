# Lista: jerarquía, movimiento, propiedades y fechas — 27 de octubre de 2026

## Cambios

Se trabajó sobre los repositorios actuales, con frontend en `8b136f4` y backend en `2646d18`. No se reinició la integración, no se restauraron archivos históricos completos y no se crearon commits ni se hizo push. Se conservaron la composición Workspace/Toolbar, Axios, autenticación, sesión compartida, permisos y controles de concurrencia.

### Jerarquía y estados

La agrupación por estado conserva su pertenencia y contador basados exclusivamente en el estado persistido de cada tarea. La presentación del árbol se calcula aparte: expandir un padre muestra sus descendientes autorizados con sus estados reales, incluidos niveles adicionales. Cada tarea tiene una sola fila real entre los grupos de estado.

Cuando un descendiente se muestra junto a su padre en otro grupo, su grupo propio indica cuántas tareas se muestran «junto a su padre», conservando el contador correcto. Al contraer vuelve a su ubicación por estado cuando corresponde. Los ancestros que solo sirven de contexto son referencias compactas sin propiedades editables ni pertenencia ficticia. Se conservan `parent_id`, niveles, orden entre hermanos y las otras cuatro agrupaciones y preferencias.

Expandir, contraer, reagrupar y recargar no escriben estados. El backend existente ya modifica una sola identidad por transición o movimiento; se añadió una regresión de tres niveles sin cambiar servicios de producción.

### Arrastre

Se conserva Pointer Events desde la superficie y título, el umbral de 6 px, la exclusión de controles, autoscroll, Escape y apertura de detalle mediante clic normal. La fila origen se atenúa y queda inerte durante el gesto; una vista previa compacta sigue al puntero con título, padre, destino y posición. No tiene identidad de fila persistida. Una única línea fina indica la inserción sin alterar medidas de tabla ni enmarcar grupos.

Los destinos de otro padre, filas de otro estado anidadas en el grupo o estados no permitidos muestran el motivo de incompatibilidad y no presentan línea ni guardan. El endpoint, `expected_revision` y respuesta confirmada existentes siguen gobernando la colección; un 409 no repite la escritura y ofrece actualización explícita. No se envían motivos.

Se eliminó el menú final de tres puntos con su columna, importaciones, handlers y contenido exclusivo. Las acciones compartidas del detalle y Tablero permanecen. Para conservar la alternativa por teclado y clic, el movimiento entre hermanos se ofrece dentro del editor existente de Estado, sin otro menú de fila. El foco tras mover vuelve al título.

### Propiedades y etiquetas

Los estilos se limitan a `.gm-task-list` y a los triggers de propiedades con apariencia `list`: fila sutil, fondo y borde individual solo en hover, foco visible o editor abierto. No cambian medidas al activarse. El navegador reveló además que el tooltip enfocado de una celda interceptaba el control de la fila anterior; `nonBlocking` corrige únicamente los tooltips de propiedades de Lista, conservando el comportamiento predeterminado de otros usos.

El historial local `056368f:src/features/projects/TaskForm/TaskIcon.tsx` confirma el icono original: `path="m3 12 9 9 9-9-9-9H3z"` y círculo en `(8,8)`. Se reutiliza ese componente existente, sin sustituirlo por `#`. Se ubica a la izquierda del responsable con espacio reservado; aparece en hover y foco, conserva el selector de especialidades y no inicia arrastre ni abre detalle.

### Fechas y registros históricos

El rojo significa **valor actual de esa fecha anterior al día de creación de la tarea**. Se compara cada `YYYY-MM-DD` de inicio o límite con el día de `created_at` convertido a `America/Lima`. No interviene «hoy» en el color.

| Creación | Fecha actual | Color |
| --- | --- | --- |
| 26/10 | 22/10 | Rojo |
| 20/10 | 22/10, observado el 26/10 o después | Normal |
| 26/10 | 26/10 o posterior | Normal |

Editar una fecha vuelve a evaluar únicamente su valor actual contra el mismo día de creación; no cambia `created_at` ni el color de la otra fecha. El texto accesible dice «Fecha actual anterior al día de creación». Los calendarios de tareas usan también esa referencia para el color seleccionado; el calendario de proyectos conserva su comportamiento previo. La validación de fechas al crear tareas y la agrupación «Con atraso» permanecen separadas de esta señal visual.

`Task.created_at` ya existe en la columna `creado_en` y se devuelve en snapshots. Por ello no se requiere migración ni backfill. Un timestamp de creación ausente o inválido no se sustituye por «hoy» y no produce rojo. La regla describe los valores actuales; no reconstruye ni afirma conocer las fechas originalmente introducidas. Las ediciones disponibles en actividad no garantizan un historial completo de todos los registros históricos, por lo que no se inventan valores originales ni se deducen a partir de un indicador genérico de vencimiento.

## Archivos afectados

Frontend:

- `src/features/projects/TaskList/TaskList.tsx`, `taskStatePresentation.ts`, `useTaskMove.ts`, `TaskMoveControl.tsx`, `TaskCell.tsx`, `taskListInteractions.css`.
- `src/features/projects/TaskForm/taskDates.ts`, `TaskDateValue.tsx`, `TaskProperties.tsx`, `TaskOptionalProperties.tsx`, `TaskProperty.tsx`.
- `src/features/projects/CreateProjectModal/ProjectEndDateSelector.tsx` y `src/shared/Tooltip.tsx`.
- Nueva regresión `tests/taskListPresentation.test.mjs` y recorrido `tests/verify-list-presentation-browser.mjs`.
- Adaptación de imports/contratos en `tests/projectHeader.test.mjs`, `projectIntegrations.test.mjs`, `taskDetail.test.mjs`, `taskGroupControls.test.mjs`.

Backend, exclusivamente pruebas y preparación aislada:

- `apps/projects/tests/test_list_consistency.py`.
- `apps/projects/tests/task_detail_server.py`.
- `scripts/verify_task_detail_browser.ps1`.

## Verificaciones aprobadas

| Verificación ejecutada | Resultado |
| --- | --- |
| `npm test` | 120/120, incluidas cinco regresiones nuevas de jerarquía/fechas y las de arrastre, permisos, sesión y Axios existentes |
| `npx tsc -b` | Correcto |
| ESLint dirigido a fuentes y pruebas afectadas | Correcto |
| `npm run build` | Correcto; permanece el aviso previo de chunk superior a 500 kB, sin elevar el umbral |
| `AUTH_TEST_SQLITE=1 ... manage.py test apps.projects.tests.test_list_consistency` | 6/6, configuración explícitamente aislada |
| `verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_list_consistency_mysql` | 6/6 sobre MySQL 8.4 temporal |
| `verify_task_detail_browser.ps1 -BrowserTest verify-list-presentation-browser.mjs` | 15 comprobaciones aprobadas en Chrome, Django y MySQL reales y aislados |
| Django check y compilación Python dirigida | Correctos |
| `git diff --check`, frontend y backend | Correctos |

El navegador confirma tres niveles y estados distintos, transiciones manuales independientes y persistencia tras recargar, cinco agrupaciones sin escrituras, los tres ejemplos de fechas y edición/restauración histórica, hover/foco/medidas y editor abierto, icono/posición/edición de etiquetas, seis columnas sin menú final, arrastre repetido a estados vacíos y contraídos, primera posición absoluta/intermedia/final, rechazo de otro padre, Escape, autoscroll, alternativa accesible, conflicto 409 real sin replay, Lista/Tablero/detalle y trabajador readonly. No hubo excepciones de ejecución.

El recorrido inicial identificó y permitió corregir la intercepción real del tooltip. También se ajustaron esperas de navegación/cierre, selectores de enlaces y el contador de escrituras del driver para separar POST de los preflight OPTIONS. La ejecución final completa aprobó todas las comprobaciones; no se incluyen capturas de intentos fallidos como evidencia aprobada.

## Evidencias y límites

- `navegador.json`: comprobaciones, solicitudes y payloads de tareas, sin contraseñas, cookies ni tokens.
- `01_jerarquia_tres_niveles.png`: padre y dos niveles de descendientes con estados propios.
- `02_propiedad_y_etiquetas.png`: presentación y ubicación de etiquetas.
- `03_arrastre_subtarea.png`: vista previa, destino y línea de inserción.
- `04_destino_incompatible.png`: rechazo visual de una posición de otro padre.

No se ejecutaron migraciones ni escrituras de prueba en Aiven o bases compartidas. Los cambios no requieren una migración nueva. Los fixtures y credenciales fueron exclusivamente sintéticos y temporales; se eliminaron los contenedores y servidores del recorrido. No se afirma una auditoría exhaustiva de otras vistas ni una reconstrucción de datos originales históricos. La carpeta previa sin seguimiento `list-consistency/intento-previo/` permanece intacta. Todo lo realizado en esta solicitud queda sin commit para revisión.
