"use client";

import { useState } from "react";
import { procesmodus, waardeModel } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { businessCaseVanVerbetering } from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import { ProcesTabs } from "@/components/processtrook";
import {
  DonkerPaneel,
  Etiket,
  Hoofdregel,
  Kaart,
  Knop,
  Kop,
  Leeg,
  Melding,
  PijlActie,
  invoerStijl,
} from "@/components/basis";
import { Halftoon } from "@/components/decoratie";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { ProcesVerbeteringRij, SessieState } from "@/lib/supabase/types";

/**
 * Fase 5 van de processessie: elke verbetering krijgt een bandbreedte.
 *
 * Dezelfde rekenmotor als bij de use cases (`berekenBusinessCase`), en hetzelfde scherm-patroon
 * als `waardebepaling.tsx` — hier per verbetering in plaats van per use case. Geen scorekaart-optie:
 * een verbetering heeft geen ordegrootte-startpunt uit een bibliotheek, dus doorrekenen is de enige
 * diepgang die hier iets oplevert.
 */
export function Doorrekenen({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [actiefId, setActiefId] = useState<string | null>(null);
  const modus = procesmodus(state.sessie.speelmodus);

  const actief = state.processen.find((p) => p.id === actiefId) ?? state.processen[0] ?? null;

  if (!actief) {
    return (
      <div className="space-y-5">
        <Hoofdregel links={state.sessie.titel} rechts="Fase 5 · Doorrekenen" />
        <Kop boven="Fase 5 · Doorrekenen" titel="Er ligt nog geen proces op tafel" />
        <Leeg>Ga terug naar de proceskeuze en leg eerst een proces op tafel.</Leeg>
      </div>
    );
  }

  const verbeteringen = state.verbeteringen.filter((v) => v.proces_id === actief.id);
  const doorgerekend = verbeteringen.filter(
    (v) => businessCaseVanVerbetering(v, state.sessie.onzekerheid_pct)?.volledig,
  ).length;
  const tekort = modus.verbeteringen_doorrekenen_aantal - doorgerekend;

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 5 · Doorrekenen" />
      <Kop
        boven="Fase 5 · Doorrekenen"
        titel="Wat levert dit op?"
        onder="Elke verbetering krijgt een bandbreedte, met dezelfde motor als de use cases uit sessie 1."
      />

      <ProcesTabs processen={state.processen} actiefId={actief.id} onKies={setActiefId} />

      {modus.verbeteringen_doorrekenen_aantal > 0 ? (
        tekort > 0 ? (
          <Melding>
            Reken er minstens {modus.verbeteringen_doorrekenen_aantal} helemaal door. Er{" "}
            {doorgerekend === 1 ? "is er één" : `zijn er ${doorgerekend}`} klaar, nog {tekort} te
            gaan.
          </Melding>
        ) : (
          <Melding toon="accent">
            {doorgerekend} verbeteringen doorgerekend. Genoeg om het besluit op te baseren.
          </Melding>
        )
      ) : null}

      {verbeteringen.length === 0 ? (
        <Leeg>Er zijn nog geen verbeteringen genoteerd bij dit proces. Ga terug naar het herontwerp.</Leeg>
      ) : (
        <ul className="space-y-3">
          {verbeteringen.map((v) => (
            <li key={v.id}>
              <VerbeteringDoorrekenen state={state} identiteit={identiteit} doe={doe} verbetering={v} />
            </li>
          ))}
        </ul>
      )}

      <PijlActie
        label="Volgende"
        tekst="Leg per verbetering een eigenaar vast en doorsta de praktijktoetsen"
      />
    </div>
  );
}

type DoorrekenVelden = Pick<Parameters<typeof opslag.wijzigVerbetering>[2], "drivers" | "kosten">;

