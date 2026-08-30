"use client";

import { useId } from "react";
import Image from "next/image";

/**
 * Decoratieve vormen: halfafgesneden cirkels en een halftoon-raster.
 *
 * Puur beeld, dus overal aria-hidden en weg bij het printen. Ze staan alleen op schermen waar
 * niets ingevuld hoeft te worden — start, deelnemen, lobby, opbrengst en de beamer. Op de
 * invulschermen zouden ze alleen maar afleiden van het werk.
 */

type Hoek = "linksboven" | "rechtsboven" | "linksonder" | "rechtsonder";

/**
 * De cirkel wordt vanuit de hoek verschoven met een deel van zijn eigen breedte.
 *
 * Bewust met `translate` en niet met een procentuele `top`/`bottom`: die resolveert tegen de
 * hoogte van de container, en op een lang scherm schoof de cirkel daardoor honderden pixels
 * buiten beeld. Een verschuiving over de eigen maat doet altijd hetzelfde, hoe lang de pagina
 * ook is.
 */
const PLAATSING: Record<Hoek, string> = {
  linksboven: "left-0 top-0 -translate-x-1/3 -translate-y-1/3",
  rechtsboven: "right-0 top-0 translate-x-1/3 -translate-y-1/3",
  linksonder: "bottom-0 left-0 -translate-x-1/3 translate-y-1/3",
  rechtsonder: "bottom-0 right-0 translate-x-1/3 translate-y-1/3",
};

/**
 * Een grote cirkel die deels buiten beeld valt. `formaat` is de diameter als deel van de breedte
 * van de container, zodat hij meeschaalt van telefoon naar beamer.
 */
export function Cirkel({
  hoek = "rechtsboven",
  formaat = 0.7,
  toon = "zacht",
  raster = false,
  vanBoven = 0,
  afbeelding,
}: {
  hoek?: Hoek;
  formaat?: number;
  /**
   * Vanaf welke hoogte de cirkel mag beginnen, in pixels.
   *
   * Bestaat om de cirkel onder de kopregel te houden: op het volle accent haalt zelfs de
   * donkerste tekst maar 4,44, dus een label mag er nooit overheen vallen.
   */
  vanBoven?: number;
  /**
   * `zacht` is de standaard en verdraagt tekst eroverheen: inkt haalt er 13,5 en inkt-zacht 6,7.
   *
   * `accent` is het volle koraal en verdraagt géén tekst — wit haalt erop 3,66 en zelfs de
   * donkerste inkt niet meer dan 4,44, allebei onder de norm. Gebruik die alleen in een zone
   * waar zeker geen tekst overheen valt.
   *
   * Genegeerd zodra `afbeelding` is gezet.
   */
  toon?: "accent" | "zacht" | "rand";
  raster?: boolean;
  /**
   * Vervangt de effen vulling door een foto, op dezelfde plek en hetzelfde formaat. De foto blijft
   * ongesneden zichtbaar (`object-contain`) op een papieren ondergrond, in plaats van uitgesneden
   * zoals de effen vulling: een cirkel snijdt een illustratie al genoeg af aan de buitenrand, en
   * mag het onderwerp zelf niet nóg verder wegsnijden. Net als de effen cirkel puur decoratief —
   * geen tekst hoort hier ooit overheen te vallen.
   *
   * `verschuifX`/`verschuifY` schuiven de ongesneden foto op binnen haar cirkel, als percentage
   * van haar eigen breedte/hoogte — positief is naar rechts/beneden. Puur een fijnkorrelige
   * duw voor het beeld dat toevallig het beste in de cirkel oogt; de cirkel snijdt de rand af,
   * dus een lichte verschuiving mag een paar procent van de foto buiten beeld duwen.
   */
  afbeelding?: { src: string; verschuifX?: number; verschuifY?: number };
}) {
  const vulling =
    toon === "accent" ? "bg-accent" : toon === "zacht" ? "bg-accent-zacht" : "bg-rand";

  /*
   * De cirkel krijgt zijn eigen bijsnijdvlak over de hele container. Zo wordt hij netjes door de
   * schermrand afgesneden zonder dat de container zelf `overflow-hidden` nodig heeft — die mag
   * dat niet, want daar loopt het donkere paneel juist met opzet tegen de rand aan.
   */
  return (
    <div
      aria-hidden
      className="niet-printen pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={vanBoven ? { top: vanBoven } : undefined}
    >
      {/*
       * `animate-ademen` schaalt via `transform`, niet via de losse CSS-eigenschap `scale` — die
       * laatste draagt hier al de positionering: Tailwinds `translate-x-1/3` (uit `PLAATSING`)
       * compileert naar de losse eigenschap `translate`, niet naar `transform`. Zou de animatie
       * zelf ook `scale` gebruiken, dan overschreef hij diezelfde eigenschap zodra hij op een
       * cirkel met een schaal-utility terechtkwam; met `transform` blijft hij daar sowieso los
       * van, wat er verder ook aan Tailwind-utility's bijkomt.
       */}
      <div
        className={`absolute ${PLAATSING[hoek]} aspect-square overflow-hidden rounded-full motion-safe:animate-ademen ${
          afbeelding
            ? "bg-[#f7f2e2] shadow-[0_8px_24px_-8px_rgba(34,32,30,0.35)]"
            : vulling
        }`}
        style={{ width: `${formaat * 100}%` }}
      >
        {afbeelding ? (
          <Image
            src={afbeelding.src}
            alt=""
            fill
            priority
            sizes="(min-width: 640px) 260px, 55vw"
            className="object-contain p-4"
            style={
              afbeelding.verschuifX || afbeelding.verschuifY
                ? {
                    transform: `translate(${afbeelding.verschuifX ?? 0}%, ${afbeelding.verschuifY ?? 0}%)`,
                  }
                : undefined
            }
          />
        ) : raster ? (
          <Halftoon className="text-vlak/50" />
        ) : null}
      </div>
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
      className={`niet-printen pointer-events-none relative aspect-square overflow-hidden rounded-full text-rand-sterk motion-safe:animate-ademen ${className}`}
      style={{ width: formaat }}
    >
      <Halftoon />
    </div>
  );
}
