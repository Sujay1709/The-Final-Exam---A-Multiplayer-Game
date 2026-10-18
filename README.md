# The Final Exam — A Multiplayer Treasure Hunt

**The Professor’s Last Exam** is a timed treasure-hunt escape game for **2–8 humans, or one human racing against bots**. Join by six-letter code, search five illustrated rooms, and solve progressively harder **“What am I?”** riddles. New games contain no math questions, numeric locks, aptitude questions, or school-grade settings.

> An old grudge. Five locked rooms. Follow the hidden trail.

[Professor backstory preview](docs/treasure-home-preview.jpg) · [Floating treasure score preview](docs/treasure-score-preview.jpg)

## The professor’s story

Thirty years ago, Elias Voss built the research that won his college team a prize. A printing error left his name off the certificate. He walked away before his friends could explain, kept their letters unopened, and spent years treating a mistake as a betrayal.

Tonight he invites his old team to a reunion in a laboratory full of hidden objects, riddles, and detention doors. Their unopened letter waits in his private study. Escape means discovering both the way out and the truth he refused to read.

The homepage’s right-hand personnel file tells this backstory beneath the preserved interactive manga portrait / optional Three.js sculpt. The original HD opening story remains in order: **The Missing Credit → The Grudge → The Experiment**. Use **Start story**, **Next chapter**, then **Enter the game**. No chapter advances on a timer. Sound, pause, and reduced-motion controls remain available.

## How to play

1. Choose a cosmetic avatar and anonymous alias, then create or join a room.
2. Choose Race or Co-op, Cryptic or Expert wording, time pressure, and optional Race bot skill. Invite friends before readying up: humans replace bot seats.
3. Every human presses **I’m ready**. A server-controlled ten-second loading countdown seals the laboratory. Race with bots needs one human; other configurations need two.
4. Search the first available object. Use **Highlight objects** or the labelled keyboard/touch controls for free. Solve its “What am I?” riddle by typing the object or idea and pressing **Unlock**.
5. A correct answer opens the next object, a tougher riddle, and a larger reward. Later locks cannot be claimed, hinted, or answered before their predecessor is solved.
6. Solve three clues to clear a room. Race advances after a three-second summary; Co-op waits for the host. Clear all five rooms to escape.

**Race:** identical riddles, independent progress, timer, hints, score, and detention. First escape wins; others can continue. Opponent solutions remain private. Public standings show escape progress rather than a points table. Your explanations stay in **Your recovered clues**.

**Co-op:** human teammates share clues, time, score, and punishment. Anyone can solve the next available clue. Bots are Race opponents only.

Aliases are unique within the room and limited to twenty characters. Avatar customization is cosmetic. Browser preferences persist; profiles can change in the lobby, sound and motion throughout play. Rooms expire after twenty-four hours.

## The trail and its difficulty

- **Abandoned Laboratory:** the first trail, clues 1–3.
- **Alchemist’s Workshop:** lost instruments, clues 4–6.
- **Storm Engine:** the captive storm, clues 7–9.
- **Hall of Reflections:** appearances and fragments, clues 10–12.
- **The Final Exam / Voss’s study:** buried truths, clues 13–15.

Each room retains its own HD local artwork, positioned props, accessible controls, and atmosphere. Warning Archive, Isolation Chamber, and Probation Vault are separate recovery environments.

**Cryptic** provides more contextual clues. **Expert** uses more indirect language for the same answers, ranks, and point values. Difficulty is authored, not empirically calibrated; playtesting may reveal ambiguous clues. Hints deliberately disambiguate the intended answer. The rare manuscript term near the end has a direct hint so it cannot permanently block younger players.

## Answers, score, and penalties

Answers are checked on the server against the intended word and curated alternatives. Capitalization, leading “a/an/the,” repeated spaces, and trailing punctuation are normalized. “Key” and “the brass key” both work. We do not use fuzzy substring matching: “keyboard” cannot pass as “key.” Empty, numeric, oversized, or malformed text is rejected without a penalty; a valid but incorrect guess costs time.

- Main clue rewards rise **100, 125, 150, …, 450 points**: **4,125 base points** for all fifteen clues.
- Every correct answer adds **20 seconds**. Clearing a main room adds one point per whole second remaining.
- A confirmed score change launches a **3D-style treasure card** showing the gain and current total. It floats upward and vanishes after five seconds. **Treasure score** reveals the total again. The animation uses CSS perspective, not WebGL; reduced motion uses a quiet timed display. A screen-reader status retains the total.
- A main timeout costs **100 points**, clamped to zero, and adds detention. Recovery has one, two, then three ordered riddles; each is worth **50 × detention level** points. Solved main clues stay solved.
- Easy / Medium / Hard main clocks: **300 / 240 / 180 seconds**. Wrong guesses: **−5 / −10 / −15 seconds**. Each purchased hint: **−10 / −15 / −20 seconds**.
- Easy detention clocks: **90 / 120 / 150 seconds**; Medium: **60 / 90 / 120**; Hard: **45 / 60 / 90**. Clearing detention resumes the main room with **150 / 120 / 90 seconds**, respectively.
- Fail detention or miss a fourth main deadline and the attempt ends.

