"use client";

import type { ReactNode } from "react";
import { useTelOp } from "@/lib/animatie/telOp";

/**
 * Gedeelde bouwstenen. De toon is boardroom: rustige neutralen, één accent, veel wit.
 * Op telefoon zijn raakvlakken minstens 44 px; op de beamer moet alles van vier meter leesbaar
 * blijven, vandaar de losse `groot`-varianten.
 */

export function Kaart({
  children,
  className = "",
  aandacht = false,
  onderruimte = false,
}: {
  children: ReactNode;
  className?: string;
  aandacht?: boolean;
  /**
   * Reserveert ruimte onderaan voor een DonkerPaneel dat over deze kaart heen valt.
   *
   * Dit is een prop en geen kwestie van opletten: in de eerste opzet bedekte het uitkomstpaneel
   * de invoervelden waarin je net stond te typen. Wie een paneel laat overlappen, zet dit aan.
   */
  onderruimte?: boolean;
}) {
  return (
    <div
      className={`rounded-kaart border bg-vlak ${
        aandacht ? "border-accent" : "border-rand"
      } ${onderruimte ? "pb-12" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Knop({
  children,
  onClick,
  soort = "primair",
  type = "button",
  disabled = false,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  soort?: "primair" | "rand" | "stil" | "gevaar";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  // De lift bij hover/press komt uit de globale regel in globals.css (via de losse CSS-
  // eigenschappen `translate`/`scale`, niet `transform`, zodat dat niets breekt bij een knop die
  // zelf al een transform-gebaseerde Tailwind-utility gebruikt). Hier alleen de schaduw erbij,
  // want die moet per variant een andere diepte hebben.
  const stijlen: Record<string, string> = {
    primair:
      "bg-accent-sterk text-white shadow-sm shadow-accent-diep/20 transition-shadow hover:bg-accent-diep hover:shadow-md hover:shadow-accent-diep/30 disabled:bg-rand-sterk disabled:shadow-none",
    rand: "border border-rand-sterk bg-vlak text-inkt transition-shadow hover:border-accent hover:shadow-sm",
    stil: "text-inkt-zacht hover:bg-papier",
    gevaar:
      "border border-risico bg-vlak text-risico hover:bg-risico-zacht",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-kaart px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${stijlen[soort]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Veld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-inkt">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-inkt-licht">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const invoerStijl =
  "w-full rounded-kaart border border-rand-sterk bg-vlak px-3 py-2.5 text-base text-inkt outline-none transition-colors placeholder:text-inkt-licht focus:border-accent";

export function Etiket({
  children,
  toon = "neutraal",
}: {
  children: ReactNode;
  toon?: "neutraal" | "accent" | "waarde" | "aandacht" | "risico";
}) {
  const stijlen: Record<string, string> = {
    neutraal: "bg-papier text-inkt-zacht border-rand",
    accent: "bg-accent-zacht text-accent-diep border-accent-zacht",
    waarde: "bg-waarde-zacht text-waarde border-waarde-zacht",
    aandacht: "bg-aandacht-zacht text-aandacht border-aandacht-zacht",
    risico: "bg-risico-zacht text-risico border-risico-zacht",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${stijlen[toon]}`}
    >
      {children}
    </span>
  );
}

export function Melding({
  children,
  toon = "aandacht",
}: {
  children: ReactNode;
  toon?: "aandacht" | "risico" | "accent";
}) {
  const stijlen: Record<string, string> = {
    aandacht: "border-aandacht bg-aandacht-zacht text-aandacht",
    risico: "border-risico bg-risico-zacht text-risico",
    accent: "border-accent bg-accent-zacht text-accent-diep",
  };
  return (
    <div className={`rounded-kaart border-l-2 px-3 py-2 text-sm ${stijlen[toon]}`}>
      {children}
    </div>
  );
}

