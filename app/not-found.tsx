import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <MapPinOff className="mb-6 size-14 text-primary/60" />
        <h1 className="mb-3 text-4xl font-bold">404 - Page Not Found</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          The location you&apos;re looking for doesn&apos;t exist on our map.
        </p>
        <Link
          href="/"
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          Start Exploring
        </Link>
      </div>
    </PageShell>
  );
}
