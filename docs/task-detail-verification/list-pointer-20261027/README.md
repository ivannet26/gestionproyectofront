# Lista: clic, arrastre completo y Estado — 27 de octubre de 2026

Se aplicó esta corrección sobre frontend `d7c04ef78aa885601ad859911441ab7df7894bc0` y backend `04ad8f492d154d7fe3ff1e029d4561bd25618a28`. Se conservaron los cambios anteriores y el directorio previo sin seguimiento `list-consistency/intento-previo/`. No se crearon commits ni se hizo push.

## Comportamiento final

- Durante el movimiento solo se atenúa la fila original y se muestra una línea fina de inserción válida. Se eliminó la tarjeta flotante, sus textos y el estado de posición del puntero que la sostenía. No hay clones de filas ni cambios de medidas. Los tooltips de las propiedades se ocultan durante el gesto; un destino inválido no presenta línea y usa el cursor de prohibición.
- La captura de `pointerdown` observa toda la fila, incluidos los botones de responsable, inicio, límite, prioridad, estado, etiquetas, título y expansor. No cancela el clic inicial ni sustituye sus handlers. El arrastre empieza al recorrer 6 px con el botón principal del ratón; mantener pulsado o desplazarse menos conserva el clic normal.
- Al superar el umbral se activa una protección temporal del clic residual en captura de documento. Cubre también el caso en que la fila se reubica o la liberación ocurre fuera del control original. Se retira al consumir ese clic, después de liberar el puntero, ante un gesto nuevo, blur o desmontaje. Las activaciones por teclado no se bloquean.
- Inputs, textareas, selects, contenido editable y contenido de popovers, menús y diálogos conservan su interacción y no inician el movimiento de la tarea subyacente. Se mantiene la exclusión de touch, botones secundarios, tareas sin permiso y agrupaciones incompatibles.
- Estado conserva la búsqueda, las opciones autorizadas y Guardar/Cancelar. Se eliminaron la sección de posición entre hermanos, su estado local y el componente exclusivo `TaskMoveControl`. El cambio manual usa el endpoint existente de estado con `{ state_code }`; no envía `before_id` ni posiciones calculadas. El orden queda a cargo de la política existente del backend.
- El arrastre conserva el endpoint de movimiento con `before_id` y `expected_revision`, autoscroll, Escape, confirmación de servidor y errores sin replay automático ante 409. Mover un padre o una subtarea no propaga estados, no cambia `parent_id` y no altera otros atributos.

No se modificaron servicios, contratos, Axios, autenticación, backend, esquema ni migraciones. La documentación y capturas de `list-presentation-20261027/` se conservan como evidencia de la versión anterior; este informe describe la corrección actual.

## Archivos afectados

- `src/features/projects/TaskList/useTaskPointerDrag.ts`: superficie completa, exclusiones de edición y protección del clic residual.
- `src/features/projects/TaskList/TaskList.tsx`: captura del gesto en fila y eliminación de la vista previa y props de posición del selector.
- `src/features/projects/TaskList/useTaskMove.ts`: retirada de estado exclusivo de la tarjeta flotante.
- `src/features/projects/TaskList/taskListInteractions.css`: señal discreta, cursor de destino y ocultación de tooltips solo durante arrastre de Lista.
- `src/features/projects/TaskList/TaskCell.tsx`: editor de Estado sin posiciones.
- Eliminado `src/features/projects/TaskList/TaskMoveControl.tsx`, sin referencias de producción restantes.
- `tests/taskPointerDrag.test.mjs`: ocho pruebas de gesto, incluyendo botones, clic residual fuera de fila, nuevas interacciones, teclado, Escape, cancelación, blur y desmontaje. El doble de EventTarget normaliza las opciones de captura para Node.
- `tests/taskDetail.test.mjs`: retirada del stub del componente eliminado.
- `tests/verify-list-presentation-browser.mjs`: recorrido de navegador ampliado y actualizado; las evidencias nuevas se guardan aquí, sin sobrescribir las anteriores.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 122/122 aprobadas |
| `npx tsc -b` | Aprobado |
| ESLint dirigido a fuentes y pruebas modificadas | Aprobado |
| `npm run build` | Aprobado; continúa el aviso previo de chunk superior a 500 kB, sin elevar el umbral |
| `verify_task_detail_browser.ps1 -BrowserTest verify-list-presentation-browser.mjs` | 20 comprobaciones aprobadas con Chrome, Django y MySQL 8.4 reales y temporales |
| `git diff --check` | Aprobado |

El navegador prueba clic y arrastre desde título, fondo, responsable, inicio, límite, prioridad, estado, etiquetas y expansor; pulsación mantenida sin movimiento y desplazamiento inferior al umbral; inputs y botones de popovers abiertos; ausencia de clic residual y de modales o editores accidentales; dimensiones estables y ausencia de tarjeta flotante; reordenamiento inicial/intermedio/final; estados vacíos y contraídos; tres niveles y estados independientes; recarga; cancelación y autoscroll; 409 real sin replay; permisos readonly; y selector de Estado sin selección de posición. También conserva las comprobaciones previas de fechas, agrupación, etiquetas, detalle y Tablero.

`navegador.json` contiene el detalle de las veinte comprobaciones y de las solicitudes de tareas, sin cookies, tokens ni credenciales. Capturas destacadas:

- `03_arrastre_subtarea.png` y `06_arrastre_desde_responsable.png`: una sola línea, sin tarjeta flotante.
- `05_estado_sin_posicion.png`: selector de Estado simplificado.
- `01_jerarquia_tres_niveles.png`, `02_propiedad_y_etiquetas.png` y `04_destino_incompatible.png`: contexto y regresiones preservadas.

No se ejecutaron migraciones ni escrituras de prueba en Aiven o bases compartidas. El wrapper existente creó y eliminó su contenedor, servidores y credenciales sintéticas; backend quedó limpio. La validación de navegador corresponde a Chrome. Todo el diff de esta solicitud queda sin commit para revisión.