export function Kop({
  boven,
  titel,
  onder,
  rechts,
}: {
  boven?: string;
  titel: string;
  onder?: string;
  rechts?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {boven ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
            {boven}
          </p>
        ) : null}
        <h1 className="display mt-1 text-2xl leading-[1.15] text-inkt sm:text-3xl">
          {titel}
        </h1>
        {onder ? (
          <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">{onder}</p>
        ) : null}
      </div>
      {rechts ? <div className="niet-printen shrink-0">{rechts}</div> : null}
    </div>
  );
}

export function Leeg({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-kaart border border-dashed border-rand-sterk px-4 py-8 text-center text-sm text-inkt-licht">
      {children}
    </div>
  );
}

/** Schaal van 1 tot 5, groot genoeg om op een telefoon te raken. */
export function Schaal({
  waarde,
  onKies,
  labels,
}: {
  waarde: number | null;
  onKies: (waarde: number) => void;
  labels?: Record<number, string>;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onKies(n)}
          title={labels?.[n]}
          aria-label={labels?.[n] ?? `Score ${n}`}
          aria-pressed={waarde === n}
          className={`flex h-11 flex-1 items-center justify-center rounded-kaart border text-sm font-medium tabular-nums transition-colors ${
            waarde === n
              ? "border-accent-sterk bg-accent-sterk text-white"
              : "border-rand-sterk bg-vlak text-inkt-zacht hover:border-accent-sterk"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/**
 * Een getal dat het beeld draagt in plaats van een bijschrift.
 *
 * Playfair met strakke letterafstand en tabulaire cijfers, zodat een oplopende teller niet
 * zit te schuiven. Gebruikt voor de teamscore, de netto waarde en de tellers op de beamer.
 */
export function Cijfer({
  waarde,
  label,
  toon = "inkt",
  formaat = "groot",
  achtervoegsel,
  toelichting,
}: {
  waarde: string | number;
  label?: string;
  toon?: "inkt" | "accent" | "op-donker" | "gedempt";
  formaat?: "normaal" | "groot" | "reusachtig";
  achtervoegsel?: string;
  /** Eén korte regel onder het getal die uitlegt wat het meet — niet elk cijfer heeft dat nodig. */
  toelichting?: string;
}) {
  // Vol koraal haalt op papier 3,43. Dat is genoeg voor grote tekst (norm 3,0) en niet voor
  // kleine, en daarom begint het kleinste formaat hieronder op 30px. Zolang dat zo blijft mag
  // `accent` hier het volle koraal zijn; wordt er ooit een kleiner formaat bijgezet, dan moet
  // dat `accent-diep` gebruiken.
  const kleuren: Record<string, string> = {
    inkt: "text-inkt",
    accent: "text-accent",
    "op-donker": "text-accent-op-donker",
    gedempt: "text-houtskool-zacht",
  };

  const formaten: Record<string, string> = {
    normaal: "text-3xl",
    groot: "text-5xl",
    reusachtig: "text-6xl sm:text-7xl",
  };

  // Op de lichte kant bewust `inkt-zacht` en niet `inkt-licht`: een cijferblok valt regelmatig
  // over een zachte accentcirkel, en daar haalt inkt-licht maar 4,43.
  const labelkleur =
    toon === "op-donker" || toon === "gedempt" ? "text-houtskool-zacht" : "text-inkt-zacht";

  // Alleen een echt getal telt zichtbaar op; een al opgemaakte tekst (een bandbreedte als
  // "€ 91.500 – € 208.500") heeft geen enkele waarde om naartoe te tellen.
  const getal = typeof waarde === "number" ? waarde : null;
  const opgeteld = useTelOp(getal ?? 0);
  const weerTeGeven = getal !== null ? opgeteld : waarde;

  return (
    <div>
      {label ? (
        <p className={`text-xs leading-snug ${labelkleur}`}>{label}</p>
      ) : null}
      <p className={`cijfer mt-1 ${formaten[formaat]} ${kleuren[toon]}`}>
        {weerTeGeven}
        {achtervoegsel ? (
          <span className="ml-1 align-baseline text-base font-normal">{achtervoegsel}</span>
        ) : null}
      </p>
      {toelichting ? (
        <p className={`mt-1 max-w-[22rem] text-[11px] leading-snug ${labelkleur}`}>{toelichting}</p>
      ) : null}
    </div>
  );
}

/**
 * Het donkere paneel: precies één per scherm, op de plek waar de beslissing valt.
 *
 * Bewust geen invoervelden hierbinnen — die blijven op wit staan, waar ze het vertrouwde
 * formuliergedrag houden en het contrast van de cursor klopt.
 */
export function DonkerPaneel({
  children,
  className = "",
  overlapt = false,
  bloedt,
}: {
  children: ReactNode;
  className?: string;
  /** Valt over de kaart erboven heen. Die kaart hoort dan `onderruimte` te hebben. */
  overlapt?: boolean;
  /**
   * Loopt tegen die schermrand aan: de hoeken aan die kant blijven recht en de marge valt weg.
   * Dat is wat het paneel zijn gewicht geeft — een kaart die netjes binnen de marge blijft,
   * leest als nog een blok in de lijst.
   *
   * Vanaf `lg` valt dit weg: de negatieve marge is precies zo groot als de containerpadding
   * (px-4) om tegen de schermrand van een telefoon aan te lopen, maar op een laptop staat diezelfde
   * container smal en gecentreerd met een marge van honderden pixels erbuiten — de rand die het
   * paneel dan "raakt" is niet meer de schermrand, en het paneel bleedt in het luchtledige.
   */
  bloedt?: "links" | "rechts";
}) {
  // De marge is precies de standaard containerpadding (px-4), zodat het paneel de rand raakt
  // en er niet overheen schiet.
  const randvorm =
    bloedt === "links"
      ? "-ml-4 rounded-l-none lg:ml-0 lg:rounded-kaart"
      : bloedt === "rechts"
        ? "-mr-4 rounded-r-none lg:mr-0 lg:rounded-kaart"
        : "";

  return (
    <div
      className={`relative overflow-hidden rounded-kaart bg-houtskool text-white ${
        overlapt ? "-mt-6" : ""
      } ${randvorm} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * De haarlijn met twee kleine kapitaallabels erboven, bovenaan elk fasescherm.
 *
 * Kort en met veel letterafstand: het is oriëntatie, geen inhoud, en het moet in één oogopslag
 * te negeren zijn.
 */
export function Hoofdregel({ links, rechts }: { links: string; rechts?: string }) {
  return (
    <div className="niet-printen">
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-inkt-licht">
          {links}
        </span>
        {rechts ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-inkt-licht">
            {rechts}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 h-px bg-rand-sterk" />
    </div>
  );
}

/**
 * De handeling onderaan een scherm: een haarlijn, een label met tekst, en een pijl.
 *
 * De pijl zit in een raakvlak van 44 bij 44 met de tekening erbinnen — dezelfde constructie als
 * bij de matrixpunten, waar de globale regel dat elke knop 44 pixels hoog is er anders een streep
 * van maakt.
 */
export function PijlActie({
  label,
  tekst,
  onClick,
}: {
  label: string;
  tekst: string;
  onClick?: () => void;
}) {
  const inhoud = (
    <>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          {label}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-inkt-zacht">{tekst}</span>
      </span>
      {/*
       * De pijl schuift op hover een stukje op — een klassieke, kleine wenk dat er iets volgt.
       * Dit is een eigen transform op dit kind-element, los van de lift die de knop zelf al van
       * de globale hover-regel krijgt; ze staan op verschillende elementen en botsen dus niet.
       */}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden
          className="transition-transform duration-200 ease-out group-hover:translate-x-1"
        >
          <path
            d="M4 14h20M17 7l7 7-7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </>
  );

  return (
    <div className="niet-printen mt-6">
      <div className="h-px bg-rand-sterk" />
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="group flex w-full items-center justify-between gap-4 pt-2 text-left text-accent-diep transition-colors hover:text-accent-sterk"
        >
          {inhoud}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-4 pt-2 text-accent-diep">
          {inhoud}
        </div>
      )}
    </div>
  );
}
