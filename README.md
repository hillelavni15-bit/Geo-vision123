# Where Is This?

Upload a photo and the AI works out where in the world it was taken. It shows the evidence behind its answer, and it says "Location Unknown" instead of guessing when the photo has no clear clues.

This is a new implementation of the app, built with Next.js, PostgreSQL and the OpenAI API. It is being built in stages:

| Stage | What | Status |
|---|---|---|
| 1 | Design, navigation, Identify Photo, history, coins | Done |
| 2 | Discover Places, Compare, Image Intelligence | Done |
| 3 | Play, Daily challenge, Leaderboard, Profile | Next |
| 4 | Collections, sharing, Versus | Planned |
| 5 | Pro plan and payments, settings, legal pages | Planned |

## Run locally

Requires Node.js 20.9 or newer and PostgreSQL.

```bash
npm install
cp .env.example .env     # then fill in the values
npm run db:migrate       # create the database tables
npm run dev              # http://localhost:3000
```

In development, coins are unlimited. In production each AI search costs 20 coins, new visitors start with 100, and coins are charged only when a search succeeds.

## Settings (`.env`)

| Setting | Needed for | Where to get it |
|---|---|---|
| `DATABASE_URL` | Everything | Your PostgreSQL connection string |
| `SESSION_SECRET` | Optional | Long random string that signs guest cookies. If empty, a key is derived from `DATABASE_URL` |
| `OPENAI_API_KEY` | AI features | https://platform.openai.com/api-keys |
| `UNLIMITED_COINS` | Optional | `true` gives everyone unlimited coins, for testing a deployment |
| `OPENAI_VISION_MODEL` | Optional | Model for analysis, Discover and Compare. Default `gpt-5.4` |
| `OPENAI_PROFILE_MODEL` | Optional | Cheaper model for the visual signature. Default `gpt-4o-mini` |

Without `OPENAI_API_KEY` the site still runs, and AI features show a clear error.

Discover and the location photos also use free public services, with no key needed: OpenStreetMap Nominatim and Photon for map positions, and Wikipedia and Wikimedia Commons for photos.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Apply database migrations, then build for production |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply database migrations from `drizzle/` |
| `npm run db:generate` | Create a new migration after changing `lib/db/schema.ts` |

## Deploy

Works on Vercel or any Node host:

1. Import the repository into Vercel.
2. Add a PostgreSQL database (on Vercel: Storage → Neon), which sets `DATABASE_URL`.
3. Add `OPENAI_API_KEY` under Environment Variables.
4. Deploy. The build applies database migrations automatically.

## Layout

```
app/                  Pages and API routes (app/api/*)
components/           UI: site shell, home page modes, map, primitives in components/ui
lib/db/               Drizzle schema and database client
lib/server/           Server-only logic: guest cookie, coins, OpenAI, photo analysis
lib/client/           Browser-only helpers: image preparation
lib/types.ts          Types shared by client and server
```
