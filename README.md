# Where Is This?

Upload a photo and the AI works out where in the world it was taken. It shows the evidence behind its answer, and it says "Location Unknown" instead of guessing when the photo has no clear clues.

This is a new implementation of the app, built with Next.js, PostgreSQL and the OpenAI API. It is being built in stages:

| Stage | What | Status |
|---|---|---|
| 1 | Design, navigation, Identify Photo, history, coins | Done |
| 2 | Discover Places, Compare | Next |
| 3 | Play, Daily challenge, Leaderboard, Profile | Planned |
| 4 | Collections, sharing, Versus | Planned |
| 5 | Pro plan and payments, settings, legal pages | Planned |

## Run locally

Requires Node.js 20.9 or newer and PostgreSQL.

```bash
npm install
cp .env.example .env     # then fill in the values
npm run db:push          # create the database tables
npm run dev              # http://localhost:3000
```

In development, coins are unlimited. In production each AI search costs 20 coins, new visitors start with 100, and coins are charged only when a search succeeds.

## Settings (`.env`)

| Setting | Needed for | Where to get it |
|---|---|---|
| `DATABASE_URL` | Everything | Your PostgreSQL connection string |
| `SESSION_SECRET` | Production | Any long random string (`openssl rand -hex 32`) |
| `OPENAI_API_KEY` | AI features | https://platform.openai.com/api-keys |
| `OPENAI_VISION_MODEL` | Optional | Model for photo analysis. Default `gpt-5.4` |

Without `OPENAI_API_KEY` the site still runs, and AI features show a clear error.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Apply the database schema in `lib/db/schema.ts` |

## Deploy

Works on Vercel or any Node host. Set `DATABASE_URL`, `SESSION_SECRET` and `OPENAI_API_KEY`, and run `npm run db:push` against the production database once.

## Layout

```
app/                  Pages and API routes (app/api/*)
components/           UI: site shell, home page modes, map, primitives in components/ui
lib/db/               Drizzle schema and database client
lib/server/           Server-only logic: guest cookie, coins, OpenAI, photo analysis
lib/client/           Browser-only helpers: image preparation
lib/types.ts          Types shared by client and server
```
