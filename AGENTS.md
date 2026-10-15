# AGENTS.md — Reglas y Arquitectura

## 1. Arquitectura y Separación de Capas

### Estructura y Flujo de Datos

- **Flujo estricto:** `Componente (UI) → Hook (Estado) → Service (API) → httpClient → Interface (Contrato)`.
- **`src/core/`**: Infraestructura global compartida (`api/httpClient.ts`, `interfaces/`, `services/`).
- **`src/features/<m>/`**: Módulos verticales de negocio (`pages/`, subcomponentes, `use<Feature>.ts`, `types.ts`).
- **`src/shared/`**: UI atómica transversal y utilidades comunes (`icons/`, badges, modales base).

### Responsabilidades por Capa

- **Interfaces (`src/core/interfaces/` o `features/<m>/types.ts`):** Definen modelos de entidad y payloads de mutación (`XWriteData`, `XFilters`). Importar siempre con `import type`.
- **`httpClient` (`src/core/api/httpClient.ts`):** Instancia única y centralizada de Axios configurada con `baseURL` e interceptores de autenticación (`Bearer token`).
- **Services (`src/core/services/` o `features/<m>/services.ts`):** Funciones `async` puras. Consumen `httpClient`, tipan la respuesta (`httpClient.get<T>`) y retornan directo `data`. Prohibido almacenar estado aquí.
- **Hooks (`features/<m>/use<Feature>.ts`):** Orquestan llamadas a servicios y ciclo de vida (`data`, `loading`, `error`, `refetch`). Centralizan mutaciones y filtros.
- **Componentes:** Solo presentación y eventos. Consumen hooks y aplican el Sistema de Diseño.

### Reglas de Integración y API

- **Aislamiento de red:** La UI nunca consume `httpClient` ni ejecuta peticiones HTTP directas dentro de un `useEffect`.
- **Tipado explícito:** Toda petición debe declarar su genérico de retorno en el cliente (`httpClient.get<T>`, `httpClient.post<T>`).
- **Separación de contratos:** Entidades compartidas entre múltiples features van en `core/interfaces/`; tipos exclusivos de un feature van en su propio `types.ts`.

---

## 2. Sistema de Diseño (UI / Tailwind)

### Arquetipo y Principios

- **Estilo:** SaaS moderno (tipo ClickUp). Alta densidad, utilitario, plano y neutro. Restar antes de añadir.
- **Sin transiciones:** Prohibido usar `transition-*`. Estados `:hover` y `:focus` son inmediatos.
- **Ahorro de tokens (DRY):** Heredar estilos desde contenedores (`<thead>`, `<table>`, etc.) en vez de repetirlos en cada hijo.

### Tokens Fundamentales

- **Fondos:** `bg-white` (base, tarjetas, inputs). Hover de filas: `hover:bg-neutral-50`.
- **Textos:** Primario `text-neutral-800` | Acciones `text-neutral-700` | Muted / Celdas `text-neutral-600`.
- **Bordes:** `border border-neutral-200` (estructural).
- **Radios:** `rounded-lg` (controles, tags, inputs), `rounded-xl` (paneles, tarjetas, modales), `rounded-full` (botón cerrar).
- **Tipografía:** Inter únicamente 400, 500 y 600. **Prohibido `bold`**.
  - Escala: `text-[10px]` (tags), `text-xs` (UI base, tablas, inputs), `text-sm` (subtítulos, nav), `text-lg` (títulos).
- **Sombras:** No utilizar sombras en ninguno de los casos.
- **Iconos:** `size-4` en toda la app (`size-5` únicamente en navegación del sidebar).

### Convenciones de Construcción

- **Densidad por padding (Prohibido `h-*` o `min-h-*` en controles interactivos):**
  - Controles e inputs: `px-3 py-1.5 text-xs font-medium rounded-lg`
  - Filas y tablas: `px-3 py-2 text-xs`
  - Micro tags: `px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-50`
  - Sidebar Nav (+1 escala): `px-3 py-2.5 text-sm font-medium rounded-lg gap-3`
- **Acciones (`cursor-pointer` obligatorio):**
  - Primaria: `bg-neutral-800 text-white hover:bg-neutral-700`
  - Secundaria: `bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50`
  - Iconos de acción: `p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800`
- **Inputs:** `bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none`.
- **Tablas:** `<thead>` sin fondo con `border-b border-neutral-200 font-medium text-neutral-700`; filas con `border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50`.
