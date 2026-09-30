import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { MeProvider } from "@/components/me-provider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Where Is This?",
  description: "Identify locations from photos and test your geography skills.",
  openGraph: {
    title: "Where Is This?",
    description: "Identify locations from photos and test your geography skills.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d131b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MeProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </MeProvider>
      </body>
    </html>
  );
}
