"use client";

import { useState } from "react";
import { manoeuvre as manoeuvreContent, procesmodus, spoor as spoorContent } from "@/lib/content";
import { ProcesTabs, Processtrook } from "@/components/processtrook";
import {
  Cijfer,
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
import { opslag } from "@/lib/sessie/api";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { ProcesStapRij, ProcesVerbeteringRij, SessieState } from "@/lib/supabase/types";

/**
 * Fase 4 van de processessie: het herontwerp, langs het spoor dat in de diagnose is vastgelegd.
 *
 * Geen extra `DonkerPaneel` hier: de plaat zelf is op dit scherm de beslissingsplek, net als in
 * `Afpellen` — een tweede paneel zou de regel uit `docs/ONTWERP.md` (één paneel per scherm, op de
 * plek van de beslissing) juist doorbreken in plaats van volgen.
 */
export function Herontwerp({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [actiefId, setActiefId] = useState<string | null>(null);

  const actief = state.processen.find((p) => p.id === actiefId) ?? state.processen[0] ?? null;

  if (!actief) {
    return (
      <div className="space-y-5">
        <Hoofdregel links={state.sessie.titel} rechts="Fase 4 · Herontwerp" />
        <Kop boven="Fase 4 · Herontwerp" titel="Er ligt nog geen proces op tafel" />
        <Leeg>Ga terug naar de proceskeuze en leg eerst een proces op tafel.</Leeg>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 4 · Herontwerp" />
      <Kop
        boven="Fase 4 · Herontwerp"
        titel="Hoe wordt dit proces beter?"
        onder={
          actief.spoor
            ? (spoorContent(actief.spoor)?.vraag ?? "")
            : "Er is nog geen spoor vastgelegd bij de diagnose."
        }
      />

      <ProcesTabs processen={state.processen} actiefId={actief.id} onKies={setActiefId} />

      {actief.spoor === "iteratief" ? (
        <Iteratief state={state} identiteit={identiteit} doe={doe} proces={actief.id} />
      ) : actief.spoor === "nieuw" ? (
        <NewPractice state={state} identiteit={identiteit} doe={doe} proces={actief.id} />
      ) : (
        <Melding>
          {actief.spoor === "niet-nu"
            ? "Dit proces is bewust niet aan de beurt. " +
              (actief.spoor_motivatie || "Er is geen motivatie vastgelegd.")
            : "Ga terug naar de diagnose en leg eerst een spoor vast."}
        </Melding>
      )}

      <PijlActie label="Volgende" tekst="Reken de verbeteringen door" />
    </div>
  );
}

// Iteratief spoor -------------------------------------------------------------

const MANOEUVRE_TOON: Record<string, "waarde" | "aandacht" | "neutraal"> = {
  voorkomen: "waarde",
  schrappen: "waarde",
  automatiseren: "aandacht",
};

function Iteratief({
  state,
  identiteit,
  doe,
  proces,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  proces: string;
}) {
  const modus = procesmodus(state.sessie.speelmodus);
  const [nieuweStap, setNieuweStap] = useState("");
  const [invoegNa, setInvoegNa] = useState<{ volgorde: number; naam: string } | null>(null);

  const stappen = state.stappen
    .filter((s) => s.proces_id === proces && s.soort === "huidig")
    .sort((a, b) => a.volgorde - b.volgorde);
  const verbeteringen = state.verbeteringen.filter((v) => v.proces_id === proces);

  async function voegToe() {
    const naam = nieuweStap.trim();
    if (!naam) return;
    await doe(() =>
      opslag.voegStapToe(identiteit, {
        sessieId: state.sessie.id,
        procesId: proces,
        deelnemerId: identiteit.deelnemerId,
        naam,
        voorVolgorde: invoegNa ? invoegNa.volgorde + 1 : undefined,
      }),
    );
    setNieuweStap("");
    setInvoegNa(null);
  }

  async function verplaats(stap: ProcesStapRij, richting: -1 | 1) {
    const huidig = stappen.findIndex((s) => s.id === stap.id);
    const doel = huidig + richting;
    if (huidig < 0 || doel < 0 || doel >= stappen.length) return;
    const nieuw = [...stappen];
    [nieuw[huidig], nieuw[doel]] = [nieuw[doel], nieuw[huidig]];
    await doe(() => opslag.herordenStappen(identiteit, proces, nieuw.map((s) => s.id)));
  }

  return (
    <>
      <Processtrook
        stappen={stappen}
        deelnemers={state.deelnemers}
        handelingen={{
          onHernoem: (stap, velden) => void doe(() => opslag.wijzigStap(identiteit, stap.id, velden)),
          onVerplaats: (stap, richting) => void verplaats(stap, richting),
          onVerwijder: (stap) => void doe(() => opslag.verwijderStap(identiteit, stap.id)),
          onVoegToeNa: (stap) => {
            setInvoegNa({ volgorde: stap.volgorde, naam: stap.naam });
            document.getElementById("nieuwe-stap-herontwerp")?.focus();
          },
        }}
      />

      <Kaart className="p-3">
        <label className="block text-sm font-medium text-inkt" htmlFor="nieuwe-stap-herontwerp">
          Stap toevoegen
        </label>
        {invoegNa ? (
          <p className="mt-0.5 text-xs font-medium text-accent-diep">
            Komt na &ldquo;{invoegNa.naam}&rdquo;.{" "}
            <button type="button" onClick={() => setInvoegNa(null)} className="!min-h-0 underline">
              Toch achteraan
            </button>
          </p>
        ) : null}
        <div className="mt-1.5 flex gap-2">
          <input
            id="nieuwe-stap-herontwerp"
            className={invoerStijl}
            value={nieuweStap}
            onChange={(e) => setNieuweStap(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void voegToe()}
            placeholder="Wat gebeurt er dan?"
          />
          <Knop onClick={() => void voegToe()} disabled={!nieuweStap.trim()}>
            Toevoegen
          </Knop>
        </div>
      </Kaart>

      {verbeteringen.length > 0 ? (
        <Cijfer
          waarde={verbeteringen.length}
          label="Verbeteringen"
          achtervoegsel="genoteerd"
          toon="accent"
        />
      ) : null}

      <VerbeteringForm
        state={state}
        identiteit={identiteit}
        doe={doe}
        proces={proces}
        stappen={stappen}
        manoeuvreIds={modus.manoeuvres}
      />

      {verbeteringen.length > 0 ? (
        <div className="space-y-2">
          {verbeteringen.map((v) => (
            <VerbeteringKaart
              key={v.id}
              verbetering={v}
              stapNaam={stappen.find((s) => s.id === v.stap_id)?.naam}
              onVerwijder={() => void doe(() => opslag.verwijderVerbetering(identiteit, v.id))}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function VerbeteringForm({
  state,
  identiteit,
  doe,
  proces,
  stappen,
  manoeuvreIds,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  proces: string;
  stappen: ProcesStapRij[];
  manoeuvreIds: string[];
}) {
  const [stapId, setStapId] = useState(stappen[0]?.id ?? "");
  const [manoeuvre, setManoeuvre] = useState<string | null>(null);
  const [titel, setTitel] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [usecaseRef, setUsecaseRef] = useState("");

  const portfolio = state.sessie.herkomst?.portfolio ?? [];

  async function bewaar() {
    if (!titel.trim() || !stapId) return;
    await doe(() =>
      opslag.voegVerbeteringToe(identiteit, {
        sessieId: state.sessie.id,
        procesId: proces,
        deelnemerId: identiteit.deelnemerId,
        stapId,
        manoeuvre,
        titel: titel.trim(),
        toelichting: toelichting.trim(),
        usecaseRef: usecaseRef || null,
      }),
    );
    setTitel("");
    setToelichting("");
    setManoeuvre(null);
    setUsecaseRef("");
  }

  if (stappen.length === 0) return null;

  return (
    <Kaart className="space-y-2.5 p-4">
      <p className="text-sm font-medium text-inkt">Verbetering noteren</p>

      <select
        className={invoerStijl}
        value={stapId}
        onChange={(e) => setStapId(e.target.value)}
        aria-label="Bij welke stap?"
      >
        {stappen.map((s) => (
          <option key={s.id} value={s.id}>
            {s.naam}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1.5">
        {manoeuvreIds.map((id) => (
          <Knop
            key={id}
            soort={manoeuvre === id ? "primair" : "rand"}
            className="!px-3 !py-2 !text-xs"
            onClick={() => setManoeuvre(id === manoeuvre ? null : id)}
          >
            {manoeuvreContent(id)?.naam ?? id}
          </Knop>
        ))}
      </div>

      <input
        className={`${invoerStijl} !text-sm`}
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Wat gaat er veranderen?"
      />
      <textarea
        className={`${invoerStijl} min-h-14 !text-sm`}
        value={toelichting}
        onChange={(e) => setToelichting(e.target.value)}
        placeholder="Toelichting (optioneel)"
      />

      {portfolio.length > 0 ? (
        <select
          className={invoerStijl}
          value={usecaseRef}
          onChange={(e) => setUsecaseRef(e.target.value)}
          aria-label="Koppel een use case uit de vorige sessie (optioneel)"
        >
          <option value="">Geen use case koppelen</option>
          {portfolio.map((u) => (
            <option key={u.id} value={u.id}>
              {u.titel}
            </option>
          ))}
        </select>
      ) : null}

      <Knop soort="rand" className="!px-3 !py-2 !text-xs" onClick={() => void bewaar()} disabled={!titel.trim()}>
        Verbetering toevoegen
      </Knop>
    </Kaart>
  );
}

function VerbeteringKaart({
  verbetering,
  stapNaam,
  onVerwijder,
}: {
  verbetering: ProcesVerbeteringRij;
  stapNaam?: string;
  onVerwijder: () => void;
}) {
  return (
    <Kaart className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {verbetering.manoeuvre ? (
              <Etiket toon={MANOEUVRE_TOON[verbetering.manoeuvre] ?? "neutraal"}>
                {verbetering.manoeuvre}
              </Etiket>
            ) : null}
            {stapNaam ? <span className="text-xs text-inkt-licht">bij {stapNaam}</span> : null}
          </div>
          <p className="mt-1 text-sm font-medium leading-snug text-inkt">{verbetering.titel}</p>
          {verbetering.toelichting ? (
            <p className="mt-1 text-xs leading-relaxed text-inkt-zacht">{verbetering.toelichting}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onVerwijder}
          className="shrink-0 text-xs font-medium text-accent-diep hover:underline"
        >
          Verwijderen
        </button>
      </div>
    </Kaart>
  );
}

// New-practice-spoor -----------------------------------------------------------

function NewPractice({
  state,
  identiteit,
  doe,
  proces,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  proces: string;
}) {
  const [nieuweStap, setNieuweStap] = useState("");

  const huidigeStappen = state.stappen
    .filter((s) => s.proces_id === proces && s.soort === "huidig")
    .sort((a, b) => a.volgorde - b.volgorde);
  const nieuweStappen = state.stappen
    .filter((s) => s.proces_id === proces && s.soort === "nieuw")
    .sort((a, b) => a.volgorde - b.volgorde);

  async function voegToe() {
    const naam = nieuweStap.trim();
    if (!naam) return;
    await doe(() =>
      opslag.voegStapToe(identiteit, {
        sessieId: state.sessie.id,
        procesId: proces,
        deelnemerId: identiteit.deelnemerId,
        naam,
        soort: "nieuw",
      }),
    );
    setNieuweStap("");
  }

  async function verplaats(stap: ProcesStapRij, richting: -1 | 1) {
    const huidig = nieuweStappen.findIndex((s) => s.id === stap.id);
    const doel = huidig + richting;
    if (huidig < 0 || doel < 0 || doel >= nieuweStappen.length) return;
    const nieuw = [...nieuweStappen];
    [nieuw[huidig], nieuw[doel]] = [nieuw[doel], nieuw[huidig]];
    await doe(() => opslag.herordenStappen(identiteit, proces, nieuw.map((s) => s.id)));
  }

  function toggleVervangt(stap: ProcesStapRij, oudeStapId: string) {
    const vervangt = stap.vervangt.includes(oudeStapId)
      ? stap.vervangt.filter((id) => id !== oudeStapId)
      : [...stap.vervangt, oudeStapId];
    void doe(() => opslag.wijzigStap(identiteit, stap.id, { vervangt }));
  }

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Zoals het nu loopt
        </p>
        <div className="mt-2">
          <Processtrook stappen={huidigeStappen} deelnemers={state.deelnemers} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Zoals het zou moeten
        </p>
        <div className="mt-2">
          <Processtrook
            stappen={nieuweStappen}
            deelnemers={state.deelnemers}
            handelingen={{
              onHernoem: (stap, velden) =>
                void doe(() => opslag.wijzigStap(identiteit, stap.id, velden)),
              onVerplaats: (stap, richting) => void verplaats(stap, richting),
              onVerwijder: (stap) => void doe(() => opslag.verwijderStap(identiteit, stap.id)),
              onVoegToeNa: () => document.getElementById("nieuwe-stap-nieuw")?.focus(),
            }}
          />
        </div>

        <Kaart className="mt-3 p-3">
          <label className="block text-sm font-medium text-inkt" htmlFor="nieuwe-stap-nieuw">
            Nieuwe stap toevoegen
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="nieuwe-stap-nieuw"
              className={invoerStijl}
              value={nieuweStap}
              onChange={(e) => setNieuweStap(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void voegToe()}
              placeholder="Wat gebeurt er in het nieuwe proces?"
            />
            <Knop onClick={() => void voegToe()} disabled={!nieuweStap.trim()}>
              Toevoegen
            </Knop>
          </div>
        </Kaart>
      </div>

      {nieuweStappen.length > 0 && huidigeStappen.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
            Welke oude stappen vervallen?
          </p>
          {nieuweStappen.map((stap) => (
            <Kaart key={stap.id} className="p-3">
              <p className="text-sm font-medium text-inkt">{stap.naam}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {huidigeStappen.map((oud) => (
                  <Knop
                    key={oud.id}
                    soort={stap.vervangt.includes(oud.id) ? "primair" : "rand"}
                    className="!px-3 !py-2 !text-xs"
                    onClick={() => toggleVervangt(stap, oud.id)}
                  >
                    {oud.naam}
                  </Knop>
                ))}
              </div>
            </Kaart>
          ))}
        </div>
      ) : null}
    </>
  );
}
