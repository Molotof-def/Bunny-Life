# BUNNY LIFE — v0.2.0 RELEASE

BUNNY LIFE is a Telegram Mini App virtual-pet game. This release adds a persistent weekly world event, daily collectibles, player rankings and an in-game notification inbox on top of the existing pet-care and friend systems.

## Stack
- React + TypeScript + Vite
- Three.js / React Three Fiber
- Node.js + Express API
- PostgreSQL
- Telegram Mini Apps `initData` verification and signed sessions

## Run locally
Requirements: Node.js 20+ and npm.

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

Open `http://localhost:5173`. Demo mode is only for local UI testing; social features require Telegram authentication and PostgreSQL.

## Database
Set `DATABASE_URL` in `server/.env`, then initialize the schema:

```bash
npm run db:init --workspace server
```

The schema is idempotent and includes the `carrot_gifts` ledger, collectible event tables and notification inbox.

## v0.2.0 highlights
- New explorable districts: garden, forest, lake and rabbit square, alongside the playroom and cafe.
- Weekly **Living World** event with server-recorded seasonal points.
- Three daily collectibles; each can be claimed once per day per account for carrots and XP.
- Global XP leaderboard uses generated rabbit aliases rather than exposing Telegram display names.
- Persistent notifications for friend requests, accepted requests, carrot gifts and collectible finds.
- Existing friend codes, read-only friend room visits and capped carrot gifts remain available.
- New `/api/world`, `/api/world/collect` and `/api/notifications/read` endpoints.

## Telegram / production configuration
Set these in the hosting provider's secret environment settings:
- `BOT_TOKEN`
- `JWT_SECRET` (at least 32 random characters)
- `DATABASE_URL`
- `CLIENT_ORIGIN`
- `ALLOW_DEMO=false`

Never commit `.env` files or send bot tokens in chat. Production startup refuses missing secrets and demo mode.

## Render
The included `render.yaml` and `Dockerfile` configure a single-service deployment. Push the project to your own Git repository, create a Render Blueprint, configure the secrets above, then test `/health/ready` and launch from Telegram. No deployment is performed by creating this archive.

## Verification
Run:

```bash
npm run verify
```

A real Telegram launch, live PostgreSQL migration, and deployed-service smoke test still need to be performed in the target environment.

## Known limitations
- The rabbit is still a procedural Three.js mesh character, not a detailed imported Blender GLB/rig.
- Friend visits are read-only; there is no live co-op session or chat.
- Carrot gifts are the only transferable gift type; furniture and accessories are not transferable.
- There is no searchable public player directory; players connect using friend codes.


## v0.2.0 — Living World

- Weekly event **«Неделя уютных открытий»** with a server-side points ledger.
- Three daily collectibles; each can be claimed once per day per account. Rewards and XP are granted transactionally by PostgreSQL.
- Global player leaderboard ordered by XP and level.
- Persistent inbox notifications for friend requests, accepted requests, carrot gifts and event finds.
- New `/api/world`, `/api/world/collect` and `/api/notifications/read` endpoints.

The current rabbit remains a procedural Three.js model. Imported, rigged GLB rabbit species and true real-time co-op sessions are not included in this release; they need dedicated 3D assets and a synchronized multiplayer session service rather than a UI-only imitation.
