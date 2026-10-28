# Lista: arrastre y agrupación por la raíz

Verificación final: 27/10/2026, Chrome 156.0.8078.48, viewport 1600 × 1000. Resultado sin commit ni push. Se conservaron los cambios locales anteriores.

## Diagnóstico y corrección

- La vista previa se había eliminado al simplificar el feedback. Se incorpora una representación estática de la fila real, con sus seis columnas y medidas, conservando el punto de agarre. Vive en `document.body`, es `inert`, se oculta a accesibilidad y no contiene controles operativos. Desaparece al soltar, cancelar o desmontar. Se mantienen la atenuación del original y una sola línea de inserción, sin variar la geometría.
- El inicio dependía de los eventos de cada `tr`. Ahora una única captura en la superficie de la tabla identifica la fila receptora; la resolución geométrica cubre límites recibidos por `table`/`tbody`, respeta al receptor nativo y usa intervalos sin solapamiento. No se eliminan eventos de los controles. Se mantienen el umbral de 6 px, el clic habitual, el bloqueo del clic residual y la exclusión de editores, popovers y portales. El muestreo inicial de 16 puntos ya respondía: no se atribuye el problema intermitente a un wrapper específico sin evidencia. La cobertura final comprueba 78 puntos, incluidos bordes subpíxel y límites compartidos.
- La construcción inicial agrupaba estados propios y después otra proyección redistribuía filas según la expansión. Se elimina esa proyección alternativa. Jerarquía y agrupación usan el mismo mapa de raíces para carga, mutaciones y recarga. Los contadores incluyen los miembros del árbol aunque estén contraídos, una vez por tarea. Cada descendiente conserva su estado propio. El arrastre de una subtarea puede cambiar ese estado y mantiene su padre; su línea de inserción se calcula dentro de su árbol. Tablero mantiene la agrupación por estados propios.
- La captura y la vista previa se limpian al abandonar el proyecto. Los eventos de pérdida de foco de controles no se confunden con una pérdida de foco de la ventana. Endpoints, Axios, autenticación y revisión de concurrencia se conservan.

## Archivos de implementación

- `src/features/projects/TaskList/TaskList.tsx`: captura común, disposición del árbol y destinos compatibles con el padre.
- `src/features/projects/TaskList/taskDragSurface.ts`: resolución única de la fila inicial.
- `src/features/projects/TaskList/taskDragPreview.ts`: vista previa estática y seguimiento del cursor.
- `src/features/projects/TaskList/useTaskPointerDrag.ts`: ciclo del gesto, captura, cancelación y limpieza.
- `src/features/projects/TaskList/taskHierarchy.ts` y `taskGrouping.ts`: raíz común y agrupación definitiva.
- `src/features/projects/TaskList/taskListInteractions.css`: presentación discreta de la vista previa.
- `src/features/projects/TaskList/useTaskMove.ts`: distinción del evento de pérdida de foco de ventana.
- `src/features/projects/ProjectWorkspace/ProjectWorkspace.tsx`: desmontaje de Lista al cambiar de proyecto.
- Se retira `taskStatePresentation.ts`, cuya proyección dependía de la expansión.

Las adaptaciones de pruebas están en `taskListPresentation.test.mjs`, `taskGrouping.test.mjs`, `taskPointerDrag.test.mjs`, `taskGroupControls.test.mjs` y `projectHeader.test.mjs`. Se añade `verify-list-root-drag-browser.mjs` y se actualiza el controlador anterior `verify-list-presentation-browser.mjs`; este último no se ejecutó por separado en esta corrección. Los cambios previos en `TaskCell`, la eliminación de `TaskMoveControl` y las pruebas de detalle se conservaron.

## Verificaciones ejecutadas

| Verificación | Resultado |
| --- | --- |
| `npm test` | 125 aprobadas; 0 fallos, omitidas o canceladas |
| `npx tsc -b --pretty false` | Aprobado; también ejecutado por el build |
| ESLint dirigido sobre los archivos de implementación y pruebas afectados | Aprobado |
| `npm run build` | Aprobado; aviso del paquete principal de 628,29 kB, superior a 500 kB |
| `git diff --check` en frontend y backend | Aprobado |
| Chrome con eventos nativos de ratón y teclado, Django real y MySQL temporal | 12 verificaciones aprobadas; 0 errores de ejecución del navegador |

Chrome comprobó tres niveles con estados distintos; ausencia de duplicados; contadores y expansión; cambios manuales de hijo y raíz sin propagación; persistencia tras recarga; clics en título, fondo, responsable, fechas, prioridad, estado, etiquetas y expansor; arrastre desde nueve superficies; 78 puntos de bordes y celdas; medidas y punto de agarre; una única vista previa pasiva y como máximo una línea; pulsación inmóvil y movimiento bajo el umbral; búsqueda dentro de un popover sin arrastre subyacente; Escape sin clic residual; cambio de estado de una subtarea; conservación de padre y atributos; autoscroll; reordenamiento de raíces; respuesta 409 real sin reintento y con actualización explícita; agrupación propia de Tablero y permisos de trabajador en proyecto de lectura.

Los movimientos confirmados devolvieron 200. El conflicto provocado devolvió 409 una sola vez, conservó el estado del servidor y no repitió la escritura. Los cambios de estado y movimientos no enviaron motivos.

## Evidencias y reproducción

- `navegador.json`: ejecución final, versión, verificaciones y solicitudes de proyectos sin credenciales ni tokens.
- `cobertura-superficie.json`: los 78 puntos, el receptor nativo y la fila que inició el gesto; coinciden en los 78 casos.
- `01_arbol_raiz_pendiente.png` y `02_raiz_cambiada_recarga.png`: estados independientes y árbol tras cambiar la raíz y recargar.
- `03_preview_fila.png`, `03_subtarea_arrastre_cursor.png` y `05_preview_autoscroll.png`: capturas durante el movimiento.
- `04_subtarea_recarga_bajo_raiz.png` y `06_reordenamiento_persistido.png`: persistencia y jerarquía.
- `baseline/`: diagnóstico inicial conservado. `intento-previo/` conserva la captura de un intento anterior del controlador, no corresponde al resultado final.

El lanzador `docs/qa-list-root-drag-20261027/run_browser.ps1`, en la carpeta que contiene ambos repositorios, crea un contenedor MySQL 8.4 vacío, enlazado solo a loopback, y servidores QA en 8819/5189. Ejecuta el controlador nuevo y elimina sus servidores, contenedor y credenciales temporales. No reutiliza bases compartidas, no modifica `.env` ni ejecuta migraciones en Aiven. Guarda evidencias fuera de la raíz observada por Vite y las copia después de detenerlo para evitar recargas de desarrollo provocadas por los archivos de prueba. Los checkpoints y registros se conservan junto al lanzador.

## Alcance y límites

La ejecución visual cubre Chrome de escritorio con ratón, no una matriz de navegadores, tamaños o dispositivos táctiles. Los casos unitarios complementan cancelación del puntero, pérdida de captura, portales, edición y desmontaje. No se ejecutaron pruebas de producción ni escrituras en Aiven. El backend permanece sin cambios. El aviso de tamaño de build queda visible; no se alteró su umbral ni se amplió esta corrección para dividir el paquete.
