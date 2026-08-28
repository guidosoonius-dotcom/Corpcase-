"use client";

import { speelmodi } from "@/lib/content";
import type { UsecaseBeeld } from "@/lib/sessie/afgeleid";
import type { KwadrantId } from "@/lib/waarde/berekening";

/**
 * Waarde tegen haalbaarheid, met de vier kwadranten eronder benoemd.
 *
 * Bewust een vierkant met vaste assen van 1 tot 5 in plaats van een dynamische schaal: het beeld
 * moet tussen twee sessies vergelijkbaar blijven, en op een beamer meteen leesbaar zijn.
 */
export function Matrix({
  beelden,
  hoogte = 320,
  geselecteerd,
  onKies,
}: {
  beelden: UsecaseBeeld[];
  hoogte?: number;
  geselecteerd?: string | null;
  onKies?: (usecaseId: string) => void;
}) {
  const geplaatst = beelden.filter((b) => b.positie !== null);
  const ontbreekt = beelden.length - geplaatst.length;

  return (
    <div>
      <div
        className="relative w-full rounded-kaart border border-rand bg-vlak"
        style={{ height: hoogte }}
      >
        {/* Kwadrantscheiding op het midden van de schaal. */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-rand" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-rand" />

        <span className="pointer-events-none absolute left-2 top-2 text-[10px] font-medium uppercase tracking-wide text-inkt-licht">
          Strategisch investeren
        </span>
        <span className="pointer-events-none absolute right-2 top-2 text-[10px] font-medium uppercase tracking-wide text-inkt-licht">
          Snel doen
        </span>
        <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] font-medium uppercase tracking-wide text-inkt-licht">
          Niet nu
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] font-medium uppercase tracking-wide text-inkt-licht">
          Meenemen
        </span>

        {geplaatst.map((beeld) => {
          const positie = beeld.positie!;
          // Schaal 1-5 naar 6%-94%, zodat een punt aan de rand nog helemaal zichtbaar blijft.
          const links = 6 + ((positie.haalbaarheid - 1) / 4) * 88;
          const onder = 6 + ((positie.waarde - 1) / 4) * 88;
          const actief = geselecteerd === beeld.usecase.id;

          return (
            <button
              key={beeld.usecase.id}
              type="button"
              onClick={() => onKies?.(beeld.usecase.id)}
              title={beeld.usecase.titel}
              className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full border-2 transition-all ${
                actief
                  ? "z-10 h-5 w-5 border-accent-diep bg-accent"
                  : "h-3.5 w-3.5 border-vlak bg-accent hover:h-5 hover:w-5"
              }`}
              style={{ left: `${links}%`, bottom: `${onder}%` }}
              aria-label={beeld.usecase.titel}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-inkt-licht">
        <span>← lastiger haalbaar</span>
        <span>makkelijker haalbaar →</span>
      </div>
      <p className="mt-0.5 text-[11px] text-inkt-licht">
        Verticaal: meer waarde naar boven.{" "}
        {ontbreekt === 1
          ? "Eén use case staat er nog niet op omdat hij niet gewaardeerd is."
          : ontbreekt > 1
            ? `${ontbreekt} use cases staan er nog niet op omdat ze niet gewaardeerd zijn.`
            : ""}
      </p>
    </div>
  );
}

export function KwadrantAdvies({ kwadrant }: { kwadrant: KwadrantId }) {
  const beschrijving = speelmodi.kwadranten.find((k) => k.id === kwadrant);
  if (!beschrijving) return null;
  return (
    <span className="text-[11px] leading-snug text-inkt-licht">
      {beschrijving.naam} — {beschrijving.advies}
    </span>
  );
}
