# Multiplayer Cooking

## Product

Multiplayer Cooking helps people cook one meal together without juggling a chat, timers, and shopping apps. The project began as a Сільпо AI Factory entry.

Future flow:

```text
idea
→ recipe
→ Сільпо products
→ cart
→ cooking plan
→ multiplayer cooking
```

## Current state

This repository contains only the initial product foundation. A basic AI response proves the request path. It is not the final recipe architecture.

## Architecture

- Convex is the backend for data, realtime state, and server-side integrations.
- React and Vite are the frontend. TanStack Router handles routes.
- Keep third-party secrets in Convex. Keep public and secret environment variables separate.
- Bun is the package manager.
- UI copy is Ukrainian. Design mobile first.
- Use shadcn/ui by default and Hugeicons Stroke Rounded for product icons.
- Read `DESIGN.md` before any UI change. It owns the palette, type, component kit, and colour budget.
- Axiom provides telemetry. Oxlint and Oxfmt own linting and formatting.
- Use semantic design tokens. The visual reference is the [Сільпо diner in Odesa](https://silpo.ua/stores/prov-semafornii-4); mocks live in `design/mocks/`.

Optional component references:

- https://www.beautifului.dev/
- https://dotmatrix.zzzzshawn.cloud/
- https://www.rareui.com/components
- https://reui.io/components

Icon motion references:

- https://www.morphicons.com/
- https://lucide-animated.com/
- https://www.itshover.com/icons

## Working style

- Keep application logic small until requirements justify more.
- Follow repository conventions before adding abstractions.
- Put backend integrations in Convex unless a concrete limitation needs another service.
- Preserve Ukrainian product copy and semantic design tokens.
- Use Bun. Run the repository verification command before finishing a change.
- Use shadcn/ui before adding another component system. Use Hugeicons for product icons.

For UI-heavy work, you may use Claude Fable 5.1 as a design specialist. The implementation agent owns the code and final technical decisions.
