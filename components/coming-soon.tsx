import type { LucideIcon } from "lucide-react";
import { PageShell } from "./page-shell";

/** Placeholder for a section that is still being rebuilt. */
export function ComingSoon({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <PageShell>
      <div className="container mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="glass-card flex max-w-xl animate-fade-up flex-col items-center rounded-2xl p-10 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Icon className="size-7 text-primary" />
          </span>
          <h1 className="mb-2 text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{text}</p>
        </div>
      </div>
    </PageShell>
  );
}
