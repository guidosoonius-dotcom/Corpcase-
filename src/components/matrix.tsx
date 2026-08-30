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
  donker = false,
}: {
  beelden: UsecaseBeeld[];
  hoogte?: number;
  geselecteerd?: string | null;
  onKies?: (usecaseId: string) => void;
  /** Donkere variant voor de beamer, waar de zaal vaak verduisterd is. */
  donker?: boolean;
}) {
  const geplaatst = beelden.filter((b) => b.positie !== null);
  const ontbreekt = beelden.length - geplaatst.length;
  const actief = geselecteerd ? beelden.find((b) => b.usecase.id === geselecteerd) : undefined;

  const vlak = donker ? "border-houtskool-rand bg-houtskool" : "border-rand bg-vlak";
  const lijn = donker ? "bg-houtskool-rand" : "bg-rand";
  const label = donker ? "text-houtskool-zacht" : "text-inkt-licht";
  const punt = donker ? "border-houtskool" : "border-vlak";

  return (
    <div>
      {/*
       * Vaste hoogte, ook leeg: anders springt de matrix een regel omhoog zodra de eerste stip
       * wordt aangetikt. Alleen aanwezig waar getikt ook echt iets doet — op de statische
       * beamerweergave (geen `onKies`) blijft deze regel weg.
       */}
      {onKies ? (
        <p
          className={`mb-1.5 min-h-[1.1rem] text-xs ${
            actief ? "font-medium text-accent-diep" : "text-inkt-licht"
          }`}
        >
          {actief?.usecase.titel ?? "Tik op een stip voor de naam van de use case"}
        </p>
      ) : null}
      <div
        className={`relative w-full rounded-kaart border ${vlak}`}
        style={{ height: hoogte }}
      >
        {/* Kwadrantscheiding op het midden van de schaal. */}
        <div className={`absolute inset-x-0 top-1/2 h-px ${lijn}`} />
        <div className={`absolute inset-y-0 left-1/2 w-px ${lijn}`} />

        {(
          [
            ["left-2 top-2", "Strategisch investeren"],
            ["right-2 top-2", "Snel doen"],
            ["bottom-2 left-2", "Niet nu"],
            ["bottom-2 right-2", "Meenemen"],
          ] as const
        ).map(([plek, tekst]) => (
          <span
            key={tekst}
            className={`pointer-events-none absolute ${plek} text-[10px] font-medium uppercase tracking-wide ${label}`}
          >
            {tekst}
          </span>
        ))}

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
              /*
               * De knop is 44 bij 44 en onzichtbaar, zodat hij op een telefoon te raken is; de
               * stip erin is het beeld. Zonder dit zou de globale regel die elke knop minstens
               * 44 pixels hoog maakt de stip tot een streep uitrekken.
               */
              className={`absolute flex h-11 w-11 -translate-x-1/2 translate-y-1/2 items-center justify-center ${
                actief ? "z-10" : ""
              }`}
              style={{ left: `${links}%`, bottom: `${onder}%` }}
              aria-label={beeld.usecase.titel}
            >
              <span
                className={`block rounded-full border-2 bg-accent transition-all ${
                  actief ? `h-5 w-5 border-accent-diep` : `h-3.5 w-3.5 ${punt}`
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className={`mt-1.5 flex justify-between text-[11px] ${label}`}>
        <span>← lastiger haalbaar</span>
        <span>makkelijker haalbaar →</span>
      </div>
      <p className={`mt-0.5 text-[11px] ${label}`}>
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
