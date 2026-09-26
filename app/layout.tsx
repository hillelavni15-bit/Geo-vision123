import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geo-Vision · איתור מיקומים",
  description: "זיהוי מיקום מתמונה עם AI, חילוץ GPS מתמונות, חיפוש מקומות ומשחק ניחוש מיקומים",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d5dfc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
