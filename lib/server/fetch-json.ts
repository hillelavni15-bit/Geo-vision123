import "server-only";

// Wikimedia, Nominatim and Photon throttle or reject requests without a descriptive User-Agent.
export const USER_AGENT = "WhereIsThis/1.0 (https://github.com/hillelavni15-bit/Geo-vision123)";

/** GET a JSON document with a timeout. Returns null on any failure. */
export async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Run async work over items with at most `limit` in flight, keeping order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}
