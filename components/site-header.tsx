"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bookmark, Coins, Crosshair, Crown, Globe2, Trophy, User, Users } from "lucide-react";
import { useMe } from "./me-provider";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Explore", icon: Globe2 },
  { href: "/leaderboard", label: "Daily", icon: Trophy },
  { href: "/collections", label: "Collections", icon: Bookmark },
  { href: "/match", label: "Versus", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Top bar on every page, plus a bottom tab bar on phones. `actions` adds page-specific buttons. */
export function SiteHeader({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  const { me, creditsLabel } = useMe();

  return (
    <>
      <header className="glass-panel sticky top-0 z-50 border-b border-primary/10">
        <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
          <Link href="/?tool=identify" className="flex shrink-0 items-center gap-2.5" aria-label="Where Is This? home">
            <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <Crosshair className="size-[18px] text-primary" />
            </span>
            <span className="hidden bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-xl font-bold tracking-tight text-transparent md:inline">
              Where Is This?
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/?tool=play"
              className="glass-card flex items-center gap-1.5 rounded-full px-3 py-1.5 text-amber-400 transition-colors hover:bg-amber-500/10"
              title="Coins — play to earn more"
              aria-label={`${creditsLabel} coins`}
            >
              <Coins className="size-3.5" />
              <span className="text-xs font-bold tabular-nums">{creditsLabel}</span>
            </Link>
            {me?.isPro && (
              <span className="hidden items-center gap-1 rounded-md border border-primary/20 bg-gradient-to-r from-primary/20 to-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-primary sm:flex">
                <Crown className="size-3" /> Pro
              </span>
            )}
            {actions}
          </div>
        </div>
      </header>

      <nav className="glass-panel pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-primary/10 sm:hidden" aria-label="Mobile">
        <div className="flex h-16 items-center justify-around px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full w-full min-w-0 flex-col items-center justify-center gap-1",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
