import Link from "next/link";
import { Crosshair } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-primary/10 bg-background/50 py-8 backdrop-blur-sm">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Crosshair className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Where Is This?</span>
          <span className="ml-2 text-xs">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6 text-sm font-medium">
          <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
