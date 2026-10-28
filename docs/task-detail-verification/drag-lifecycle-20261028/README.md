# Reinicio inmediato del arrastre en Lista

Verificación del 28/10/2026. Sin commit ni push. Cambios anteriores conservados y backend sin modificaciones.

## Causas comprobadas

En Chrome, el checkpoint anterior permitió 24 cancelaciones y reinicios consecutivos. No se reproduce un cooldown constante tras Escape en ese muestreo. Sí se confirmó el bloqueo durante una escritura retenida: `busy` quitaba `data-drag-enabled` de todas las filas y `pending` descartaba nuevos movimientos.

Dos regresiones fallan contra copias de los archivos anteriores: una pérdida de captura pendiente anula el candidato siguiente; un callback antiguo de limpieza del clic borra la protección del gesto nuevo. Además, `abort` podía llamar a `end` después de terminar su sesión. Los checkpoints y esos fallos se conservaron sin restaurar archivos de la aplicación.

## Cambios

- `useTaskPointerDrag.ts`: cierre idempotente; pérdida de captura escuchada desde la activación; distinción de captura actual y notificaciones antiguas. El timer y la limpieza del clic pertenecen a cada gesto y no cambian las referencias del siguiente. Se mantiene la protección contra clics accidentales y el timer de cierre tras `pointerup`, sin reducir un timeout.
- `useTaskMove.ts`: cola explícita de movimientos terminados durante una escritura. Se envían en serie con la tarea, revisión, permisos y ancla de la última respuesta confirmada. Un ancla incompatible se rechaza sin inventar otra posición. Las respuestas anteriores no cancelan un gesto actual ni le roban el foco.
- Ante error o 409 se detiene la cola con aviso. No se repite la escritura ni se reproducen movimientos en espera. Una nueva suelta explícita consulta primero el servidor antes de guardar con la revisión actual. El aviso permanece al iniciar o cancelar un gesto y se conserva la actualización manual.
- `TaskList.tsx`: las filas siguen admitiendo gestos mientras se guarda; se muestra sincronización y número en espera. El destino usa la tarea actual. Se conservan preview, umbral, autoscroll, línea de inserción, permisos y árbol por la raíz.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| npm test | 131 aprobadas; cero fallos, omitidas o canceladas |
| npx tsc -b --pretty false | Aprobado |
| ESLint dirigido: tres archivos de implementación y dos de pruebas | Aprobado |
| npm run build | Aprobado; aviso del paquete principal de unos 629 kB, superior a 500 kB |
| git diff --check en frontend y backend | Aprobado |
| Chrome real con Django/MySQL QA | 9 bloques aprobados, sin pausas artificiales entre gestos |

Las regresiones nuevas están en `tests/taskPointerDrag.test.mjs` y `tests/projectIntegrations.test.mjs`: callbacks y timers tardíos, captura, 40 activaciones consecutivas, desmontaje, revisiones confirmadas, cola detenida y recuperación tras error.

Chrome comprobó 24 cancelaciones consecutivas de la misma tarea desde ocho superficies; cambio inmediato a otra tarea; clic normal; dos movimientos consecutivos de la misma tarea con el primero pendiente y revisiones distintas, ambos HTTP 200; confirmación tardía con otro gesto activo; error de red sin cancelar ese gesto; 409 real con una sola escritura y cola detenida; consulta previa al siguiente movimiento explícito; clics en propiedades; padre, atributos y árbol de tres niveles tras recarga; y desmontaje sin preview restante. Solo se espera por condiciones de interfaz o puertas de red controladas para simular respuestas pendientes.

## Evidencias

La carpeta `docs/qa-drag-lifecycle-20261028`, junto a ambos repositorios, contiene `run_browser.ps1`, `browser.mjs`, `baseline-unit.log`, snapshots `*.before`, diffs exclusivos, `unit.log` y `build.log`. En `evidence/` están `baseline.json`, `browser.json`, la traza nativa de puntero y las capturas `01_movimiento_en_espera.png`, `02_conflicto_sin_reintento.png` y `03_jerarquia_persistida.png`. No incluyen credenciales ni tokens.

El lanzador crea MySQL 8.4 vacío en loopback y servidores QA en 8819/5189. Elimina solo sus procesos, contenedor y credenciales temporales. No modifica `.env`, no utiliza bases compartidas y no ejecuta escrituras ni migraciones en Aiven.

La verificación visual cubre Chrome de escritorio con ratón. `pointercancel`, notificaciones de captura tardías y callbacks ya encolados se cubren con regresiones del ciclo de vida; no se presentan como una desconexión física del dispositivo.