@AGENTS.md

# Where Is This? — project notes

A rebuild of the "Where Is This?" app from the Replit project (repo `hillelavni15-bit/Geo-Vision`, which is the reference for look and behaviour). See `README.md` for setup and the stage plan.

- Visitors are anonymous guests identified by a signed HttpOnly cookie (`lib/server/guest.ts`). Never trust a user id sent by the client.
- Coins are server-authoritative: a paid AI action checks `canAfford` first and calls `charge` only after it succeeds (`lib/server/users.ts`). Development is unlimited.
- The AI must say "unknown" rather than guess. `normalizeAnalysis` turns any unusable model reply into an explicit unknown result.
- Images are converted to JPEG in the browser (`lib/client/image.ts`) before upload; the API accepts only JPEG.
- Keep the visual design in `app/globals.css` (dark navy + cyan, glass surfaces). The app is dark-only.
- Run `npm run typecheck` and `npm run build`, and check changes in the running app.
