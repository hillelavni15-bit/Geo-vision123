import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Header, content and footer, with room for the phone tab bar. */
export function PageShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden pb-16 sm:pb-0">
      <SiteHeader actions={actions} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
