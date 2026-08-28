import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corpcase",
  description:
    "Serious business game voor use-case identificatie, waardebepaling, prioritering en roadmap in de corporatiesector.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f4e6b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
