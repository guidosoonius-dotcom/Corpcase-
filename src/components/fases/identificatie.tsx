"use client";

import { useMemo, useState } from "react";
import {
  alleSignalen,
  bibliotheek,
  cora,
  domein as coraDomein,
  rol,
  speelmodus,
  usecase as bibliotheekKaart,
} from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { alleBeelden, dekking } from "@/lib/sessie/afgeleid";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Etiket, Hoofdregel, Kaart, Knop, Kop, Leeg, Melding, Veld, invoerStijl } from "@/components/basis";
import { Bijdragen } from "@/components/bijdragen";

/**
 * Fase 2: van signaal naar use case.
 *
 * De bibliotheek is er om het gesprek te versnellen, niet om het over te nemen: een eigen kaart
 * maken staat er gelijkwaardig naast. Elke use case krijgt een eigenaar, zodat er iemand is die
 * hem straks kan toelichten en om hulp kan vragen.
 */
export function Identificatie({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [tab, setTab] = useState<"portfolio" | "bibliotheek" | "eigen">("portfolio");
  const modus = speelmodus(state.sessie.speelmodus);
  const beelden = alleBeelden(state);
  const gedekt = dekking(state);
  const vol = state.usecases.length >= modus.max_usecases;

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 2 · Identificatie" />
      <Kop
        boven="Fase 2 · Identificatie"
        titel="Welke use cases volgen hieruit?"
        onder="Kies uit de bibliotheek of schrijf er zelf een. Koppel er altijd het signaal aan waar hij uit voortkomt."
      />

      <Dekkingsmeter gedekt={gedekt.domeinenGedekt.length} totaal={cora.domeinen.length} ongedekt={gedekt.domeinenOngedekt} />

      {vol ? (
        <Melding>
          Je zit op {state.usecases.length} use cases, het maximum voor deze speelduur. Haal er een
          weg om ruimte te maken, of ga door naar de waardebepaling.
        </Melding>
      ) : null}

      <div className="scroll-x flex gap-1.5">
        {(
          [
            ["portfolio", `Op tafel (${state.usecases.length})`],
            ["bibliotheek", "Bibliotheek"],
            ["eigen", "Zelf schrijven"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-kaart border px-3 py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "border-accent-sterk bg-accent-sterk text-white"
                : "border-rand-sterk bg-vlak text-inkt-zacht"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "portfolio" ? (
        beelden.length === 0 ? (
          <Leeg>
            Nog niets op tafel. Kies iets uit de bibliotheek of schrijf zelf een use case.
          </Leeg>
        ) : (
          <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {beelden.map((beeld) => (
              <li key={beeld.usecase.id}>
                <UsecaseKaart state={state} identiteit={identiteit} doe={doe} usecaseId={beeld.usecase.id} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "bibliotheek" ? (
        <Bibliotheek state={state} identiteit={identiteit} doe={doe} geblokkeerd={vol} />
      ) : null}

      {tab === "eigen" ? (
        <EigenKaart state={state} identiteit={identiteit} doe={doe} geblokkeerd={vol} />
      ) : null}
    </div>
  );
}

function Dekkingsmeter({
  gedekt,
  totaal,
  ongedekt,
}: {
  gedekt: number;
  totaal: number;
  ongedekt: string[];
}) {
  const namen = ongedekt.map((id) => coraDomein(id)?.naam).filter(Boolean) as string[];
  return (
    <Kaart className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="display text-lg text-inkt">Breedte van het gesprek</h2>
        <span className="text-sm font-semibold tabular-nums text-accent-diep">
          {gedekt}/{totaal}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rand">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(gedekt / totaal) * 100}%` }}
        />
      </div>
      {namen.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-inkt-licht">
          Nog niet geraakt: {namen.slice(0, 6).join(", ")}
          {namen.length > 6 ? ` en ${namen.length - 6} meer` : ""}.
        </p>
      ) : (
        <p className="mt-2 text-xs text-inkt-licht">
          Alle CORA-domeinen zijn geraakt. Breder wordt het niet.
        </p>
      )}
    </Kaart>
  );
}

function Bibliotheek({
  state,
  identiteit,
  doe,
  geblokkeerd,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  geblokkeerd: boolean;
}) {
  const [zoek, setZoek] = useState("");
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;

  const gekozenSignalen = useMemo(
    () => new Set(state.selecties.map((s) => s.signaal_id)),
    [state.selecties],
  );

  /**
   * Sorteren op wat het team zelf heeft aangewezen: een use case die aansluit op een gemarkeerd
   * signaal komt bovenaan. Zo blijft de bibliotheek een hulpmiddel bij hun gesprek in plaats van
   * een lijst die het gesprek overneemt.
   */
  const kaarten = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    const relevanteDomeinen = new Set(mijnRol?.kijkt_naar ?? []);
    const alGekozen = new Set(state.usecases.map((u) => u.bibliotheek_id).filter(Boolean));

    return bibliotheek.usecases
      .filter((u) => !alGekozen.has(u.id))
      .filter(
        (u) =>
          !term ||
          u.titel.toLowerCase().includes(term) ||
          u.probleem.toLowerCase().includes(term) ||
          u.oplossingsrichting.toLowerCase().includes(term),
      )
      .map((u) => {
        const raakvlak = [...u.personas, ...u.uitdagingen].filter((id) => gekozenSignalen.has(id));
        const bijMijnRol = relevanteDomeinen.has(u.domein);
        return { kaart: u, raakvlak, score: raakvlak.length * 2 + (bijMijnRol ? 1 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [zoek, mijnRol, gekozenSignalen, state.usecases]);

  async function kies(id: string) {
    const kaart = bibliotheekKaart(id);
    if (!kaart) return;
    const onderbouwing = [...kaart.personas, ...kaart.uitdagingen].filter((s) =>
      gekozenSignalen.has(s),
    );

    await doe(() =>
      opslag.voegUsecaseToe(identiteit, {
        sessieId: state.sessie.id,
        eigenaarId: identiteit.deelnemerId,
        titel: kaart.titel,
        domein: kaart.domein,
        probleem: kaart.probleem,
        oplossingsrichting: kaart.oplossingsrichting,
        benodigdeData: kaart.benodigde_data,
        aandachtspunten: kaart.aandachtspunten,
        bibliotheekId: kaart.id,
        signaalIds: onderbouwing,
      }),
    );
  }

  return (
    <div className="space-y-3">
      <input
        className={invoerStijl}
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoeken in de bibliotheek…"
      />
      <p className="text-xs text-inkt-licht">
        Bovenaan staat wat aansluit op de signalen die jullie hebben gemarkeerd.
      </p>

      <ul className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {kaarten.map(({ kaart, raakvlak }) => (
          <li key={kaart.id}>
            <Kaart className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-medium leading-snug text-inkt">
                  {kaart.titel}
                </h3>
                <Etiket>{coraDomein(kaart.domein)?.naam ?? kaart.domein}</Etiket>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
                {kaart.probleem}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Etiket toon={kaart.volwassenheid === "bewezen" ? "waarde" : "neutraal"}>
                  {kaart.volwassenheid}
                </Etiket>
                {raakvlak.length > 0 ? (
                  <Etiket toon="accent">Sluit aan op {raakvlak.length} van jullie signalen</Etiket>
                ) : null}
              </div>
              <div className="mt-3">
                <Knop soort="rand" onClick={() => void kies(kaart.id)} disabled={geblokkeerd}>
                  Op tafel leggen
                </Knop>
              </div>
            </Kaart>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EigenKaart({
  state,
  identiteit,
  doe,
  geblokkeerd,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  geblokkeerd: boolean;
}) {
  const [titel, setTitel] = useState("");
  const [probleem, setProbleem] = useState("");
  const [oplossing, setOplossing] = useState("");
  const [domeinId, setDomeinId] = useState(cora.domeinen[3].id);
  const [signaalIds, setSignaalIds] = useState<string[]>([]);

  const signalen = alleSignalen(state.sessie.organisatie_id);
  const gemarkeerd = signalen.filter((s) =>
    state.selecties.some((sel) => sel.signaal_id === s.id),
  );

  async function opslaan() {
    if (!titel.trim()) return;
    await doe(() =>
      opslag.voegUsecaseToe(identiteit, {
        sessieId: state.sessie.id,
        eigenaarId: identiteit.deelnemerId,
        titel: titel.trim(),
        domein: domeinId,
        probleem: probleem.trim(),
        oplossingsrichting: oplossing.trim(),
        signaalIds,
      }),
    );
    setTitel("");
    setProbleem("");
    setOplossing("");
    setSignaalIds([]);
  }

  return (
    <div className="space-y-4">
      <Veld label="Titel" hint="Kort en concreet, zoals je het aan een collega zou uitleggen.">
        <input className={invoerStijl} value={titel} onChange={(e) => setTitel(e.target.value)} />
      </Veld>

      <Veld label="Welk probleem lost dit op?">
        <textarea
          className={`${invoerStijl} min-h-20`}
          value={probleem}
          onChange={(e) => setProbleem(e.target.value)}
        />
      </Veld>

      <Veld label="Wat is de oplossingsrichting?">
        <textarea
          className={`${invoerStijl} min-h-20`}
          value={oplossing}
          onChange={(e) => setOplossing(e.target.value)}
        />
      </Veld>

      <Veld label="Bij welk domein hoort dit?">
        <select
          className={invoerStijl}
          value={domeinId}
          onChange={(e) => setDomeinId(e.target.value)}
        >
          {cora.domeinen.map((d) => (
            <option key={d.id} value={d.id}>
              {d.naam}
            </option>
          ))}
        </select>
      </Veld>

      {gemarkeerd.length > 0 ? (
        <Veld label="Waar komt dit uit voort?" hint="Kies de signalen die dit onderbouwen.">
          <div className="space-y-1.5">
            {gemarkeerd.map((s) => (
              <label
                key={s.id}
                className="keuze flex cursor-pointer items-start gap-2.5 rounded-kaart border border-rand px-3 py-2"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={signaalIds.includes(s.id)}
                  onChange={(e) =>
                    setSignaalIds((huidig) =>
                      e.target.checked
                        ? [...huidig, s.id]
                        : huidig.filter((id) => id !== s.id),
                    )
                  }
                />
                <span className="text-sm leading-snug text-inkt-zacht">{s.titel}</span>
              </label>
            ))}
          </div>
        </Veld>
      ) : null}

      <Knop onClick={opslaan} disabled={geblokkeerd || !titel.trim()}>
        Op tafel leggen
      </Knop>
    </div>
  );
}

/** Eén use case zoals hij op tafel ligt, met de mogelijkheid om te helpen. */
export function UsecaseKaart({
  state,
  identiteit,
  doe,
  usecaseId,
  compact = false,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  usecaseId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const beeld = alleBeelden(state).find((b) => b.usecase.id === usecaseId);
  if (!beeld) return null;

  const { usecase } = beeld;
  const eigenaar = state.deelnemers.find((d) => d.id === usecase.eigenaar_id);
  const signalen = alleSignalen(state.sessie.organisatie_id);
  const onderbouwing = signalen.filter((s) => beeld.signaalIds.includes(s.id));

  return (
    <Kaart className="overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-snug text-inkt">{usecase.titel}</h3>
          <Etiket>{coraDomein(usecase.domein)?.naam ?? usecase.domein}</Etiket>
        </div>

        {usecase.probleem && !compact ? (
          <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
            {usecase.probleem}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {eigenaar ? <Etiket>Ingebracht door {eigenaar.naam}</Etiket> : null}
          {onderbouwing.length > 0 ? (
            <Etiket toon="waarde">{onderbouwing.length} signaal onderbouwd</Etiket>
          ) : (
            <Etiket toon="aandacht">Nog geen onderbouwing</Etiket>
          )}
          {beeld.openHulpvragen > 0 ? (
            <Etiket toon="aandacht">{beeld.openHulpvragen} open hulpvraag</Etiket>
          ) : null}
          {beeld.assists > 0 ? <Etiket toon="waarde">{beeld.assists} aanvulling</Etiket> : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2.5 text-xs font-medium text-accent-diep hover:underline"
        >
          {open ? "Inklappen" : "Openen en meehelpen"}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-rand bg-papier px-4 py-3">
          {usecase.oplossingsrichting ? (
            <div>
              <h4 className="text-xs font-semibold text-inkt">Oplossingsrichting</h4>
              <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
                {usecase.oplossingsrichting}
              </p>
            </div>
          ) : null}

          {usecase.benodigde_data.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-inkt">Benodigde gegevens</h4>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {usecase.benodigde_data.map((d) => (
                  <Etiket key={d}>{d}</Etiket>
                ))}
              </div>
            </div>
          ) : null}

          {usecase.aandachtspunten.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-inkt">Aandachtspunten</h4>
              <ul className="mt-1 space-y-1">
                {usecase.aandachtspunten.map((a) => (
                  <li key={a} className="text-xs leading-relaxed text-inkt-zacht">
                    — {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {onderbouwing.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-inkt">Komt voort uit</h4>
              <ul className="mt-1 space-y-1">
                {onderbouwing.map((s) => (
                  <li key={s.id} className="text-xs leading-relaxed text-inkt-zacht">
                    — {s.titel}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Bijdragen state={state} identiteit={identiteit} doe={doe} usecaseId={usecase.id} />
        </div>
      ) : null}
    </Kaart>
  );
}
