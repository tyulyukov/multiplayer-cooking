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

Steps `idea → recipe → Сільпо products → cart` work. The cooking agent (`convex/cookingAgent.ts`) runs on `@convex-dev/agent` with OpenRouter and these tools: `save_idea`, `web_search`, `read_page`, `ask_user`, `silpo_find_products`, `add_memory`, `remove_memory`. Сільпо MCP OAuth lives in `convex/silpoAuth.ts`, `convex/lib/silpo_oauth.ts`, and the callback in `convex/http.ts`; cart setup and cart writes are server-side actions in `convex/silpoCart.ts`. Saving an idea generates an image from its final dish data through OpenRouter and stores it in Convex. `CookTogether` now creates a cooking room from a saved idea with a cook count, servings, host name, and optional constraints. `convex/cookingRooms.ts`, `convex/cookingSteps.ts`, `convex/cookingTimers.ts`, and `convex/cookingAssistance.ts` provide the generated plan, guest invite, shared steps, timers, references, helper, and notes. The mobile session route is `src/routes/cook.$roomId.tsx`.

Constraints that are not visible in the code:

- Сільпо tool schemas come from `tools/list` after a phone OTP login. `convex/lib/silpo_shapes.ts` reads results defensively; verify field names against the live schema before relying on them.
- Local Convex storage URLs are unreachable from OpenRouter, so image attachments reach the model only on a cloud deployment.
- The address form is a secure input: the value goes to `silpoConnections.address` and never into the thread or the model.

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
