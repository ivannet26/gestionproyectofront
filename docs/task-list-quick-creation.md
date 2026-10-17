# Lista: contraste, avatares y creación rápida

- Los separadores usan neutral-200 en cada celda de la misma tabla colapsada, sustituyendo variables CSS inexistentes. Los estados conservan exactamente su fondo configurado y seleccionan tinta legible por luminancia, con nombre e indicador.
- Cada responsable usa `avatarFor`, compartida con el perfil y reforzada para nombres simples, espacios y acentos. No cambia el perfil ni hay consultas individuales. Cada avatar abre el mismo editor múltiple y ofrece el nombre completo con mouse/foco; sin asignación se muestra «Asignar responsable».
- `QuickTaskRow` utiliza `useQuickTask` → `createTask` → transporte autenticado existente. Bloquea envíos duplicados y descarta respuestas tras desmontar el proyecto. No existe otra persistencia ni recarga de página.
- `TaskOptionalProperties` comparte los selectores con el formulario completo. En la fila los opcionales comienzan realmente vacíos. El trabajador conserva la autoasignación backend. Cuando el grupo exige datos adicionales se indica el estado inicial configurado que se usará; no se interpretan nombres de grupos.
- Durante el borrador se pausan agrupación y búsqueda para conservar su ubicación. Cancelar/guardar los reactivan. Escape cierra el selector sin descartar la fila; los errores conservan el borrador. La fila se adapta al contenedor incluso con scroll horizontal de tabla.
- El botón superior conserva el formulario completo. No cambian sidebar, encabezado, favoritos ni gestor de plantillas. Se mantienen cinco agrupaciones, estados vacíos, jerarquía y contadores únicos.
- El frontend requiere el contrato backend y la migración 0011 documentados en `backend/apps/projects/migrations/reviews/0011_task_optional_properties.md`. No desplegar el frontend nuevo sin esa preparación; no ejecutar migraciones contra bases compartidas sin autorización específica.

Verificaciones reproducibles:

```powershell
npx.cmd tsc -b
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4177 --strictPort
$env:GM_BROWSER_REPORT_DIR='RUTA_ABSOLUTA_DE_DIRECTORIO_EXISTENTE'
node tests/verify-list-browser.mjs
```

El navegador usa API interceptada y datos sintéticos: verifica interfaz e interacción, no persistencia real. Sirve la fuente Inter ya instalada en lugar de depender de Google Fonts durante la prueba. Guarda capturas e informe JSON en el directorio indicado. Las pruebas backend comprueban persistencia y permisos por separado.

## Archivos de la implementación

- Lista y celdas: `TaskList/TaskList.tsx`, `TaskList/TaskCell.tsx`, `TaskList/stateInk.ts`, `TaskList/taskGrouping.ts`, `TaskList/taskHierarchy.ts` dentro de `src/features/projects/`.
- Creación: `TaskList/QuickTaskRow.tsx`, `TaskList/useQuickTask.ts`, `TaskList/quickTaskState.ts`; integración en `ProjectWorkspace/ProjectWorkspace.tsx` y contrato `types.ts`.
- Selectores compartidos: `TaskForm/TaskProperty.tsx`, `TaskForm/TaskOptionalProperties.tsx`, `TaskForm/PriorityOptions.tsx`, `TaskForm/TaskProperties.tsx`, `TaskForm/TaskForm.tsx`, `ResponsiblePicker/ResponsiblePicker.tsx`.
- Utilidades compartidas: `src/shared/avatar.ts`, `src/shared/Tooltip.tsx`.
- Pruebas: `tests/quickTask.test.mjs`, `tests/verify-list-browser.mjs`; adaptación de mocks en `tests/projectHeader.test.mjs` y `tests/taskGroupControls.test.mjs`.
