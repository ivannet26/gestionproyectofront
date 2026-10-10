# AGENTS.md

## Alcance

Estas indicaciones aplican al repositorio frontend del sistema de GM Ingenieros y Consultores.

- Lee este archivo y revisa el código relacionado antes de modificarlo.
- Respeta el alcance solicitado y realiza únicamente los cambios necesarios.
- Conserva la arquitectura, los contratos y las convenciones existentes.
- Protege los cambios locales; no sobrescribas ni reviertas trabajo ajeno.
- No agregues funciones, refactorizaciones o dependencias que no sean necesarias para la solicitud.

## Stack y arquitectura

- Usa React, Vite y TypeScript estricto, según la configuración existente.
- Organiza cada funcionalidad dentro de `src/features/<dominio>`.
- Mantén componentes, servicios y tipos específicos dentro de su funcionalidad.
- Reserva `src/shared` para elementos reutilizados realmente entre funcionalidades.
- Mantén los estilos de los componentes en CSS Modules junto a estos. Usa los estilos globales existentes para elementos generales de la aplicación.
- Centraliza las rutas en `src/routes.ts` y usa React Router según la configuración instalada.
- No crees sistemas de rutas paralelos ni manipules directamente el historial del navegador.
- El frontend se comunica con Django REST Framework mediante la capa HTTP existente. Nunca accede directamente a MySQL.

## Convenciones de código

- Usa nombres técnicos en inglés y textos visibles de la interfaz en español.
- Usa `PascalCase` para componentes y tipos; `camelCase` para variables, funciones, propiedades y Hooks; y `UPPER_SNAKE_CASE` para constantes globales.
- Mantén cada componente y función enfocados en una responsabilidad clara.
- Define tipos explícitos para props, estados, respuestas y solicitudes de API.
- Evita `any`. Conserva los errores como `unknown` hasta validarlos o normalizarlos.
- Usa componentes funcionales y Hooks siguiendo los patrones existentes.
- Evita duplicar lógica y crear abstracciones sin reutilización real.
- No dejes imports sin usar, logs de depuración ni código comentado.

## API y autenticación

- Centraliza las solicitudes HTTP en los servicios establecidos; evita hacerlas directamente desde componentes visuales.
- Reutiliza el transporte autenticado existente y su mecanismo de renovación de sesión.
- No crees una autenticación, manejo de tokens o cliente HTTP paralelo.
- No almacenes tokens ni credenciales en `localStorage`, `sessionStorage`, código fuente o registros.
- Trata los valores `VITE_*` como información pública que puede quedar incluida en el bundle.
- No incluyas secretos en variables del frontend. Mantén `.env` fuera del repositorio y usa valores ficticios en `.env.example`.
- No debilites CORS, CSRF, autenticación ni manejo de errores para resolver problemas de comunicación.

## Seguridad y permisos

- La interfaz puede ocultar o deshabilitar acciones según los permisos recibidos, pero eso no reemplaza la autorización del backend.
- No consideres una ruta protegida en React como una medida de seguridad suficiente.
- No confíes en identificadores, permisos ni datos enviados por el cliente; el servidor valida cada operación.
- No expongas secretos, datos personales innecesarios, trazas ni detalles internos en la interfaz.
- Renderiza texto de usuario como texto. No uses `dangerouslySetInnerHTML` salvo que la solicitud lo requiera y exista sanitización adecuada.
- No conectes el frontend directamente a bases de datos ni uses datos reales para pruebas.

## Interfaz y accesibilidad

- Usa HTML semántico, etiquetas asociadas a sus campos y nombres accesibles para controles.
- Asegura el uso con teclado, foco visible, contraste suficiente y mensajes de error comprensibles.
- Mantén diseños adaptables a escritorio y pantallas reducidas siguiendo los estilos existentes.
- Controla los estados de carga, error, vacío y éxito cuando corresponda.
- No uses mocks en una funcionalidad integrada con la API, salvo que la tarea solicite expresamente una interfaz simulada.

## Calidad y validación

- Ejecuta las verificaciones disponibles que correspondan a los archivos modificados.
- Usa `npm run lint` y `npm run build` cuando estén definidos y sean pertinentes.
- Usa `npm ci` para sincronizar dependencias solo cuando corresponda al `package-lock.json`; no agregues dependencias sin necesidad y autorización.
- Prueba con datos sintéticos. No realices escrituras en bases compartidas o de producción.
- Informa únicamente las verificaciones que realmente ejecutaste y sus resultados.

## Comentarios en el código

- No agregues comentarios de ningún tipo al código fuente: comentarios de línea o bloque, documentación inline, `TODO`, `FIXME` ni código comentado.
- Expresa la intención mediante nombres claros, componentes pequeños y una estructura coherente.
- No hagas cambios masivos en archivos no relacionados para eliminar comentarios existentes.

## Git y entrega

- Inspecciona el estado con comandos de lectura, como `git status` y `git diff`, cuando sea necesario.
- No ejecutes commits, push ni operaciones Git destructivas. El usuario gestiona los commits y la publicación.
- Antes de tareas con varios archivos, presenta un plan breve y continúa sin esperar confirmación, salvo que exista un bloqueo real.
- Al terminar, resume archivos modificados, comportamiento implementado, verificaciones ejecutadas y limitaciones o pendientes reales.