@AGENTS.md

# Where Is This? — project notes

A rebuild of the "Where Is This?" app from the Replit project (repo `hillelavni15-bit/Geo-Vision`, which is the reference for look and behaviour). See `README.md` for setup and the stage plan.

- Visitors are anonymous guests identified by a signed HttpOnly cookie (`lib/server/guest.ts`). Never trust a user id sent by the client.
- Coins are server-authoritative: a paid AI action checks `canAfford` first and calls `charge` only after it succeeds (`lib/server/users.ts`). Development is unlimited.
- The AI must say "unknown" rather than guess. `normalizeAnalysis` turns any unusable model reply into an explicit unknown result.
- Images are converted to JPEG in the browser (`lib/client/image.ts`) before upload; the API accepts only JPEG.
- Discover: the model proposes place names, but pins come from geocoders (Nominatim once for the area, Photon per place, biased to the area). Places neither source puts near the area are dropped. Every request to Nominatim, Photon, Wikipedia or Commons must send `USER_AGENT` (`lib/server/fetch-json.ts`), or they throttle.
- Discover photos are only sent to Pro members; others get `photoLocked`.
- After an identified analysis, `after()` stores a visual profile in `image_features`; `/api/visual/[id]` compares it with the same user's other photos.
- Keep the visual design in `app/globals.css` (dark navy + cyan, glass surfaces). The app is dark-only.
- Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. `npm run build` applies migrations.
- Run `npm run typecheck` and `npm run build`, and check changes in the running app.