The single visible score card replaces the old fixed sidebar total. End-of-round results keep your final total and public finishing order. Replayed submissions cannot award extra points, and browser polling cannot accelerate opponents.

## Bots, rematches, and saved games

Race fills to eight seats by default: one human plus seven bots, two plus six, or eight humans with none. Bots are always marked **BOT**, never become host, and solve the same ordered riddles through the same answer checker. Easy attempts take 25–45 seconds at 55% simulated accuracy; Medium 14–25 at 75%; Hard 8–16 at 90%. Server timestamps and seeded randomness make delayed reconnects equivalent to frequent polling.

Best-of-three rivalries remain optional. First to two round wins takes the series; three rounds without a sole leader end in a draw. Remaining connected humans must agree to rematch and ready up again. Settings stay fixed within a rivalry.

**New-room defaults:** Race, Cryptic wording, Medium clock, Medium bots, bot filling enabled. Retired math/aptitude flags cannot restore math in a newly created room. Their code and fixture tests remain only for compatibility with previously saved numeric matches; existing active JSON banks are not destructively rewritten. Create a new room for the treasure-hunt rules.

## Run locally

Project location: `/Users/sujaygopal/Desktop/MyProjects/The-Final-Exam---A-Multiplayer-Game`.

Requires **Node.js 24.x** and npm. The deployment target is now native Next.js, React, TypeScript, and Three.js. Local games use SQLite; Vercel games use a remote Turso/libSQL database. Settings and private race progress retain the existing JSON schema.

```sh
cd "/Users/sujaygopal/Desktop/MyProjects/The-Final-Exam---A-Multiplayer-Game"
nvm use 24
git switch codex/touch-release
npm run install:ci
npm run dev
```

No local database migration command is needed. The server automatically reuses the preserved `.wrangler/state/v3/d1/miniflare-D1DatabaseObject` SQLite file, or creates `.data/rooms.sqlite` in a clean clone. If several legacy files exist, choose one with `GAME_SQLITE_PATH`. The local adapter uses `CREATE TABLE IF NOT EXISTS`; it does not reset existing rooms.

The dev server listens on `0.0.0.0:5173`. Local access: `http://localhost:5173`. Phones on the same network use `http://YOUR_COMPUTER_LAN_IP:5173`. Keep the computer awake and the server running. LAN IPs can change. A phone’s localhost points at the phone itself.

Browser storage holds the device’s profile/preferences and current session credential. Do not share the credential. Rooms expire after 24 hours. New humans join only in the lobby; existing sessions reconnect on their original browser. Two tabs in one browser normally share identity—use another device, browser, or private window for another human.

## Deploy on Vercel

See [the deployment guide](docs/vercel-deployment.md) for database setup and project settings. Vercel Production follows GitHub `main`; this feature branch is a local preview until reviewed and merged.

The prior `npm run build` invoked Vinext and wrote Cloudflare output under `dist/`; Vercel's Next.js preset expected `.next/routes-manifest.json`. The build now runs `next build`, and `vercel.json` pins the framework, install command, build command, and `.next` output. Do not restore the Vinext build command or choose `dist` as Vercel's output directory.

Set **both** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as server-only Vercel environment variables, then redeploy. The first multiplayer request creates the `rooms` table if needed. Builds do not need database credentials; multiplayer requests do. Hosted requests fail with 503 when the database is unconfigured rather than writing separate ephemeral files on different server instances.

The former Vinext/Sites tooling remains in the repository for historical reference; the standard npm commands and game API now target Next.js/Node on Vercel. Returning to Sites requires its original runtime adapter. The previous `codex/race-bots` branch remains available as the Cloudflare version.

## Verify

```sh
npm test
npm run typecheck
npm run build
node scripts/check-vercel-build.mjs
# With the local preview running:
node tests/integration.mjs
node tests/profiles-http.mjs
node tests/race-http.mjs
node tests/fresh-http.mjs
node tests/series-http.mjs
node tests/lab-http.mjs
node tests/treasure-http.mjs
```

