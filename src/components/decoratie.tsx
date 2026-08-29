"use client";

import { useId } from "react";

/**
 * Decoratieve vormen: halfafgesneden cirkels en een halftoon-raster.
 *
 * Puur beeld, dus overal aria-hidden en weg bij het printen. Ze staan alleen op schermen waar
 * niets ingevuld hoeft te worden — start, deelnemen, lobby, opbrengst en de beamer. Op de
 * invulschermen zouden ze alleen maar afleiden van het werk.
 */

type Hoek = "linksboven" | "rechtsboven" | "linksonder" | "rechtsonder";

const PLAATSING: Record<Hoek, string> = {
  linksboven: "-left-1/4 -top-1/3",
  rechtsboven: "-right-1/4 -top-1/3",
  linksonder: "-bottom-1/3 -left-1/4",
  rechtsonder: "-bottom-1/3 -right-1/4",
};

/**
 * Een grote cirkel die deels buiten beeld valt. `formaat` is de diameter als deel van de breedte
 * van de container, zodat hij meeschaalt van telefoon naar beamer.
 */
export function Cirkel({
  hoek = "rechtsboven",
  formaat = 0.7,
  toon = "accent",
  raster = false,
}: {
  hoek?: Hoek;
  formaat?: number;
  toon?: "accent" | "zacht" | "rand";
  raster?: boolean;
}) {
  const vulling =
    toon === "accent" ? "bg-accent" : toon === "zacht" ? "bg-accent-zacht" : "bg-rand";

  return (
    <div
      aria-hidden
      className={`niet-printen pointer-events-none absolute ${PLAATSING[hoek]} -z-10 aspect-square rounded-full ${vulling}`}
      style={{ width: `${formaat * 100}%` }}
    >
      {raster ? <Halftoon className="text-vlak/50" /> : null}
    </div>
  );
}

/**
 * Het stippenraster uit de referentie. Een SVG-patroon in plaats van een afbeelding, zodat het
 * scherp blijft op elk scherm en de kleur meeloopt met de tekstkleur van de omgeving.
 */
export function Halftoon({
  className = "",
  afstand = 7,
  straal = 1.4,
}: {
  className?: string;
  afstand?: number;
  straal?: number;
}) {
  // Twee halftonen op één pagina mogen elkaars patroon niet overschrijven.
  const patroonId = useId();

  return (
    <svg
      aria-hidden
      className={`niet-printen pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <pattern
          id={patroonId}
          width={afstand}
          height={afstand}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={afstand / 2} cy={afstand / 2} r={straal} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patroonId})`} />
    </svg>
  );
}

/**
 * Een halve cirkel met halftoon, als rustig vlak achter een kop. Subtieler dan een volle
 * accentcirkel en daarom geschikt op schermen waar ook tekst gelezen moet worden.
 */
export function RasterCirkel({
  formaat = 120,
  className = "",
}: {
  formaat?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`niet-printen pointer-events-none relative aspect-square overflow-hidden rounded-full text-rand-sterk ${className}`}
      style={{ width: formaat }}
    >
      <Halftoon />
    </div>
  );
}
