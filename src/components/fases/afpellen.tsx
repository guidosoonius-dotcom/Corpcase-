"use client";

import { useState } from "react";
import { bedrijfsfunctie, procesmodus } from "@/lib/content";
import { Cijfer, Hoofdregel, Kaart, Knop, Kop, Leeg, Melding, PijlActie, invoerStijl } from "@/components/basis";
import { Processtrook, telOverdrachten } from "@/components/processtrook";
import { opslag } from "@/lib/sessie/api";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { ProcesRij, ProcesStapRij, SessieState } from "@/lib/supabase/types";

/**
 * Fase 2 van de processessie: het proces afpellen op de procesplaat.
 *
 * Iedereen aan tafel bewerkt dezelfde plaat. Dat is een keuze: in de praktijk weet niemand het hele
 * proces, en juist het aanvullen van elkaar — "en dan gaat het naar ons toe, en daar blijft het
 * twee dagen liggen" — is waar deze fase om draait.
 */
export function Afpellen({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const modus = procesmodus(state.sessie.speelmodus);
  const [actiefId, setActiefId] = useState<string | null>(null);
  const [nieuweStap, setNieuweStap] = useState("");
  /**
   * Waar de volgende stap terechtkomt. `null` betekent achteraan.
   *
   * De plusknop bij een stap zet dit; het invoerveld zegt vervolgens waar de stap gaat landen. In
   * een eerdere opzet voegde die knop meteen toe wat er toevallig in het veld stond — en deed hij
   * dus niets als het veld leeg was, zonder dat iemand kon zien waarom.
   */
  const [invoegNa, setInvoegNa] = useState<{ volgorde: number; naam: string } | null>(null);

  const actief =
    state.processen.find((p) => p.id === actiefId) ?? state.processen[0] ?? null;

  if (!actief) {
    return (
      <div className="space-y-5">
        <Hoofdregel links={state.sessie.titel} rechts="Fase 2 · Afpellen" />
        <Kop boven="Fase 2 · Afpellen" titel="Er ligt nog geen proces op tafel" />
        <Leeg>Ga terug naar de proceskeuze en leg eerst een proces op tafel.</Leeg>
      </div>
    );
  }

  const stappen = state.stappen
    .filter((s) => s.proces_id === actief.id && s.soort === "huidig")
    .sort((a, b) => a.volgorde - b.volgorde);

  const overdrachten = telOverdrachten(stappen);
  const voorzet = bedrijfsfunctie(actief.functie_id)?.stappen_voorzet ?? [];
  const teKort = stappen.length > 0 && stappen.length < modus.min_stappen_per_proces;

  async function voegToe() {
    const naam = nieuweStap.trim();
    if (!naam || !actief) return;
    await doe(() =>
      opslag.voegStapToe(identiteit, {
        sessieId: state.sessie.id,
        procesId: actief.id,
        deelnemerId: identiteit.deelnemerId,
        naam,
        voorVolgorde: invoegNa ? invoegNa.volgorde + 1 : undefined,
      }),
    );
    setNieuweStap("");
    setInvoegNa(null);
  }

  /**
   * Verplaatsen schrijft de volledige nieuwe volgorde weg, niet één gewijzigd nummer. Zie de
   * toelichting bij `herordenStappen`: twee mensen die tegelijk schuiven leveren dan twee complete
   * volgordes op in plaats van twee halve die elkaar kruisen.
   */
  async function verplaats(stap: ProcesStapRij, richting: -1 | 1) {
    const huidig = stappen.findIndex((s) => s.id === stap.id);
    const doel = huidig + richting;
    if (huidig < 0 || doel < 0 || doel >= stappen.length) return;

    const nieuw = [...stappen];
    [nieuw[huidig], nieuw[doel]] = [nieuw[doel], nieuw[huidig]];
    await doe(() =>
      opslag.herordenStappen(
        identiteit,
        stap.proces_id,
        nieuw.map((s) => s.id),
      ),
    );
  }

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 2 · Afpellen" />
      <Kop
        boven="Fase 2 · Afpellen"
        titel="Hoe loopt dit proces echt?"
        onder="Zet de stappen neer zoals het in de praktijk gaat, niet zoals het in het handboek staat. Vul elkaar aan."
      />

      {state.processen.length > 1 ? (
        <div className="scroll-x flex gap-1.5">
          {state.processen.map((proces) => (
            <ProcesTab
              key={proces.id}
              proces={proces}
              actief={proces.id === actief.id}
              onKies={() => setActiefId(proces.id)}
            />
          ))}
        </div>
      ) : null}

      <Kaart className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Het proces
        </p>
        <p className="display mt-1 text-xl text-inkt">{actief.titel}</p>
        {actief.aanleiding ? (
          <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">{actief.aanleiding}</p>
        ) : null}

        {/*
         * Het aantal overdrachten is het enige cijfer dat de plaat zelf oplevert, en het vraagt geen
         * extra invoer: het volgt uit wie welke stap doet. Daar zit in processen bijna altijd de
         * wachttijd, dus het staat groot.
         */}
        {stappen.length > 1 ? (
          <div className="mt-4">
            <Cijfer
              waarde={overdrachten}
              label="Overdrachten"
              achtervoegsel="keer"
              toelichting={
                overdrachten === 0
                  ? "Het werk blijft bij dezelfde uitvoerder. Klopt dat?"
                  : "Zo vaak gaat het werk van de één naar de ander. Daar zit meestal de wachttijd."
              }
              toon="accent"
            />
          </div>
        ) : null}
      </Kaart>

      {stappen.length === 0 && voorzet.length > 0 ? (
        <Kaart className="border-dashed p-4">
          <p className="text-sm font-medium text-inkt">Er ligt een procesplaat klaar</p>
          <p className="mt-1 text-xs leading-relaxed text-inkt-zacht">
            {voorzet.length} stappen uit aangeleverd materiaal. Laden zet ze op de plaat; daarna zijn
            het gewone stappen die jullie hernoemen, verplaatsen en weggooien.
          </p>
          <div className="mt-2">
            <Knop
              soort="rand"
              className="!px-3 !py-2 !text-xs"
              onClick={() =>
                void doe(() =>
                  opslag.laadStappenVoorzet(identiteit, actief.id, identiteit.deelnemerId),
                )
              }
            >
              Laad de plaat als startpunt
            </Knop>
          </div>
        </Kaart>
      ) : null}

      {teKort ? (
        <Melding toon="aandacht">
          {stappen.length} van de {modus.min_stappen_per_proces} stappen. Een proces van drie stappen
          is meestal een proces dat nog niet is afgepeld.
        </Melding>
      ) : null}

      <Processtrook
        stappen={stappen}
        deelnemers={state.deelnemers}
        handelingen={{
          onHernoem: (stap, velden) => void doe(() => opslag.wijzigStap(identiteit, stap.id, velden)),
          onVerplaats: (stap, richting) => void verplaats(stap, richting),
          onVerwijder: (stap) => void doe(() => opslag.verwijderStap(identiteit, stap.id)),
          onVoegToeNa: (stap) => {
            setInvoegNa({ volgorde: stap.volgorde, naam: stap.naam });
            document.getElementById("nieuwe-stap")?.focus();
          },
        }}
      />

      <Kaart className="p-3">
        <label className="block text-sm font-medium text-inkt" htmlFor="nieuwe-stap">
          Stap toevoegen
        </label>
        {invoegNa ? (
          <p className="mt-0.5 text-xs font-medium text-accent-diep">
            Komt na &ldquo;{invoegNa.naam}&rdquo;.{" "}
            <button type="button" onClick={() => setInvoegNa(null)} className="underline">
              Toch achteraan
            </button>
          </p>
        ) : null}
        <div className="mt-1.5 flex gap-2">
          <input
            id="nieuwe-stap"
            className={invoerStijl}
            value={nieuweStap}
            onChange={(e) => setNieuweStap(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void voegToe();
            }}
            placeholder="Wat gebeurt er dan?"
          />
          <Knop onClick={() => void voegToe()} disabled={!nieuweStap.trim()}>
            Toevoegen
          </Knop>
        </div>
        {invoegNa ? null : (
          <p className="mt-1.5 text-xs text-inkt-licht">
            Komt achteraan te staan. Met de plusknop bij een stap kies je een plek middenin.
          </p>
        )}
      </Kaart>

      <PijlActie
        label="Volgende"
        tekst={
          stappen.length === 0
            ? "Zet eerst de stappen neer"
            : "Stel vast wat er met dit proces aan de hand is"
        }
      />
    </div>
  );
}

function ProcesTab({
  proces,
  actief,
  onKies,
}: {
  proces: ProcesRij;
  actief: boolean;
  onKies: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onKies}
      aria-current={actief ? "true" : undefined}
      className={`shrink-0 rounded-kaart border px-3 py-2 text-xs font-medium transition-colors ${
        actief
          ? "border-accent bg-accent-zacht text-accent-diep"
          : "border-rand bg-vlak text-inkt-zacht hover:border-rand-sterk"
      }`}
    >
      {proces.titel}
    </button>
  );
}
