# Integración y verificación del gestor GM

Cierre: 21/10/2026, 10:08, America/Lima (UTC−05:00). El instante UTC exacto del navegador figura en navegador.json. Datos exclusivamente sintéticos.

## Versión

- Frontend: main, base 8dfd3a2823a730743239bced6c5c4ed56c801c51.
- Backend: main, base ff57db2ee81fc1a2a3b22d00b5b92747acda73b3.
- Se probó el árbol de trabajo SIN commit, no solamente esos hashes. Inventarios al final.
- Se conservaron los cambios locales previos de encabezado/barra, TaskProperty, agrupación, TaskList, ProjectToolbar y TaskSearch.
- Sin commits, push, nuevas dependencias, edición de Word ni escrituras/migraciones en Aiven.

Se aplicaron UI UX Pro Max y Web Design Guidelines: componentes compartidos, densidad e identidad GM, foco/Escape por niveles, alternativa al arrastre, controles táctiles y fechas accesibles más allá del color.

## Cuatro bloques implementados

1. Proyectos: Trabajadores/Equipos en una región compacta, integrantes expandibles y resumen de personas únicas. Limpieza de selección por origen/área y descarte de respuestas obsoletas. Flujo inicial en el editor existente como borrador local. Creación transaccional de proyecto/participantes/equipos/estados.
2. Etiquetas: Especialidades reales por ID, buscador/múltiples/chips y retirada, sin Técnica/No técnica en la interfaz de tareas. Histórico y requisitos conservados sin vinculación aproximada. Compartido por formulario, creación rápida, Lista, detalle y subtareas.
3. Lista: seis columnas estables, controles de celda, auxiliares en hover/foco/abierto y disponibles con puntero táctil. Arrastre nativo desde asa, posición persistente, alternativa de teclado/clic, motivo mediante formulario existente, destinos prevalidados, una solicitud, conflictos 409 y recuperación explícita. Encabezado sticky limitado al grupo y utilizable en scroll horizontal.
4. Asignación/fechas: equipos para localizar participantes ya elegibles, persistencia individual existente y sin altas ocultas. Fechas pasadas permitidas dentro de límites, rojo y ayuda “Fecha anterior a hoy”, hoy en America/Lima.

Antes faltaban asociaciones múltiples, identidad de especialidad y orden manual persistente. Las etiquetas libres dependían de clasificación legada y las acciones auxiliares permanecían visibles. Se completó la integración sobre permisos, auditoría y transiciones existentes, no mediante sistemas paralelos.

## Resultados finales

| Verificación | Aprobadas | Fallidas | Omitidas |
| --- | ---: | ---: | ---: |
| Frontend | 83 | 0 | 0 |
| Backend SQLite, ocho módulos dirigidos | 119 | 0 | 0 |
| Backend SQLite, regresión test_task_states | 29 | 0 | 0 |
| MySQL 8.4 temporal, nuevas integraciones | 15 | 0 | 0 |
| MySQL 8.4 temporal, regresión de plantillas | 13 | 0 | 0 |
| Chrome real + React + Django + MySQL | 13 comprobaciones | 0 | 0 |

Las ejecuciones en motores distintos no se suman como casos únicos. SQLite utiliza el modo aislado explícito del proyecto. MySQL se comprueba por separado con procedimientos/triggers reales y esquema sintético de las fixtures.

Aprobados: TypeScript, lint dirigido, build, Django check, makemigrations --check --dry-run y git diff --check en ambos repositorios. No se afirma ejecución de un lint Python no configurado.

El build conserva una advertencia: bundle principal de aproximadamente 575 kB minificado, 161 kB gzip, superior a 500 kB. No se subió el umbral para ocultarla. Los tests Node emiten la advertencia esperada de VM Modules experimental.

## Cobertura y límites

| Regla | Evidencia |
| --- | --- |
| Equipos, duplicados, área vigente, elegibilidad y sin acceso futuro automático | SQLite/MySQL; navegador crea con dos equipos/dos personas únicas, deshabilita equipo vacío y limpia selección oculta |
| Flujo local, categorías, Scrum y atomicidad | SQLite/MySQL y editor real sin escritura antes de crear |
| Identidad, renombrado, histórico, retirada y no-op de etiquetas | SQLite/MySQL; selección/retirada en Lista y persistencia desde formulario/creación rápida; detalle compartido |
| Responsables deben ser participantes efectivos | Rechazos SQLite/MySQL; navegador guarda uno/dos y conserva selección entre pestañas |
| Motivos, permisos, dependencias, subtareas, entregables | SQLite/MySQL; navegador confirma/cancela motivo y consulta en modo solo lectura |
| Estado/posición y orden | SQLite/MySQL: anclas/hermanos/no-op/backfill/fallo controlado; navegador recarga tras mover |
| Concurrencia | 409 por revisión obsoleta, estado conservado y actualización explícita, tanto tests como navegador |
| Arrastre | Drag nativo Chrome desde asa, grupo vacío e indicador; un POST. Anclas entre filas verificadas en backend y selector |
| Teclado/cancelación | Enter para menú de movimiento, Escape del motivo y retorno de foco; Tab/Shift+Tab/doble Enter en creación rápida; cancelación sin petición |
| Sticky/alineación | Comparación de anchos, 14 filas, límite de grupo y alineación horizontal a 390 px |
| Fechas | SQLite/MySQL para pasado y límites; navegador selecciona/guarda y comprueba rojo/ayuda accesible |
| Táctil | Chrome a 390 px con touchStart/touchEnd reales del emulador; popover dentro de ventana y auxiliares visibles |

