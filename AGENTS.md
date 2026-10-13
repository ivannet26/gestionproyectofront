# Design System - Minimalist SAAS

ClickUp-inspired. Sophistication by subtraction: whitespace, neutral tokens, instant feedback.

## Tokens

- **Bg**: `bg-white` default
- **Text**: `neutral-900` primary, `neutral-600` secondary
- **Border**: `1px neutral-200` only where separation is needed
- **Radius**: `rounded-md` default, `rounded-xl` only for large panels/modals
- **Font**: `Inter Tight` 400/500/600 only
- **Shadow**: no always

## Components

- **Button primary**: `bg-neutral-900 text-white rounded-md cursor-pointer` + `hover:bg-neutral-800`
- **Button secondary**: `bg-white border neutral-200 rounded-md cursor-pointer` + `hover:bg-neutral-50`
- **Input**: `bg-white border neutral-200 rounded-md` + `focus:ring-0 focus:border-neutral-400 focus-visible:outline-none`
- **Card**: `bg-white border neutral-200 rounded-xl shadow-none`
- **Link/action**: `text-neutral-600 font-semibold` + `hover:text-neutral-900`

## Interaction

- **Allowed**: `hover:` with instant color/bg change
- **Forbidden por ahora**: `transition-*`, `duration-*`, `ease-*`, `animate-*`, `active:scale-*`
- **Forbidden siempre**: JS hover for styling (`onMouseEnter`, `onMouseLeave`) — use CSS `hover:` instead. No `group-hover:` animations.

## Agent Rules

- Tailwind utilities only. No custom CSS, no `<style>`, no inline `style` with custom values.
- Prohibido: `rounded-none` (default is `md`), `rounded-sm`, `rounded-lg`, `rounded-2xl`, `rounded-full` (except avatar/dot), `shadow-*`, gradients, `hover:` with opacity/scale animation.
- Do not add decorative borders, colors, or animations. Subtract before adding.
