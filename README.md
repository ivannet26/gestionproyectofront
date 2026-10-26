# Desarrollo local y API

Con Django en `127.0.0.1:8000`, ejecuta `npm run dev` y abre `http://localhost:5173`. Sin `VITE_API_BASE_URL`, autenticación y Axios usan `/api/` del mismo origen; Vite reenvía esas solicitudes a Django conservando ruta, método, cookies y Origin. No hace falta crear un `.env` para esta configuración.

Si Django usa otra dirección, configura `API_PROXY_TARGET` con su origen completo (por ejemplo, `http://127.0.0.1:8001`) y reinicia Vite (`npm run dev`). Esta variable solo configura el proxy de desarrollo; no se incluye en el cliente. Para el origen local predeterminado, su valor es `http://127.0.0.1:8000`.

`VITE_API_BASE_URL` sigue siendo opcional: si se define, autenticación y Axios llaman directamente a ese origen, sin el proxy. En despliegue, usa el origen HTTPS de la API o deja la variable vacía y configura el servidor web para reenviar `/api/` a Django antes del fallback de la SPA. Las variables `VITE_*` se incorporan al compilar: cambiarlas requiere reconstruir y publicar el frontend. Mantén los orígenes autorizados y las protecciones CSRF/CORS del backend.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
