# Multiplayer Cooking

Multiplayer Cooking is a mobile-first cooking companion for people making one meal together. It began as an entry for the [Сільпо AI Factory](https://ai-factory.silpo.ua/) contest.

The app today: you connect your Сільпо account, describe what you want to cook or what you have at home, and a cooking agent proposes one dish with a photo, a recipe, and an ingredient list. You refine it in a chat, answer the agent's questions in a form, and go back to earlier versions. When you want groceries, the agent matches ingredients to Сільпо products with prices, and one click puts them in your Сільпо cart. Photos of your fridge can go into the chat. "Готуємо разом" opens setup for 1–12 cooks and generates an interactive recipe. Guests join by link without a Сільпо account. Each cook follows their assigned work in a shared timeline with synchronized timers, readiness, handoffs, checklists, and visual references.

## How it works

- **Convex** holds the data, the realtime state, and every server-side integration. Secrets live only in Convex environment variables.
- **@convex-dev/agent** runs the cooking agent on **AI SDK 7** with an **OpenRouter** model. Each person has one active thread; older threads stay in the history.
- The agent can call `save_idea`, `web_search`, `read_page`, `ask_user`, `silpo_find_products`, and memory tools. SearXNG provides read-only recipe research. Saving an idea generates a dish image from its final ingredients through OpenRouter with `OPENROUTER_IMAGE_MODEL`, then stores the image in Convex. Image failure leaves the idea usable without a picture.
- **Сільпо MCP** is the official `https://mcp.silpo.ua/mcp` server. The app registers itself with dynamic client registration, logs the shopper in with OAuth 2.1 and PKCE, and keeps the tokens in Convex. The delivery address is typed into a masked form and stored on the server; the model never sees it. Cart writes happen only from the "Додати в кошик" button.
- **Frontend** is React, Vite, TanStack Router, shadcn/ui, and Hugeicons. `apps/web/DESIGN.md` owns the visual system.
- **Sessions** are anonymous device sessions from `convex-helpers`, kept in `localStorage`.

## Workspace layout

- `apps/web` contains the React and Vite app.
- `apps/backend` contains the Convex app and backend tests.
- `apps/mobile` contains the Expo React Native app. It has one mock Сільпо connect screen and no backend connection yet.
- `packages/theme` contains platform-neutral design tokens and the web CSS binding. The web and mobile apps import the TypeScript tokens from `@multiplayer-cooking/theme`.

## Run locally

Install dependencies:

```sh
bun install
```

Start Convex and Vite together. The Convex CLI creates an anonymous local deployment and writes its URL to `apps/backend/.env.local`. Vite reads that generated URL:

```sh
bun run dev
```

Use `bun run dev:backend` and `bun run dev:web` to run the apps in separate terminals.

Set the server variables on that deployment. Replace each placeholder; never paste a real key into this file:

```sh
cd apps/backend
bunx convex env set OPENROUTER_API_KEY '<openrouter-api-key>'
bunx convex env set OPENROUTER_MODEL 'openai/gpt-6-luna'
bunx convex env set OPENROUTER_IMAGE_MODEL 'openai/gpt-image-2.5-flare'
bunx convex env set SEARXNG_URL 'https://<your-searxng-host>'
bunx convex env set APP_URL 'http://localhost:5173'
bunx convex env set AXIOM_TOKEN '<axiom-ingest-token>'
bunx convex env set AXIOM_DATASET '<axiom-dataset-name>'
bunx convex env set AXIOM_EDGE '<axiom-edge-domain>'
cd ../..
```

Run the repository checks before you finish a change:

```sh
bun run check
```

The Сільпо OAuth callback is served by Convex at `<CONVEX_SITE_URL>/silpo/callback`. On the local deployment that is `http://127.0.0.1:3211/silpo/callback`; the Сільпо authorization server accepts it, so the login works locally. Each deployment registers its own OAuth client on first use.

Start the mobile app with `bun run dev:mobile`, then open it in Expo Go, an iOS Simulator, an Android Emulator, or the browser from the Expo CLI menu.

## Environment variables

| Variable                                     | Where         | Purpose                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_CONVEX_URL`                            | Browser build | Convex deployment URL for production builds. Local development prefers `CONVEX_URL` from `apps/backend/.env.local`, then the workspace value; an explicit shell variable overrides both.                                                                                   |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`     | Convex        | The agent model. Use a dedicated key with a spending limit.                                                                                                                                                                                                                |
| `OPENROUTER_IMAGE_MODEL`                     | Convex        | The image model for dish and cooking-reference images.                                                                                                                                                                                                                     |
| `SEARXNG_URL`                                | Convex        | Base URL of the SearXNG instance for `web_search`. Without it, web search reports that it is not configured.                                                                                                                                                               |
| `APP_URL`                                    | Convex        | Where the OAuth callback sends the browser back. Without it the callback shows a plain text page.                                                                                                                                                                          |
| `AXIOM_TOKEN`, `AXIOM_DATASET`, `AXIOM_EDGE` | Convex        | Optional telemetry. Records run outcome, duration, and token counts. Never prompts or responses. Each deployment has its own dataset and ingest-only token: `multiplayer-cooking-events-dev` and `multiplayer-cooking-events-prod`, with a dashboard per dataset in Axiom. |

AI requests share the host’s existing budget of 5 requests per minute and 40 per day. A cooking plan includes up to six automatic reference images. Extra images and helper requests from guests also use that host budget.

## Deploy

**SearXNG.** `infra/searxng` holds a Dockerfile and `settings.yml` that enable the JSON API. Deploy it as a Railway service and set `SEARXNG_SECRET`, `SEARXNG_LIMITER=false`, `SEARXNG_PUBLIC_INSTANCE=false`, and `SEARXNG_BASE_URL`:

```sh
railway up infra/searxng --service searxng --path-as-root --ci
```

**Production links.** The frontend uses [cooking.tyulyukov.com](https://cooking.tyulyukov.com) on Cloudflare Pages. The backend is [diligent-kingfisher-436](https://dashboard.convex.dev/d/diligent-kingfisher-436).

**Convex.** Production server variables live in the Convex dashboard under **Settings > Environment Variables**. Set `APP_URL=https://cooking.tyulyukov.com`. Keep `OPENROUTER_API_KEY` and the Axiom variables on Convex, outside the browser build.

The [GitHub Actions workflow](.github/workflows/ci.yml) runs `bun run check` on pull requests and commits to `main`. After a successful check on `main`, it deploys changed production targets in order: Convex, then Cloudflare Pages. Convex deployment requires the `CONVEX_DEPLOY_KEY` repository secret for `diligent-kingfisher-436`. Pages deployment requires a Cloudflare token with account-scoped **Cloudflare Pages: Edit** permission in the `CLOUDFLARE_API_TOKEN` secret and the account ID in the `CLOUDFLARE_ACCOUNT_ID` repository variable.

Changes under `apps/backend/convex` deploy Convex, except tests and generated files. Changes under `apps/web` or `packages/theme` deploy Pages. Backend, web, and theme package manifests follow those targets. Root `package.json` or a lockfile-only change deploys both; a mobile manifest and its lockfile change deploy neither. Mobile-only, test-only, and documentation-only changes run checks without deploying. Keep backend changes compatible with the currently deployed web app until Pages finishes.

**Cloudflare Pages.** The Git-connected Pages project uses these settings:

| Setting                | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| Production branch      | `main`                                               |
| Root directory         | Repository root (leave the field empty)              |
| Build command          | `bun install --frozen-lockfile && bun run build:web` |
| Build output directory | `apps/web/dist`                                      |
| `BUN_VERSION`          | `1.3.11`                                             |
| `VITE_CONVEX_URL`      | `https://diligent-kingfisher-436.convex.cloud`       |

Keep Git preview deployments enabled and turn off automatic production branch deployments in Pages branch control. GitHub Actions uploads the checked web build for `main`; Pages still builds previews for pull requests. Pages serves React routes through its built-in SPA fallback. The custom domain is `cooking.tyulyukov.com`.

### Change production Axiom credentials

Production writes to `multiplayer-cooking-events-prod` on `eu-central-1.aws.edge.axiom.co` with a token that can only ingest into that dataset. Repeat these steps to rotate it.

1. Create the production dataset in Axiom and a token with ingest permission for that dataset.
2. Open [production environment variables](https://dashboard.convex.dev/d/diligent-kingfisher-436/settings/environment-variables).
3. Update `AXIOM_TOKEN` and `AXIOM_DATASET` together. Set `AXIOM_EDGE` to the new dataset's edge domain if its region differs. Use the hostname without `https://`.
4. Send a message through the production app. In the new Axiom dataset, filter for `service == "multiplayer-cooking"` and check recent `ai.usage` and `ai.run` events. Convex logs must contain no `Axiom ingestion failed` errors for that request.
5. Revoke the old token only after verification and after any local deployment that still uses it has been updated.

Convex environment changes apply to subsequent function executions. You do not need to rebuild Cloudflare Pages or redeploy Convex code. Never put `AXIOM_TOKEN` in a `VITE_*` variable.

Axiom records server-side AI outcomes, durations, and token usage. Browser page views and web vitals are not currently sent to Axiom.

## Design and tests

- `apps/web/DESIGN.md` is the source of truth for palette, type, components, and copy. Read it before changing UI.
- Unit tests live next to the code as `*.test.ts` and run with `bun test`. They cover rate limit admission, telemetry payloads, web result parsing and SSRF guards, Сільпо response shaping, and quick prompt sampling.
