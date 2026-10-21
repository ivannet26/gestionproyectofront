# Refinamiento visual del detalle compartido de tareas

Fecha: 20 de octubre de 2026, America/Lima (UTC−05:00). Ejecución local con cambios sin commit.

## Versión y alcance

- Frontend: rama main, commit 3a2cc012dd554a2daaafc0457105327dc51128b0.
- Backend: rama main, commit e1b870cb4eb4ff34394ff39c642d1e27c6f5ce6d.
- Se conservaron los cambios locales previos de ambos repositorios, incluida la eliminación previa de docs/task-list-quick-creation.md. No se hicieron commits ni push.
- Esta intervención modifica únicamente la presentación del detalle, su editor de duración, el plegado de Activity y sus pruebas. No cambia contratos, permisos, modelos, migraciones, procedimientos ni endpoints.
- Comparación SHA-256 del backend antes/después: 193 archivos versionados o locales no ignorados, sin cambios ni eliminaciones.

## Cambios implementados

- Jerarquía de título, etiquetas, valores, contadores e historial; separación más clara de propiedades, subtareas y relaciones. Colores configurados de estado/prioridad conservados.
- Estilos encapsulados en .gm-task-detail y variante opt-in appearance="detail"; Lista, formulario completo y otros modales conservan la variante predeterminada.
- Editores con tipografía, espaciado, encabezados y foco coherentes. Se eliminan iconos redundantes. Tooltips dentro del diálogo, sin interceptar clics, sin superponerse al editor abierto y posicionados dentro del área visible del modal.
- Duración mediante texto con unidades explícitas. Un día = 480 minutos; una hora = 60. Se mantiene estimated_minutes como entero o null. Incluye Guardar, Cancelar y Quitar estimación.
- Parser sin eval ni redondeo: abreviaturas d/h/min y palabras españolas en singular/plural, mayúsculas, espacios y minutos residuales. Rechaza números sin unidad, negativos, cero total, fracciones, unidades desconocidas/incompletas, repetidas y desbordamiento del máximo 2147483647.
- Activity se oculta sin desmontar: conserva DOM, grupos abiertos, eventos cargados, paginación y scroll. El contenido recupera el ancho. Botón con tooltip, nombre accesible, aria-expanded/controls y funcionamiento con ratón, Enter y Espacio.
- La preferencia de visibilidad permanece durante la apertura, incluso al navegar entre tareas. Ocultar no lee ni escribe en la API. Panel oculto inert y fuera de navegación; retorno al botón cuando el foco estaba en Activity.

Se aplicaron UI UX Pro Max y Web Design Guidelines a jerarquía, foco visible único, controles semánticos, accesibilidad y distribución adaptable, preservando la identidad neutral de GM. Se respetó la prohibición local de sombras y transiciones.

## Archivos intervenidos en esta tarea

Dentro de src/features/projects/TaskDetail/: TaskDetailContent.tsx, TaskDetailProperties.tsx, TaskActivity.tsx, TaskSubtasks.tsx, TaskRelations.tsx, detailFormat.ts y taskDetail.css.

Reutilización con opciones explícitas: src/features/projects/TaskForm/TaskProperty.tsx, src/features/projects/TaskList/TaskCell.tsx y src/shared/Tooltip.tsx.

Verificación: tests/taskDetail.test.mjs y tests/verify-task-detail-browser.mjs. Evidencias e informe en esta carpeta. Otros cambios presentes en git status corresponden al trabajo previo.

## Capturas reales

Las cuatro imágenes proceden de Chrome ejecutando React, Django y MySQL temporal con datos sintéticos, sin mock de API ni imágenes generadas. Escritorio: 1600×1000. Pantalla estrecha: 390×844.

| Archivo | Resultado visible |
| --- | --- |
| [Actividad expandida](<C:/Users/LENOVO/Documents/2. GM INGENIEROS/Sistema_G.Proyectos/GM_Gestor_Proyectos/frontend/docs/task-detail-verification/visual-refinement/01_actividad_expandida.png>) | Propiedades, subtareas y relación guardadas; Activity visible con historial real. |
| [Actividad oculta](<C:/Users/LENOVO/Documents/2. GM INGENIEROS/Sistema_G.Proyectos/GM_Gestor_Proyectos/frontend/docs/task-detail-verification/visual-refinement/02_actividad_oculta.png>) | Misma tarea y propiedades, ancho recuperado y control Mostrar actividad disponible. |
| [Editor de duración](<C:/Users/LENOVO/Documents/2. GM INGENIEROS/Sistema_G.Proyectos/GM_Gestor_Proyectos/frontend/docs/task-detail-verification/visual-refinement/03_editor_duracion.png>) | Editor de duración con equivalencia de día laboral, texto con unidades, quitar, cancelar y guardar. |
| [Pantalla estrecha](<C:/Users/LENOVO/Documents/2. GM INGENIEROS/Sistema_G.Proyectos/GM_Gestor_Proyectos/frontend/docs/task-detail-verification/visual-refinement/04_pantalla_estrecha.png>) | Propiedades y subtareas adaptadas, sin desbordamiento horizontal del diálogo. Activity continúa debajo del contenido mediante scroll. |

