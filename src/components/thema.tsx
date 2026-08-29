"use client";

import type { ReactNode } from "react";
import { leidPaletAf, paletAlsVariabelen } from "@/lib/thema/kleur";

/**
 * Zet de accentkleur van een corporatie als CSS-variabelen op een wrapper.
 *
 * De Tailwind-utilities lezen die variabelen al (bg-accent wordt var(--color-accent)), dus elk
 * bestaand component beweegt mee zonder aanpassing. De varianten voor knoppen, kleine tekst en
 * donkere panelen worden hier afgeleid met een gemeten contrasttoets, zodat een huisstijlkleur
 * nooit een onleesbare interface kan opleveren.
 */
export function Thema({
  accent,
  children,
  className = "",
}: {
  accent: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  // Zonder kleur blijft het standaardpalet uit globals.css staan.
  if (!accent) return <div className={className}>{children}</div>;

  let variabelen: Record<string, string>;
  try {
    variabelen = paletAlsVariabelen(leidPaletAf(accent));
  } catch {
    // Een onleesbare kleurcode in de content mag geen wit scherm opleveren.
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className} style={variabelen as React.CSSProperties}>
      {children}
    </div>
  );
}
