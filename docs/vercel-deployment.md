# Deploy The Final Exam on Vercel

## Why the previous deployment failed

The package uses Next.js APIs, but its former build command ran **Vinext**, which emitted Cloudflare/Vite files under `dist/`. Vercel selected its **Next.js** adapter and looked for `.next/routes-manifest.json`. The Vinext route-classification notice was informational; the output/runtime mismatch caused the deployment failure.

Changing the output directory alone would not fix the game API: it also imported `cloudflare:workers` and a D1 binding that Vercel does not supply. This branch runs native Next.js and moves SQL behind a server-only storage adapter. The room schema, authentication, private snapshots, seeded bots, and atomic version checks are preserved.

Official references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json), and [Turso TypeScript SDK](https://docs.turso.tech/sdk/ts/reference).

## 1. Deploy the complete game from main

Vercel Production tracks GitHub **`main`**, which contains the complete game and the Next.js compatibility fix. Preview branches remain available for testing future changes.

## 2. Create durable multiplayer storage

Connect a **Turso libSQL** database using [Turso's Vercel integration](https://docs.turso.tech/integrations/vercel), or create a database in your own Turso account. Use a libSQL-compatible endpoint for the `@libsql/client` adapter. The local `.wrangler` database cannot serve as Vercel's shared database.

With the [official Turso CLI](https://docs.turso.tech/cli/db/create), signed into your account:

```sh
turso db create final-exam
turso db show final-exam
turso db tokens create final-exam
```

The last command prints a secret. Copy it directly to Vercel's environment settings; do not commit it or share it in chat. The first hosted game request creates the `rooms` table if needed, without resetting existing rooms. Use different databases for Production and Preview when you want to isolate real matches from preview testing. No current local sessions are automatically uploaded.

## 3. Set Vercel configuration

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (leave blank or `.`) |
| Framework Preset | Next.js |
| Node.js Version | 24.x |
| Install Command | `npm run install:ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` (or Next.js default; remove any old `dist` override) |
| Production branch | `main` |

`vercel.json` commits the framework/build/install/output settings. If the dashboard still has old custom values, clear them or match the table.

Add these environment variables in the environments you intend to deploy, then redeploy:

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Database endpoint, for example `libsql://your-database.turso.io` |
| `TURSO_AUTH_TOKEN` | Database authentication token |

Both are server-only. Do not use `NEXT_PUBLIC_` prefixes. Do not set `GAME_SQLITE_PATH` on Vercel. The API deliberately refuses local storage whenever `VERCEL` is set. A successful frontend build without these variables does **not** mean multiplayer storage is ready.

## 4. Check before deploying

```sh
nvm use 24
npm run install:ci
npm test
npm run typecheck
npm run build
node scripts/check-vercel-build.mjs

# Run the production server against a disposable local SQLite file:
GAME_SQLITE_PATH=/tmp/final-exam-preview.sqlite npm start
```

In a second terminal:

```sh
node tests/integration.mjs
node tests/profiles-http.mjs
node tests/race-http.mjs
node tests/fresh-http.mjs
node tests/series-http.mjs
node tests/lab-http.mjs
```

The production checks exercise the same Next.js API used by Vercel. They cover eight humans, two humans/six bots, concurrent scoring, profile permissions, private snapshots, and replay protection. Remote credentials and a real hosted deployment are still needed for an end-to-end cloud check.

## 5. Check the deployed game

Open the HTTPS deployment URL on two independent browsers/devices. Complete the opening cinematic, create/join a room, ready both humans, watch the automatic ten-second countdown, and search the laboratory objects. Verify bot seats, independent progress, avatar synchronization, and a refresh reconnect. Optionally run the HTTP suites against a **disposable Preview database**:

```sh
GAME_TEST_URL=https://your-preview.vercel.app node tests/integration.mjs
GAME_TEST_URL=https://your-preview.vercel.app node tests/profiles-http.mjs
GAME_TEST_URL=https://your-preview.vercel.app node tests/race-http.mjs
GAME_TEST_URL=https://your-preview.vercel.app node tests/fresh-http.mjs
GAME_TEST_URL=https://your-preview.vercel.app node tests/series-http.mjs
node tests/lab-http.mjs
```

These tests create rooms. Do not point them at Production unless you intend to create test matches there. Vercel deployment protection may prevent direct HTTP test access; a login-protected preview is not a broken API.

## Debugging

- **Missing routes manifest:** confirm the deployed branch and build command. A correct build logs `Next.js`, creates `.next/routes-manifest.json`, and lists `/api/game` as dynamic. Do not create an empty manifest or rename `dist` to `.next`.
- **Homepage loads, Create room returns 503:** inspect Vercel function logs for missing Turso variables, an invalid/expired token, or a failed first-request table initialization. Correct the configuration and redeploy.
- **Native SQLite warning locally:** Node 24 labels `node:sqlite` experimental. Hosted games use the remote web client and never open a local SQLite file.
- **Port 5173 in use:** stop the other preview with Ctrl+C or pass `--port 5174`. Set `GAME_TEST_URL=http://localhost:5174` for tests against that port.

## Interview explanation

The failure was a deployment-contract mismatch: one compiler emitted Cloudflare artifacts while Vercel expected Next.js artifacts. The fix aligns the compiler, server runtime, and durable storage. A shared SQL adapter preserves optimistic concurrency: only the request whose expected version matches can update a room; other requests reload and retry.