No se afirma que las capturas demuestren todos los negativos. Histórico, roles, rollback y entregables se respaldan con backend. No se probó un teléfono físico, lectores de pantalla reales, carga de miles de tareas ni rendimiento Aiven. Auto-scroll está implementado; no se aporta una medición cuantitativa de velocidad.

La regresión MySQL detectó un cambio involuntario 409→400 al configurar estados con entregables pendientes. Se corrigió sin debilitar la prueba existente: el preview bloquea destinos, pero la confirmación conserva la validación/contrato del procedimiento. Los fallos intermedios del guion de navegador no se cuentan como aprobaciones.

## Ocho capturas finales

Aplicación real sobre MySQL temporal, sin mockups ni imágenes generadas:

| Archivo | Operación observada |
| --- | --- |
| [01_flujo_borrador.png](01_flujo_borrador.png) | Editor compartido, Scrum y aviso de guardar al crear |
| [02_equipos_proyecto.png](02_equipos_proyecto.png) | Dos equipos, integrantes y resumen deduplicado |
| [03_responsables_equipo.png](03_responsables_equipo.png) | Selección de trabajadores individuales desde equipo |
| [04_lista_fechas_etiquetas.png](04_lista_fechas_etiquetas.png) | Columnas, avatares, especialidad y fechas pasadas guardadas |
| [05_detalle_compartido.png](05_detalle_compartido.png) | Detalle, subtareas y Activity después de mover |
| [06_selector_tactil.png](06_selector_tactil.png) | Popover abierto mediante evento táctil a 390 px |
| [07_arrastre_nativo.png](07_arrastre_nativo.png) | Indicador real de destino durante el drag |
| [08_encabezado_sticky.png](08_encabezado_sticky.png) | Encabezado fijo al recorrer su grupo |

navegador.json contiene comprobaciones y metadatos método/ruta/estado, sin tokens/contraseñas. intentos-previos-guion contiene fallos intermedios, no capturas finales aprobadas. Se conservan salidas relevantes en .log; ejecuciones anteriores y finales se identifican por nombre.

## Comandos ejecutados

Frontend, desde su repositorio:

~~~powershell
npx tsc -b
npx eslint src/features/projects/CreateProjectModal src/features/projects/LabelEditor src/features/projects/LabelList src/features/projects/ProjectWorkspace src/features/projects/ResponsiblePicker src/features/projects/TaskForm src/features/projects/TaskList src/features/projects/TaskStatusConfiguration src/features/projects/TaskStateForm src/features/projects/TaskDetail/TaskActivity.tsx src/features/projects/TaskDetail/TaskDetailProperties.tsx src/features/projects/labelSelection.ts src/features/projects/services.ts src/features/projects/types.ts tests/projectIntegrations.test.mjs tests/stateTemplates.test.mjs tests/verify-project-integrations-browser.mjs
npm test
npm run build
git diff --check
~~~

Backend, desde su repositorio:

~~~powershell
$env:AUTH_TEST_SQLITE='1'
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_project_integrations apps.projects.tests.test_projects apps.projects.tests.test_task_detail apps.projects.tests.test_performance apps.projects.tests.test_assignees apps.projects.tests.test_state_templates apps.projects.tests.test_quick_tasks apps.projects.tests.test_task_inline --noinput
.venv/Scripts/python.exe manage.py test apps.projects.tests.test_task_states --noinput
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_project_integrations_mysql
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_status_mysql.ps1 -TestModule apps.projects.tests.test_state_templates_mysql
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify_task_detail_browser.ps1 -BrowserTest verify-project-integrations-browser.mjs
git diff --check
~~~

Los wrappers crean MySQL nuevo de loopback y credenciales efímeras; rechazan bases/puertos ya ocupados. El navegador utiliza 8819/5189. Se eliminan contenedores, procesos y credenciales temporales al finalizar. No se usó una copia de datos reales.

## Rendimiento medido

Comparación de task_snapshots del HEAD confirmado frente al árbol de trabajo, mismos datos SQLite sintéticos, tres iteraciones. No incluye HTTP, render o latencia MySQL:

| Tareas | Consultas HEAD / actual | Mediana ms HEAD / actual | Bytes JSON HEAD / actual |
| --- | --- | --- | --- |
| 10 | 9 / 17 | 2,03 / 5,05 | 7.861 / 9.521 |
| 100 | 9 / 17 | 4,78 / 8,44 | 78.692 / 95.292 |

El coste sube por revisión de orden y destinos prevalidados, pero las consultas no crecen por fila. No se presenta como mejora de latencia. Datos/comando: rendimiento-snapshot.json y comando-rendimiento.ps1. También pasan las pruebas existentes de paginación/consultas constantes.

## Esquema, contratos y despliegue

[Documentación del backend](../../../../backend/docs/project-integrations.md): endpoints/campos, pertenencia, compatibilidad histórica, 0013, mantenimiento y límites de reversión.

0013 está probada en MySQL sintético, NO aplicada a Aiven. Aplicación y comprobación del despliegue real requieren autorización y parada de escrituras. El DDL MySQL no se presenta como rollback transaccional.

## Inventario de archivos

Además de informes/respaldos, los archivos del árbol de trabajo se enumeran en archivos-modificados.txt. Incluye los cambios locales previos del encabezado/barra, conservados e integrados.
