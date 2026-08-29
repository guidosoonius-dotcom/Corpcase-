import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * De lettertypen worden bij de build opgehaald en vanaf het eigen domein geserveerd. Er gaat dus
 * geen bezoekersdata naar Google — voor een corporatie die in deze game zelf over privacy bij
 * huurdersdata praat, is dat geen detail.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corpcase",
  description:
    "Serious business game voor use-case identificatie, waardebepaling, prioritering en roadmap in de corporatiesector.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b2926",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={`h-full ${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
