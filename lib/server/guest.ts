import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "wit_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  // Without SESSION_SECRET, derive a key from the database URL, which is already a
  // private credential. Changing either one signs everyone out as new guests.
  if (process.env.DATABASE_URL) {
    return createHash("sha256").update(`wit-session:${process.env.DATABASE_URL}`).digest("base64url");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set SESSION_SECRET or DATABASE_URL.");
  }
  return "dev-only-insecure-session-secret";
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

function verify(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  if (!/^guest_[0-9a-f-]{36}$/.test(id)) return null;
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

/**
 * The visitor's guest id from a signed HttpOnly cookie, issuing a new one when
 * missing or tampered with. Only call from Route Handlers or Server Functions.
 */
export async function getGuestId(): Promise<string> {
  const store = await cookies();
  const existing = verify(store.get(COOKIE)?.value);
  if (existing) return existing;

  const id = `guest_${randomUUID()}`;
  store.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}
