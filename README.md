# Multiplayer Cooking

Multiplayer Cooking is a mobile-first cooking companion for people making one meal together. It began as an entry for the [Сільпо AI Factory](https://ai-factory.silpo.ua/) contest.

There is no authentication yet. The current app proves the frontend, Convex, and a small AI request path. It does not persist recipes or coordinate cooks.

## Prerequisites

- [Bun](https://bun.sh/)
- An OpenRouter API key to generate responses
- A [Convex](https://www.convex.dev/) account and project for cloud deployment

## Run locally

Install dependencies:

```sh
bun install
```

Start Convex first. The CLI can create an anonymous local deployment without an account and writes its public URL to `.env.local`:

```sh
bunx convex dev
```

Set the server variables on that Convex deployment. The Convex CLI requires a value. Replace each quoted placeholder locally and do not paste a real key into this README or commit it:

```sh
bunx convex env set OPENROUTER_API_KEY '<openrouter-api-key>'
bunx convex env set OPENROUTER_MODEL '<model-id>'
bunx convex env set AXIOM_TOKEN '<axiom-ingest-token>'
bunx convex env set AXIOM_DATASET '<axiom-dataset-name>'
bunx convex env set AXIOM_EDGE '<axiom-edge-domain>'
```

`OPENROUTER_API_KEY` and `OPENROUTER_MODEL` enable generation. Use a dedicated OpenRouter key and set a hard USD spending limit for it. OpenRouter supports a per-key `limit` and daily, weekly, or monthly `limit_reset` through its [key management API](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys). The app also allows at most three global requests per minute and 100 global requests per day. These limits are coarse because the app has no authentication.

The Axiom variables are optional. Set all three to enable ingestion. Set `AXIOM_EDGE` to the dataset's edge domain, such as `eu-central-1.aws.edge.axiom.co` or `us-east-1.aws.edge.axiom.co`. When configured, the Convex action records AI request outcome, duration, character counts, token counts, and a failure name with HTTP status or retryability when available. It does not record prompts or responses. Axiom ingestion failures are written to the Convex server log and do not fail a cooking-idea request.

In a second terminal, start Vite:

```sh
bun run dev
```

Run the repository checks before you finish work:

```sh
bun run check
```

## Environment variables

`VITE_CONVEX_URL` is the only browser variable. `bunx convex dev` manages it for local development. Set the production deployment URL in Vercel. Set `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `AXIOM_TOKEN`, `AXIOM_DATASET`, and `AXIOM_EDGE` as Convex environment variables, not Vercel browser variables. `.env.example` lists their names but does not configure a Convex deployment. Do not put secrets in `VITE_*` variables or commit them to the repository.

The browser Web Vitals adapter is ready for a future authenticated or proxied ingestion endpoint. It is intentionally inactive because a privileged Axiom token must not ship in browser JavaScript. AI SDK trace export is likewise left off until a compatible Axiom/OpenTelemetry exporter is configured.

## Deployment

Log in to Convex, deploy the backend, and set the same server environment variables on the production deployment. Then deploy the Vite app to Vercel with the production `VITE_CONVEX_URL`. `vercel.json` rewrites application paths to `index.html`, so direct TanStack Router URLs work on Vercel. The production build emits the web app manifest and generated service worker into `dist/`.
