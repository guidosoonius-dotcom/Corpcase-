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
      className={`rounded-[--radius-kaart] border bg-[--color-vlak] ${
        aandacht ? "border-[--color-accent]" : "border-[--color-rand]"
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
      "bg-[--color-accent] text-white hover:bg-[--color-accent-diep] disabled:bg-[--color-rand-sterk]",
    rand: "border border-[--color-rand-sterk] bg-[--color-vlak] text-[--color-inkt] hover:border-[--color-accent]",
    stil: "text-[--color-inkt-zacht] hover:bg-[--color-papier]",
    gevaar:
      "border border-[--color-risico] bg-[--color-vlak] text-[--color-risico] hover:bg-[--color-risico-zacht]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-[--radius-kaart] px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${stijlen[soort]} ${className}`}
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
      <span className="block text-sm font-medium text-[--color-inkt]">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-[--color-inkt-licht]">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const invoerStijl =
  "w-full rounded-[--radius-kaart] border border-[--color-rand-sterk] bg-[--color-vlak] px-3 py-2.5 text-base text-[--color-inkt] outline-none transition-colors placeholder:text-[--color-inkt-licht] focus:border-[--color-accent]";

export function Etiket({
  children,
  toon = "neutraal",
}: {
  children: ReactNode;
  toon?: "neutraal" | "accent" | "waarde" | "aandacht" | "risico";
}) {
  const stijlen: Record<string, string> = {
    neutraal: "bg-[--color-papier] text-[--color-inkt-zacht] border-[--color-rand]",
    accent: "bg-[--color-accent-zacht] text-[--color-accent-diep] border-[--color-accent-zacht]",
    waarde: "bg-[--color-waarde-zacht] text-[--color-waarde] border-[--color-waarde-zacht]",
    aandacht: "bg-[--color-aandacht-zacht] text-[--color-aandacht] border-[--color-aandacht-zacht]",
    risico: "bg-[--color-risico-zacht] text-[--color-risico] border-[--color-risico-zacht]",
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
    aandacht: "border-[--color-aandacht] bg-[--color-aandacht-zacht] text-[--color-aandacht]",
    risico: "border-[--color-risico] bg-[--color-risico-zacht] text-[--color-risico]",
    accent: "border-[--color-accent] bg-[--color-accent-zacht] text-[--color-accent-diep]",
  };
  return (
    <div className={`rounded-[--radius-kaart] border-l-2 px-3 py-2 text-sm ${stijlen[toon]}`}>
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
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {boven ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[--color-inkt-licht]">
            {boven}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold leading-tight text-[--color-inkt] sm:text-2xl">
          {titel}
        </h1>
        {onder ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">{onder}</p>
        ) : null}
      </div>
      {rechts ? <div className="shrink-0 niet-printen">{rechts}</div> : null}
    </div>
  );
}

export function Leeg({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[--radius-kaart] border border-dashed border-[--color-rand-sterk] px-4 py-8 text-center text-sm text-[--color-inkt-licht]">
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
          className={`flex h-11 flex-1 items-center justify-center rounded-[--radius-kaart] border text-sm font-medium tabular-nums transition-colors ${
            waarde === n
              ? "border-[--color-accent] bg-[--color-accent] text-white"
              : "border-[--color-rand-sterk] bg-[--color-vlak] text-[--color-inkt-zacht] hover:border-[--color-accent]"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