function VerbeteringDoorrekenen({
  state,
  identiteit,
  doe,
  verbetering,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  verbetering: ProcesVerbeteringRij;
}) {
  const [open, setOpen] = useState(false);
  const businessCase = businessCaseVanVerbetering(verbetering, state.sessie.onzekerheid_pct);
  const drivers = verbetering.drivers;
  const kosten = verbetering.kosten;

  async function bewaar(velden: DoorrekenVelden) {
    await doe(() => opslag.wijzigVerbetering(identiteit, verbetering.id, velden));
  }

  async function voegDriverToe(type: string) {
    const definitie = waardeModel.drivertypes.find((d) => d.id === type);
    if (!definitie) return;

    const waarden: Record<string, number | null> = {};
    for (const veld of definitie.velden) {
      const uitProfiel = veld.uitgangspunt
        ? state.sessie.uitgangspunten[veld.uitgangspunt]
        : undefined;
      waarden[veld.id] = typeof uitProfiel === "number" ? uitProfiel : null;
    }
    await bewaar({ drivers: [...drivers, { type, waarden }] });
  }

  async function zetVeld(index: number, veldId: string, waarde: number | null) {
    const nieuw = drivers.map((d, i) =>
      i === index ? { ...d, waarden: { ...d.waarden, [veldId]: waarde } } : d,
    );
    await bewaar({ drivers: nieuw });
  }

  async function verwijderDriver(index: number) {
    await bewaar({ drivers: drivers.filter((_, i) => i !== index) });
  }

  return (
    <Kaart aandacht={businessCase?.volledig ?? false} className="overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-snug text-inkt">{verbetering.titel}</h3>
            {verbetering.manoeuvre ? (
              <span className="mt-1 inline-block">
                <Etiket>{verbetering.manoeuvre}</Etiket>
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-2">
          {businessCase?.netto_baat ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  (businessCase.netto_baat?.verwacht ?? 0) >= 0 ? "text-waarde" : "text-risico"
                }`}
              >
                {formatteerBandbreedte(businessCase.netto_baat)} per jaar
              </span>
              {!businessCase.volledig ? <Etiket toon="aandacht">nog niet compleet</Etiket> : null}
            </div>
          ) : (
            <p className="text-xs text-inkt-licht">Nog niet doorgerekend.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2.5 text-xs font-medium text-accent-diep hover:underline"
        >
          {open ? "Inklappen" : "Doorrekenen"}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-rand bg-papier px-4 py-4">
          {drivers.map((driver, index) => {
            const definitie = waardeModel.drivertypes.find((d) => d.id === driver.type);
            if (!definitie) return null;
            const uitkomst = businessCase?.drivers[index];

            return (
              <div
                key={`${driver.type}-${index}`}
                className="rounded-kaart border border-rand bg-vlak p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-inkt">{definitie.naam}</p>
                    <p className="mt-0.5 font-mono text-[10px] leading-snug text-inkt-licht">
                      {definitie.formule}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void verwijderDriver(index)}
                    className="shrink-0 text-[11px] text-inkt-licht hover:text-risico"
                  >
                    weghalen
                  </button>
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-inkt-zacht">
                  {definitie.toelichting}
                </p>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {definitie.velden.map((veld) => (
                    <label key={veld.id} className="block">
                      <span className="block text-[11px] text-inkt-zacht">
                        {veld.label} <span className="text-inkt-licht">({veld.eenheid})</span>
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        className={`${invoerStijl} mt-1 !py-2 !text-sm tabular-nums`}
                        value={driver.waarden[veld.id] ?? ""}
                        placeholder="onbekend"
                        onChange={(e) =>
                          void zetVeld(
                            index,
                            veld.id,
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>

                {uitkomst?.status === "berekend" ? (
                  <p className="mt-2 text-xs font-medium tabular-nums text-waarde">
                    {formatteerEuro(uitkomst.jaarlijkse_baat)} per jaar
                  </p>
                ) : uitkomst?.status === "onbekend" ? (
                  <p className="mt-2 text-xs text-aandacht">
                    Nog onbekend: vul {uitkomst.ontbrekende_velden.join(", ")} in.
                  </p>
                ) : null}
              </div>
            );
          })}

          <div>
            <p className="text-xs font-semibold text-inkt">Waar komt de waarde vandaan?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {waardeModel.drivertypes.map((d) => (
                <Knop
                  key={d.id}
                  soort="rand"
                  onClick={() => void voegDriverToe(d.id)}
                  className="!px-2.5 !py-1.5 !text-xs"
                >
                  + {d.naam}
                </Knop>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-inkt">Wat kost het?</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["eenmalig", "Eenmalig", "EUR"],
                  ["jaarlijks", "Per jaar", "EUR"],
                  ["capaciteit", "Verandercapaciteit", "mensmaanden"],
                ] as const
              ).map(([veld, label, eenheid]) => (
                <label key={veld} className="block">
                  <span className="block text-[11px] text-inkt-zacht">
                    {label} <span className="text-inkt-licht">({eenheid})</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className={`${invoerStijl} mt-1 !py-2 !text-sm tabular-nums`}
                    value={kosten[veld] || ""}
                    onChange={(e) =>
                      void bewaar({ kosten: { ...kosten, [veld]: Number(e.target.value) || 0 } })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          {businessCase?.bruto_baat ? (
            <DonkerPaneel bloedt="rechts" className="ml-6 p-4">
              <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 text-white/[0.07]">
                <Halftoon />
              </div>
              <div className="relative">
                <p className="text-xs text-houtskool-zacht">
                  Bruto {formatteerBandbreedte(businessCase.bruto_baat)} per jaar, min{" "}
                  {formatteerEuro(kosten.jaarlijks)} jaarlijkse kosten
                </p>
                <p className="cijfer mt-2 text-3xl text-accent-op-donker">
                  {formatteerBandbreedte(businessCase.netto_baat)}
                </p>
                <p className="mt-1 text-xs text-white">netto per jaar</p>
                <p className="mt-3 border-t border-houtskool-rand pt-2.5 text-[11px] leading-relaxed text-houtskool-zacht">
                  Een bandbreedte, geen bedrag. De onzekerheid staat op{" "}
                  {state.sessie.onzekerheid_pct}% rond de verwachte waarde.
                </p>
              </div>
            </DonkerPaneel>
          ) : null}
        </div>
      ) : null}
    </Kaart>
  );
}
