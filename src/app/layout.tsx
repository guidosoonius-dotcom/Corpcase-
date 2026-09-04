import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * De lettertypen worden bij de build opgehaald en vanaf het eigen domein geserveerd. Er gaat dus
 * geen bezoekersdata naar Google — voor een corporatie die in deze game zelf over privacy bij
 * huurdersdata praat, is dat geen detail.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
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
    <html lang="nl" className={`h-full ${jakarta.variable} ${fraunces.variable}`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
