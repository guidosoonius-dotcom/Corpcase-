"use client";

import { useState } from "react";
import { speelmodus, usecase as bibliotheekKaart, waardeModel } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { alleBeelden, type UsecaseBeeld } from "@/lib/sessie/afgeleid";
import { driversUitBibliotheek, formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import type { SessieState, Waardemodus } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import {
  DonkerPaneel,
  Etiket,
  Hoofdregel,
  Kaart,
  Knop,
  Kop,
  Leeg,
  Melding,
  Schaal,
  invoerStijl,
} from "@/components/basis";
import { Halftoon } from "@/components/decoratie";

/**
 * Fase 3: wat is dit waard?
 *
 * Het team kiest per use case zelf de diepgang. De scorekaart is snel en eerlijk over zijn eigen
 * grofheid; de business case rekent door met de kengetallen van de corporatie. Wat beide gemeen
 * hebben: de niet-financiële waarde blijft altijd apart zichtbaar, zodat het spel niet alleen
 * kostenbesparingen beloont.
 */
export function Waardebepaling({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const beelden = alleBeelden(state);
  const modus = speelmodus(state.sessie.speelmodus);
  const doorgerekend = beelden.filter((b) => b.businessCase?.volledig).length;
  const tekort = modus.businesscase_verplicht_aantal - doorgerekend;

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 3 · Waardebepaling" />
      <Kop
        boven="Fase 3 · Waardebepaling"
        titel="Wat levert het op?"
        onder="Per use case kiest het team: snel scoren, of echt doorrekenen. Beide mag; niet invullen niet."
      />

      {modus.businesscase_verplicht_aantal > 0 ? (
        tekort > 0 ? (
          <Melding>
            Reken er minstens {modus.businesscase_verplicht_aantal} helemaal door. Er{" "}
            {doorgerekend === 1 ? "is er één" : `zijn er ${doorgerekend}`} klaar, nog {tekort} te
            gaan.
          </Melding>
        ) : (
          <Melding toon="accent">
            {doorgerekend} business cases doorgerekend. Genoeg om de prioritering op te baseren.
          </Melding>
        )
      ) : null}

      {beelden.length === 0 ? (
        <Leeg>Er liggen nog geen use cases op tafel.</Leeg>
      ) : (
        <ul className="space-y-3">
          {beelden.map((beeld) => (
            <li key={beeld.usecase.id}>
              <Waarderen state={state} identiteit={identiteit} doe={doe} beeld={beeld} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** De velden die je bij één use case kunt bijwerken; de sleutels komen uit de aanroeper. */
type WaarderingVelden = Omit<
  Parameters<typeof opslag.bewaarWaardering>[1],
  "sessieId" | "usecaseId" | "deelnemerId"
>;

function Waarderen({
  state,
  identiteit,
  doe,
  beeld,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  beeld: UsecaseBeeld;
}) {
  const [open, setOpen] = useState(false);
  const waardering = beeld.waardering;
  const modus: Waardemodus = waardering?.modus ?? "scorekaart";

  async function bewaar(velden: WaarderingVelden) {
    await doe(() =>
      opslag.bewaarWaardering(identiteit, {
        sessieId: state.sessie.id,
        usecaseId: beeld.usecase.id,
        deelnemerId: identiteit.deelnemerId,
        ...velden,
      }),
    );
  }

  return (
    <Kaart aandacht={beeld.volledigheid >= 1} className="overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-snug text-inkt">
            {beeld.usecase.titel}
          </h3>
          <Etiket toon={beeld.volledigheid >= 1 ? "waarde" : "aandacht"}>
            {Math.round(beeld.volledigheid * 100)}%
          </Etiket>
        </div>

        <div className="mt-2">
          <Samenvatting beeld={beeld} />
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2.5 text-xs font-medium text-accent-diep hover:underline"
        >
          {open ? "Inklappen" : "Waarderen"}
        </button>
      </div>

      {open ? (
        <div className="space-y-5 border-t border-rand bg-papier px-4 py-4">
          <div>
            <p className="text-xs font-semibold text-inkt">Hoe diep gaan we?</p>
            <div className="mt-1.5 flex gap-1.5">
              {(
                [
                  ["scorekaart", "Snel scoren"],
                  ["businesscase", "Doorrekenen"],
                ] as const
              ).map(([id, label]) => (
                <Knop
                  key={id}
                  soort={modus === id ? "primair" : "rand"}
                  onClick={() => void bewaar({ modus: id })}
                  className="flex-1"
                >
                  {label}
                </Knop>
              ))}
            </div>
          </div>

          {modus === "scorekaart" ? (
            <Scorekaart waardering={waardering} bewaar={bewaar} />
          ) : (
            <BusinessCaseInvoer state={state} beeld={beeld} bewaar={bewaar} />
          )}

          <Dimensies
            titel="Waarde die niet in euro's zit"
            dimensies={waardeModel.kwalitatieve_dimensies}
            scores={waardering?.kwalitatief ?? {}}
            onZet={(id, n) =>
              void bewaar({ kwalitatief: { ...(waardering?.kwalitatief ?? {}), [id]: n } })
            }
          />

          <Dimensies
            titel="Haalbaarheid"
            dimensies={waardeModel.haalbaarheidsdimensies}
            scores={waardering?.haalbaarheid ?? {}}
            onZet={(id, n) =>
              void bewaar({ haalbaarheid: { ...(waardering?.haalbaarheid ?? {}), [id]: n } })
            }
          />
        </div>
      ) : null}
    </Kaart>
  );
}

function Samenvatting({ beeld }: { beeld: UsecaseBeeld }) {
  const bc = beeld.businessCase;

  if (bc?.netto_baat) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-sm font-semibold tabular-nums ${
            (bc.netto_baat?.verwacht ?? 0) >= 0 ? "text-waarde" : "text-risico"
          }`}
        >
          {formatteerBandbreedte(bc.netto_baat)} per jaar
        </span>
        {bc.terugverdientijd_maanden ? (
          <Etiket>terugverdiend in {Math.round(bc.terugverdientijd_maanden)} maanden</Etiket>
        ) : null}
        {!bc.volledig ? <Etiket toon="aandacht">nog niet compleet</Etiket> : null}
      </div>
    );
  }

  if (beeld.positie) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Etiket toon="accent">waarde {beeld.positie.waarde.toFixed(1)} / 5</Etiket>
        <Etiket>haalbaarheid {beeld.positie.haalbaarheid.toFixed(1)} / 5</Etiket>
      </div>
    );
  }

  return <p className="text-xs text-inkt-licht">Nog niet gewaardeerd.</p>;
}

function Scorekaart({
  waardering,
  bewaar,
}: {
  waardering: UsecaseBeeld["waardering"];
  bewaar: (velden: { scorekaart: Record<string, number> }) => Promise<void>;
}) {
  const scores = waardering?.scorekaart ?? {};
  return (
    <div className="space-y-3">
      {waardeModel.scorekaart_dimensies.map((d) => (
        <div key={d.id}>
          <p className="text-xs font-medium text-inkt">{d.naam}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-inkt-licht">{d.vraag}</p>
          <div className="mt-1.5">
            <Schaal
              waarde={scores[d.id] ?? null}
              onKies={(n) => void bewaar({ scorekaart: { ...scores, [d.id]: n } })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Een groep dimensies om op te scoren.
 *
 * Alleen de kerndimensies staan open. Tien schaalrijen achter elkaar is op een telefoon te veel
 * tikwerk, zeker als een team vijftien use cases langsgaat; wie meer diepgang wil, klapt de rest
 * uit. Ingevulde niet-kerndimensies blijven wel meteen zichtbaar, anders zou werk lijken te
 * verdwijnen.
 */
function Dimensies({
  titel,
  dimensies,
  scores,
  onZet,
}: {
  titel: string;
  dimensies: { id: string; naam: string; vraag: string; kern?: boolean }[];
  scores: Record<string, number>;
  onZet: (id: string, waarde: number) => void;
}) {
  const [allesTonen, setAllesTonen] = useState(false);

  const extra = dimensies.filter((d) => !d.kern);
  const zichtbaar = allesTonen
    ? dimensies
    : dimensies.filter((d) => d.kern || scores[d.id] !== undefined);
  const verborgen = dimensies.length - zichtbaar.length;

  return (
    <div>
      <p className="text-xs font-semibold text-inkt">{titel}</p>
      <div className="mt-2 space-y-3">
        {zichtbaar.map((d) => (
          <div key={d.id}>
            <p className="text-xs font-medium text-inkt">{d.naam}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-inkt-licht">{d.vraag}</p>
            <div className="mt-1.5">
              <Schaal waarde={scores[d.id] ?? null} onKies={(n) => onZet(d.id, n)} />
            </div>
          </div>
        ))}
      </div>

      {extra.length > 0 && verborgen > 0 ? (
        <button
          type="button"
          onClick={() => setAllesTonen(true)}
          className="mt-2 text-xs font-medium text-accent-diep hover:underline"
        >
          Nog {verborgen} {verborgen === 1 ? "dimensie" : "dimensies"} tonen
        </button>
      ) : null}
    </div>
  );
}

/**
 * De doorrekening. Elke driver toont zijn eigen formule en de velden die nog ontbreken, zodat
 * duidelijk is waarom er nog geen bedrag staat. Een leeg veld levert nooit stilzwijgend nul op.
 */
function BusinessCaseInvoer({
  state,
  beeld,
  bewaar,
}: {
  state: SessieState;
  beeld: UsecaseBeeld;
  bewaar: (velden: {
    drivers?: { type: string; waarden: Record<string, number | null> }[];
    kosten?: { eenmalig: number; jaarlijks: number; capaciteit: number };
  }) => Promise<void>;
}) {
  const waardering = beeld.waardering;
  const drivers = waardering?.drivers ?? [];
  const kosten = waardering?.kosten ?? { eenmalig: 0, jaarlijks: 0, capaciteit: 0 };
  const kaart = beeld.usecase.bibliotheek_id
    ? bibliotheekKaart(beeld.usecase.bibliotheek_id)
    : undefined;

  async function startVanuitBibliotheek() {
    if (!kaart) return;
    await bewaar({
      drivers: driversUitBibliotheek(kaart).map((d) => ({
        type: d.type,
        waarden: Object.fromEntries(
          Object.entries(d.waarden).map(([veld, waarde]) => [veld, waarde ?? null]),
        ),
      })),
      kosten: kaart.kosten,
    });
  }

  async function voegDriverToe(type: string) {
    const definitie = waardeModel.drivertypes.find((d) => d.id === type);
    if (!definitie) return;

    // Wat we uit het corporatieprofiel weten, staat meteen ingevuld; de rest is aan het team.
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
    <div className="space-y-4">
      {drivers.length === 0 && kaart ? (
        <div>
          <Knop soort="rand" onClick={startVanuitBibliotheek}>
            Begin met de ordegroottes uit de bibliotheek
          </Knop>
          <p className="mt-1.5 text-[11px] leading-relaxed text-inkt-licht">
            Dat zijn aannames, geen cijfers van jullie. Pas ze aan zodra iemand aan tafel het beter
            weet — dat gesprek ís de oefening.
          </p>
        </div>
      ) : null}

      {drivers.map((driver, index) => {
        const definitie = waardeModel.drivertypes.find((d) => d.id === driver.type);
        if (!definitie) return null;
        const uitkomst = beeld.businessCase?.drivers[index];

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

      {beeld.businessCase?.bruto_baat ? (
        <DonkerPaneel bloedt="rechts" className="ml-6 p-4">
          <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 text-white/[0.07]">
            <Halftoon />
          </div>
          <div className="relative">
            <p className="text-xs text-houtskool-zacht">
              Bruto {formatteerBandbreedte(beeld.businessCase.bruto_baat)} per jaar, min{" "}
              {formatteerEuro(kosten.jaarlijks)} jaarlijkse kosten
            </p>
            <p className="cijfer mt-2 text-3xl text-accent-op-donker">
              {formatteerBandbreedte(beeld.businessCase.netto_baat)}
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
  );
}