Controlled-clock tests cover original Co-op rules, pressure settings, isolated detention, automatic progression, deadline catch-up, first escape/final ordering, host migration, bot scheduling independent of polling, reconnects, legacy state, and all 3200 avatar combinations. HTTP tests cover eight humans, two humans plus six bots, replacement/capacity, concurrent submissions, idempotency, settings/profile permissions, alias validation, and private snapshots. Storage tests also cover preserved local data, remote credential validation, the real SDK against a local Hrana HTTP fixture, collision handling, expiry, and versioned concurrent writes. GitHub CI checks the native Next.js manifests and runs HTTP tests against the production server with a disposable local database.

For manual UI checks: try 375/390px phone widths and desktop; customize then reload; change profile in the lobby; toggle sound/motion during play; use pointer/touch and keyboard movement/reset controls; switch between portrait/sculpt; test a device without WebGL. Complete the cinematic and verify reload replays it. Real physical phone touch and classroom playtesting remain useful beyond browser viewport checks.

## Architecture and learning

- `lib/game.ts`: shared rule functions operate on either one cooperative progress record or a private record per racer; bots use the same validator.
- `lib/game-settings.ts`: pressure/skill tables and validated room settings.
- `lib/game-types.ts`: public contracts; `lib/treasure-hunt.ts`: server-only riddle bank, aliases, ranks, and rewards.
- `app/api/game/route.ts`: session authentication, room creation/joining, viewer-specific snapshots, and versioned SQL updates.
- `db/index.ts`, `db/config.ts`, `db/sql-store.ts`, `db/local.ts`, `db/remote.ts`: server-only storage selection and the shared parameterized SQL/CAS contract.
- `lib/use-game.ts`: polling every 1.2 seconds, reconnects, and server-clock synchronization.
- `lib/profiles.ts`, `components/avatar.tsx`, `components/profile-editor.tsx`: validated cosmetic catalog and original SVG art.
- `lib/use-preferences.ts`: browser preference persistence; `components/room-settings.tsx`: lobby controls.
- `components/game.tsx`: personal puzzle board, room channel, standings, and own-question review.
- `components/prologue.tsx`, `components/professor.tsx`, `components/professor-scene.tsx`: cinematic, preserved manga motion, and optional original 3D figure.

**Server authority:** deadlines and textual answer validation live on the server. Browser timer edits cannot change rules. Race snapshots include only the authenticated player’s puzzles/explanations and opponents’ public progress; session tokens, RNG state, scheduled attempts, and private progress are excluded.

**Optimistic concurrency:** a room update succeeds only if the stored version still matches the version read. Concurrent requests reload/retry on conflict. This prevents lost updates and duplicate awards. Seeded bot state is persisted through the same update, so retries do not create additional actions.

**Live synchronization:** this is polling, not WebSockets. Changes generally appear within one polling interval plus network latency. Timers use server timestamps and catch up on requests, including when everyone was disconnected.

## Debugging and limitations

- Database unavailable: inspect the server log; on Vercel check both Turso variables and the database connection. The first request creates the `rooms` table. For local play leave the remote variables unset. See the deployment guide.
- Cannot start: every human must be connected and ready. Race with bots permits one human; Co-op and Race without bots require two. The countdown begins automatically. An upgraded lobby asks humans to ready up again.
- Phone cannot connect: use the computer’s LAN IP, same network, awake host, and allow port 5173 through the firewall/router.
- Stale-phase error: review the new room before resubmitting; the prior answer was not accepted into a different room.
- Silent audio: press Start story or a sound button; browsers require a gesture. Check the mute preference.
- No 3D: use the preserved portrait; WebGL may be unavailable. Clear hot-reload hook errors by refreshing.

The fixed treasure trail contains fifteen main riddles with two wording levels and six recovery riddles. Replays repeat answers. Bots simulate skill; they do not learn. Tests validate rules and concurrency, not large-scale load. There are no app accounts, global leaderboard, or ML inference. Public deployment still benefits from abuse protection and classroom testing. The remote database adapter is tested locally through its SQL contract; hosted room creation should be verified after connecting Turso.


## Portfolio explanation

**Resume bullet:** Built a multiplayer narrative treasure hunt with server-validated riddle aliases, ordered clue progression, escalating rewards, deterministic bot opponents, replay-safe scoring, and an accessible animated score display.

**Interview explanation:** The server owns progression and scoring. Clients receive public clue descriptions and their own unlocked explanations; answer aliases and opponent solutions remain private. Database compare-and-swap updates and action receipts prevent concurrent or replayed requests from duplicating rewards.

**Recruiter explanation:** Friends join from their phones and uncover a professor’s story by solving hidden riddles under time pressure.

Release branch: `codex/touch-release`, based on `codex/treasure-hunt` and `codex/room-worlds-aptitude`. Version 2.0.0 adds native radio selection cards, full-card touch toggles, an explicit ready state, and `/api/version` deployment identification. [Three future proposals](docs/next-additions.md) remain suggestions rather than implemented or measured retention improvements.
