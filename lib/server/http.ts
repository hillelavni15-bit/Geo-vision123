import "server-only";
import { NextResponse } from "next/server";
import { AiNotConfiguredError } from "./openai";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Map an unexpected error from an AI-backed route to a friendly response. */
export function aiErrorResponse(err: unknown, action: string) {
  if (err instanceof AiNotConfiguredError) {
    return jsonError(503, "The AI service isn't set up yet (missing OPENAI_API_KEY). You were not charged.");
  }
  const name = (err as { name?: string })?.name ?? "";
  if (name === "AbortError" || name === "APIConnectionTimeoutError") {
    return jsonError(504, `The ${action} took too long. Please try again. You were not charged.`);
  }
  const status = (err as { status?: number })?.status;
  if (status === 429) return jsonError(429, "The AI service is busy. Try again in a moment. You were not charged.");
  console.error(`${action} failed`, err);
  return jsonError(502, `The ${action} failed. Please try again. You were not charged.`);
}