Las primeras dos capturas son comparables con los mismos datos; los cambios de scroll de Activity no representan una pérdida de eventos.

## Verificaciones ejecutadas

| Verificación final | Resultado |
| --- | --- |
| Pruebas frontend completas | 75 aprobadas, 0 fallidas, 0 omitidas. |
| Pruebas dirigidas de detalle, incluidas en las 75 | 9 aprobadas, 0 fallidas, 0 omitidas. |
| Chrome real + API real + MySQL 8.4 temporal | 9 bloques funcionales aprobados; sin excepciones de JavaScript. |
| TypeScript | Correcto (tsc -b, también incluido en build). |
| Lint dirigido | Correcto, sin avisos. |
| Build de producción | Correcto; aviso de bundle principal >500 kB, no se aumentó el umbral. |
| git diff --check | Correcto; únicamente avisos Git de normalización LF/CRLF. |

Comprobaciones reales del navegador:

- Nombre válido, vacío, sin cambios y largo; persistencia de propiedades, fechas y sus límites, prioridad, etiquetas, asignación cero/uno/varios.
- Duración 2 d→960, 4 h→240, 1 d 4 h→720, 90 min→90 y reapertura como 1 h 30 min. Cancelar y confirmar sin cambios no envían PATCH ni añaden actividad. Quitar/vacío confirmado producen null; inválidos no guardan; Enter guarda.
- Creación rápida de subtarea: foco inicial, Tab/Shift+Tab, Escape por capas, clic externo, cancelación sin escritura, borrador limpio y Enter sin duplicado.
- Relaciones y dependencias persistidas; rechazo de duplicados/ciclo; relación informativa y desvinculación.
- Activity: ratón, Enter/Espacio, DOM/accordion/scroll preservados tras paginación, retorno de foco desde dentro, ancho recuperado y visibilidad entre tareas. Se compara el número de solicitudes antes/después de alternar: no aumenta.
- En móvil, apertura de estado, responsables, fecha límite, prioridad, etiquetas y duración: paneles dentro del viewport; nombre largo sin overflow horizontal; plegado y contenido Activity accesible por scroll.
- Tarea sin subtareas comprobada en navegador. El estado sin historial se comprueba mediante renderizado unitario; no se presenta como prueba manual de un historial vacío real.
- Administrador, trabajador autorizado, solo lectura y usuario externo. Rechazo real 403 sin filtrar tareas. COMPLETADO en categoría Activo de Scrum no se cuenta como finalizado.

Las capturas no prueban por sí solas todas las reglas. No se ejecutaron suites unitarias del backend ni SQLite en esta intervención; la integración funcional sí utilizó MySQL real aislado.

## Comandos reproducibles

Desde frontend:

```powershell
node --experimental-vm-modules --test tests/taskDetail.test.mjs
npx tsc -b
npx eslint src/features/projects/TaskDetail src/features/projects/TaskList/TaskCell.tsx src/features/projects/TaskForm/TaskProperty.tsx src/shared/Tooltip.tsx tests/taskDetail.test.mjs tests/verify-task-detail-browser.mjs
npm test
npm run build
git diff --check
```

Desde backend, reutilizando el verificador existente sin editarlo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_detail_browser.ps1
```

El script crea una instancia MySQL 8.4 temporal y una base nueva gm_test_task_status_templates; ejecuta Django en localhost:8819 y Vite en localhost:5189. Genera credenciales transitorias fuera del repositorio. Al terminar elimina su contenedor, servidores y archivos transitorios. No utiliza Aiven ni bases compartidas.

## Respaldo y límites

- navegador.json: instante UTC de la ejecución final, nueve bloques y metadatos de solicitudes (método/ruta/estado; sin tokens ni cuerpos con credenciales).
- pruebas-frontend.log y build.log: salidas finales de comandos.
- La revisión encontró un tooltip capaz de tapar acciones con nombres largos en móvil; quedó corregido dentro de la variante del detalle y se repitió el flujo real.
- Durante la ampliación se corrigieron supuestos del verificador: texto nuevo de errores, carga de historial anterior, serialización de nodos CDP, selector de responsables y expectativa de historial vacío para una tarea que sí tenía evento de creación. No se cambiaron datos reales ni reglas para hacer pasar esos controles.
- No se afirma auditoría formal de accesibilidad ni prueba con lector de pantalla o dispositivo táctil físico; se comprobaron semántica/foco/teclado y viewport móvil emulado en Chrome.
- Pendiente ajeno al alcance: advertencia existente del bundle principal. El detalle sigue siendo de carga diferida (JS 28.13 kB; CSS 3.77 kB sin gzip).
