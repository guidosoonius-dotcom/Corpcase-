"use client";

import { useMemo, useState } from "react";
import { realiteitschecks, speelmodus } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { alleBeelden, budgetStand, type UsecaseBeeld } from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import type { CheckBesluit, SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import {
  Cijfer,
  DonkerPaneel,
  Hoofdregel,
  Etiket,
  Kaart,
  Knop,
  Kop,
  Leeg,
  invoerStijl,
} from "@/components/basis";
import { Halftoon } from "@/components/decoratie";
import { KwadrantAdvies, Matrix } from "@/components/matrix";

/**
 * Fase 4: kiezen.
 *
 * Drie stappen die elkaar opvolgen. Eerst het beeld: waar staat alles op de matrix. Dan de
 * echte keuze: het budget is begrensd in geld én in verandercapaciteit, dus niet alles past.
 * Tot slot de realiteitschecks, die toetsen of de keuze standhoudt als het tegenzit.
 */
export function Prioritering({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [gekozen, setGekozen] = useState<string | null>(null);
  const beelden = alleBeelden(state);
  const stand = budgetStand(state);

  const gesorteerd = useMemo(
    () =>
      [...beelden].sort((a, b) => (b.positie?.waarde ?? 0) - (a.positie?.waarde ?? 0)),
    [beelden],
  );

  return (
    <div className="space-y-6">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 4 · Prioritering" />
      <Kop
        boven="Fase 4 · Prioritering"
        titel="Wat doen we wél?"
        onder="Het budget is begrensd, in geld en in wat de organisatie aankan. Kiezen betekent hier dus ook iets niet doen."
      />

      {/*
        Op een breed scherm hoeft de matrix niet over de volle breedte uit te rekken tot een
        laag, plat vlak: ernaast is precies genoeg ruimte voor het budgetpaneel, net als bij
        Opbrengst en de beamer — twee panelen die toch al bij elkaar horen.
      */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5">
        <Matrix beelden={beelden} geselecteerd={gekozen} onKies={setGekozen} />
        <div className="mt-6 lg:mt-0">
          <Budgetbalk stand={stand} state={state} />
        </div>
      </div>

      {beelden.length === 0 ? (
        <Leeg>Er is nog niets om te prioriteren.</Leeg>
      ) : (
        <ul className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {gesorteerd.map((beeld) => (
            <li key={beeld.usecase.id}>
              <Toewijzen
                state={state}
                identiteit={identiteit}
                doe={doe}
                beeld={beeld}
                uitgelicht={gekozen === beeld.usecase.id}
              />
            </li>
          ))}
        </ul>
      )}

      <Realiteitschecks state={state} identiteit={identiteit} doe={doe} />
    </div>
  );
}

function Budgetbalk({
  stand,
  state,
}: {
  stand: ReturnType<typeof budgetStand>;
  state: SessieState;
}) {
  const regels = [
    {
      id: "geld",
      label: "Investeringsruimte",
      besteed: stand.besteed.geld_eur,
      totaal: state.sessie.budget_geld,
      over: stand.overschreden.geld,
      toon: (n: number) => formatteerEuro(n),
    },
    {
      id: "capaciteit",
      label: "Verandercapaciteit",
      besteed: stand.besteed.verandercapaciteit_mensmaanden,
      totaal: state.sessie.budget_capaciteit,
      over: stand.overschreden.capaciteit,
      toon: (n: number) => `${n.toLocaleString("nl-NL")} mensmaanden`,
    },
  ];

  // Het percentage dat nog vrij is, als het getal dat het gesprek stuurt.
  const vrijPercentage = Math.round(
    (1 -
      Math.min(
        state.sessie.budget_geld > 0 ? stand.besteed.geld_eur / state.sessie.budget_geld : 0,
        1,
      )) *
      100,
  );

  return (
    <DonkerPaneel bloedt="links" className="p-5">
      <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 text-white/[0.07]">
            <Halftoon />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <h2 className="display text-xl text-white">Wat past er nog in?</h2>
          <Cijfer
            waarde={vrijPercentage}
            achtervoegsel="%"
            toon={
              stand.overschreden.geld || stand.overschreden.capaciteit ? "gedempt" : "op-donker"
            }
            formaat="groot"
          />
        </div>

        <div className="mt-4 space-y-3.5">
          {regels.map((regel) => {
            const aandeel = regel.totaal > 0 ? Math.min(regel.besteed / regel.totaal, 1) : 0;
            return (
              <div key={regel.id}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-houtskool-zacht">{regel.label}</span>
                  <span
                    className={`font-medium tabular-nums ${
                      regel.over ? "text-accent-op-donker" : "text-white"
                    }`}
                  >
                    {regel.toon(regel.besteed)} van {regel.toon(regel.totaal)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-houtskool-rand">
                  <div
                    className={`h-full rounded-full transition-all ${
                      regel.over ? "bg-accent-op-donker" : "bg-accent"
                    }`}
                    style={{ width: `${aandeel * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {stand.overschreden.geld || stand.overschreden.capaciteit ? (
          <p className="mt-4 border-t border-houtskool-rand pt-3 text-xs leading-relaxed text-accent-op-donker">
            Jullie zitten over het budget. Dat mag je zo laten, maar dan is dit de plek waar je
            uitlegt waarom — of je haalt er iets af.
          </p>
        ) : null}
      </div>
    </DonkerPaneel>
  );
}

function Toewijzen({
  state,
  identiteit,
  doe,
  beeld,
  uitgelicht,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  beeld: UsecaseBeeld;
  uitgelicht: boolean;
}) {
  const allocatie = state.allocaties.find((a) => a.usecase_id === beeld.usecase.id);
  const inPortfolio = beeld.usecase.status === "portfolio";
  const afgevallen = beeld.usecase.status === "afgevallen";

  async function zetStatus(status: "portfolio" | "afgevallen" | "kandidaat") {
    await doe(() => opslag.zetUsecaseStatus(identiteit, beeld.usecase.id, status));

    // Wie iets uit het portfolio haalt, geeft ook zijn budget terug: anders blijft het geld
    // vastzitten aan iets dat niet meer meedoet.
    if (status !== "portfolio" && allocatie) {
      await doe(() =>
        opslag.bewaarAllocatie(identiteit, {
          sessieId: state.sessie.id,
          usecaseId: beeld.usecase.id,
          geldEur: 0,
          capaciteitMensmaanden: 0,
        }),
      );
    }

    // Bij opnemen in het portfolio is de eigen kostenraming het logische startpunt.
    if (status === "portfolio" && !allocatie && beeld.waardering) {
      await doe(() =>
        opslag.bewaarAllocatie(identiteit, {
          sessieId: state.sessie.id,
          usecaseId: beeld.usecase.id,
          geldEur: beeld.waardering!.kosten.eenmalig,
          capaciteitMensmaanden: beeld.waardering!.kosten.capaciteit,
        }),
      );
    }
  }

  async function zetAllocatie(veld: "geldEur" | "capaciteitMensmaanden", waarde: number) {
    await doe(() =>
      opslag.bewaarAllocatie(identiteit, {
        sessieId: state.sessie.id,
        usecaseId: beeld.usecase.id,
        geldEur: veld === "geldEur" ? waarde : (allocatie?.geld_eur ?? 0),
        capaciteitMensmaanden:
          veld === "capaciteitMensmaanden"
            ? waarde
            : (allocatie?.capaciteit_mensmaanden ?? 0),
      }),
    );
  }

  return (
    <Kaart aandacht={uitgelicht || inPortfolio} className={afgevallen ? "opacity-60" : ""}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-snug text-inkt">
            {beeld.usecase.titel}
          </h3>
          {beeld.kwadrant ? (
            <Etiket toon={beeld.kwadrant === "quick-wins" ? "waarde" : "neutraal"}>
              {beeld.kwadrant === "quick-wins"
                ? "snel doen"
                : beeld.kwadrant === "strategisch"
                  ? "strategisch"
                  : beeld.kwadrant === "vulwerk"
                    ? "meenemen"
                    : "niet nu"}
            </Etiket>
          ) : (
            <Etiket toon="aandacht">niet gewaardeerd</Etiket>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {beeld.businessCase?.netto_baat ? (
            <span
              className={`text-xs font-medium tabular-nums ${
                (beeld.businessCase.netto_baat?.verwacht ?? 0) >= 0 ? "text-waarde" : "text-risico"
              }`}
            >
              {formatteerBandbreedte(beeld.businessCase.netto_baat)} per jaar
            </span>
          ) : null}
          {beeld.kwadrant ? <KwadrantAdvies kwadrant={beeld.kwadrant} /> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Knop
            soort={inPortfolio ? "primair" : "rand"}
            onClick={() => void zetStatus(inPortfolio ? "kandidaat" : "portfolio")}
            className="!px-3 !py-2 !text-xs"
          >
            {inPortfolio ? "In het portfolio" : "Opnemen"}
          </Knop>
          <Knop
            soort={afgevallen ? "gevaar" : "stil"}
            onClick={() => void zetStatus(afgevallen ? "kandidaat" : "afgevallen")}
            className="!px-3 !py-2 !text-xs"
          >
            {afgevallen ? "Afgevallen" : "Laten vallen"}
          </Knop>
        </div>

        {inPortfolio ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="block text-[11px] text-inkt-zacht">
                Toegekend budget (EUR)
              </span>
              <input
                type="number"
                inputMode="decimal"
                className={`${invoerStijl} mt-1 !py-2 !text-sm tabular-nums`}
                value={allocatie?.geld_eur || ""}
                onChange={(e) => void zetAllocatie("geldEur", Number(e.target.value) || 0)}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-inkt-zacht">
                Verandercapaciteit (mensmaanden)
              </span>
              <input
                type="number"
                inputMode="decimal"
                className={`${invoerStijl} mt-1 !py-2 !text-sm tabular-nums`}
                value={allocatie?.capaciteit_mensmaanden || ""}
                onChange={(e) =>
                  void zetAllocatie("capaciteitMensmaanden", Number(e.target.value) || 0)
                }
              />
            </label>
          </div>
        ) : null}
      </div>
    </Kaart>
  );
}

/**
 * De realiteitschecks. Welke checks je krijgt hangt af van de speelduur, maar de keuze is
 * deterministisch op basis van het sessie-id: bij een herstart krijg je dezelfde scenario's,
 * zodat een sessie die halverwege wordt hervat niet ineens andere vragen stelt.
 */
function Realiteitschecks({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const modus = speelmodus(state.sessie.speelmodus);

  const gekozenChecks = useMemo(() => {
    const zaad = [...state.sessie.id].reduce((som, teken) => som + teken.charCodeAt(0), 0);
    const gesorteerd = [...realiteitschecks.checks].sort((a, b) => a.id.localeCompare(b.id));
    return Array.from({ length: modus.aantal_realiteitschecks }, (_, i) => {
      return gesorteerd[(zaad + i * 3) % gesorteerd.length];
    });
  }, [state.sessie.id, modus.aantal_realiteitschecks]);

  if (gekozenChecks.length === 0) return null;

  return (
    <section>
      <h2 className="display text-lg text-inkt">Realiteitscheck</h2>
      <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
        Houdt jullie keuze stand als het tegenzit? Aanpassen mag, handhaven ook — alleen niet
        beslissen is geen optie.
      </p>

      <ul className="mt-3 space-y-2.5">
        {gekozenChecks.map((check) => (
          <li key={check.id}>
            <Check state={state} identiteit={identiteit} doe={doe} check={check} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Check({
  state,
  identiteit,
  doe,
  check,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  check: (typeof realiteitschecks.checks)[number];
}) {
  const bestaand = state.besluiten.find((b) => b.check_id === check.id);
  const [motivatie, setMotivatie] = useState(bestaand?.motivatie ?? "");

  async function beslis(besluit: CheckBesluit) {
    await doe(() =>
      opslag.bewaarBesluit(identiteit, {
        sessieId: state.sessie.id,
        checkId: check.id,
        besluit,
        motivatie: motivatie.trim(),
      }),
    );
  }

  return (
    <Kaart aandacht={Boolean(bestaand)} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug text-inkt">{check.titel}</h3>
        {bestaand ? (
          <Etiket toon={bestaand.besluit === "aanpassen" ? "aandacht" : "waarde"}>
            {bestaand.besluit === "aanpassen" ? "aangepast" : "gehandhaafd"}
          </Etiket>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">{check.scenario}</p>

      <textarea
        className={`${invoerStijl} mt-3 min-h-16 !text-sm`}
        value={motivatie}
        onChange={(e) => setMotivatie(e.target.value)}
        placeholder="Wat is jullie besluit, en waarom?"
      />

      <div className="mt-2 flex gap-1.5">
        <Knop
          soort={bestaand?.besluit === "aanpassen" ? "primair" : "rand"}
          onClick={() => void beslis("aanpassen")}
          className="flex-1 !text-xs"
        >
          We passen het portfolio aan
        </Knop>
        <Knop
          soort={bestaand?.besluit === "handhaven" ? "primair" : "rand"}
          onClick={() => void beslis("handhaven")}
          className="flex-1 !text-xs"
        >
          We handhaven, en dit is waarom
        </Knop>
      </div>
    </Kaart>
  );
}
