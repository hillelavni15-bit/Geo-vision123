import type { Confidence } from "@/lib/types";

export function confidenceClass(c: Confidence | string): string {
  if (c === "high") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (c === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

/** Colour a clue chip by what kind of evidence it describes. */
export function clueClass(clue: string): string {
  const l = clue.toLowerCase();
  if (/landmark|monument|tower|bridge/.test(l)) return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (/architecture|building|style/.test(l)) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (/text|sign|language|script/.test(l)) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (/nature|mountain|coast|tree|vegetation/.test(l)) return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-secondary/50 text-secondary-foreground border-border";
}
