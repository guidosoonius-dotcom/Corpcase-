import type { ReactNode } from "react";

/**
 * Gedeelde bouwstenen. De toon is boardroom: rustige neutralen, één accent, veel wit.
 * Op telefoon zijn raakvlakken minstens 44 px; op de beamer moet alles van vier meter leesbaar
 * blijven, vandaar de losse `groot`-varianten.
 */

export function Kaart({
  children,
  className = "",
  aandacht = false,
}: {
  children: ReactNode;
  className?: string;
  aandacht?: boolean;
}) {
  return (
    <div
      className={`rounded-kaart border bg-vlak ${
        aandacht ? "border-accent" : "border-rand"
      } ${className}`}
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
  const stijlen: Record<string, string> = {
    primair:
      "bg-accent-sterk text-white hover:bg-accent-diep disabled:bg-rand-sterk",
    rand: "border border-rand-sterk bg-vlak text-inkt hover:border-accent",
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
}: {
  waarde: string | number;
  label?: string;
  toon?: "inkt" | "accent" | "op-donker" | "gedempt";
  formaat?: "normaal" | "groot" | "reusachtig";
  achtervoegsel?: string;
}) {
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

  const labelkleur =
    toon === "op-donker" || toon === "gedempt" ? "text-houtskool-zacht" : "text-inkt-licht";

  return (
    <div>
      {label ? (
        <p className={`text-xs leading-snug ${labelkleur}`}>{label}</p>
      ) : null}
      <p className={`cijfer mt-1 ${formaten[formaat]} ${kleuren[toon]}`}>
        {waarde}
        {achtervoegsel ? (
          <span className="ml-1 align-baseline text-base font-normal">{achtervoegsel}</span>
        ) : null}
      </p>
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
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-kaart bg-houtskool text-white ${className}`}
    >
      {children}
    </div>
  );
}
