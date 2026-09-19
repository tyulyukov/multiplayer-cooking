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

Steps `idea → recipe → Сільпо products → cart` work. The cooking agent (`apps/backend/convex/cookingAgent.ts`) runs on `@convex-dev/agent` with OpenRouter and these tools: `save_idea`, `web_search`, `read_page`, `ask_user`, `silpo_find_products`, `add_memory`, `remove_memory`. Сільпо MCP OAuth lives in `apps/backend/convex/silpoAuth.ts`, `apps/backend/convex/lib/silpo_oauth.ts`, and the callback in `apps/backend/convex/http.ts`; cart setup and cart writes are server-side actions in `apps/backend/convex/silpoCart.ts`. Saving an idea generates an image from its final dish data through OpenRouter and stores it in Convex. `CookTogether` now creates a cooking room from a saved idea with a cook count, servings, host name, and optional constraints. `apps/backend/convex/cookingRooms.ts`, `apps/backend/convex/cookingSteps.ts`, `apps/backend/convex/cookingTimers.ts`, and `apps/backend/convex/cookingAssistance.ts` provide the generated plan, guest invite, shared steps, timers, references, helper, and notes. The mobile web session route is `apps/web/src/routes/cook.$roomId.tsx`.

Constraints that are not visible in the code:

- Сільпо tool schemas come from `tools/list` after a phone OTP login. `apps/backend/convex/lib/silpo_shapes.ts` reads results defensively; verify field names against the live schema before relying on them.
- Local Convex storage URLs are unreachable from OpenRouter, so image attachments reach the model only on a cloud deployment.
- The address form is a secure input: the value goes to `silpoConnections.address` and never into the thread or the model.

## Architecture

- This repository is a Bun workspace. `apps/web` contains the React app, `apps/backend` contains Convex, and `packages/theme` contains cross-platform design tokens. Add the future React Native client at `apps/mobile`.
- Convex is the backend for data, realtime state, and server-side integrations.
- React and Vite are the frontend. TanStack Router handles routes.
- Import browser-safe Convex contracts through the explicit `@multiplayer-cooking/backend` exports. Do not expose the whole backend library tree.
- Keep third-party secrets in Convex. Keep public and secret environment variables separate.
- Bun is the package manager.
- UI copy is Ukrainian. Design mobile first.
- Use shadcn/ui by default and Hugeicons Stroke Rounded for product icons.
- Read `apps/web/DESIGN.md` before any UI change. It owns the palette, type, component kit, and colour budget.
- Keep reusable colors, radii, typography, and motion values in `packages/theme/src/index.ts`. Keep web CSS variables in `packages/theme/src/web.css`, and keep both representations in sync.
- Axiom provides telemetry. Oxlint and Oxfmt own linting and formatting.
- Use semantic design tokens. The visual reference is the [Сільпо diner in Odesa](https://silpo.ua/stores/prov-semafornii-4); mocks live in `apps/web/design/mocks/`.

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
- Run workspace commands from the repository root. Use Bun and run `bun run check` before finishing a change.
- Use shadcn/ui before adding another component system. Use Hugeicons for product icons.

For UI-heavy work, you may use Claude Fable 5.1 as a design specialist. The implementation agent owns the code and final technical decisions.
