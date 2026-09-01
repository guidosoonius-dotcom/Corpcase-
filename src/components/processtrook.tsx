"use client";

import { useState } from "react";
import { Etiket, Kaart, Knop, invoerStijl } from "@/components/basis";
import { OmhoogIcoon, OmlaagIcoon, PlusIcoon, PrullenbakIcoon } from "@/components/icoon";
import type { DeelnemerRij, ProcesStapRij } from "@/lib/supabase/types";

/**
 * De procesplaat: de stappen van één proces, met hun uitvoerder en hun overdrachten.
 *
 * Drie keuzes die het uiterlijk verklaren.
 *
 * **Geen kleur per uitvoerder.** `docs/ONTWERP.md` staat één accentkleur per corporatie toe; zes
 * zelfbedachte tinten voor zes afdelingen zouden dat omvergooien, en bij een zevende afdeling houdt
 * het sowieso op. De stappen blijven dus uniform en het accent gaat naar de **overdracht** — de
 * plek waar het werk van de één naar de ander gaat. Daar zit in processen bijna altijd de
 * wachttijd, dus dat is ook precies waar het accent hoort.
 *
 * **Verticaal om te werken, horizontaal om te lezen.** De bewerkbare plaat staat altijd verticaal,
 * op elk schermformaat: dat loopt mee met de scrollrichting die het apparaat toch al heeft, en het
 * bewerken van een stap leest van boven naar beneden prettiger dan zijwaarts. De horizontale vorm —
 * van links naar rechts, zoals een proces hoort te lezen — is er voor waar de hele plaat juist in
 * één blik moet: de beamer en het rapport. Daar wordt niet bewerkt, dus daar is de breedte geen
 * bezwaar maar precies het punt.
 *
 * Dit is een correctie op een eerste opzet waarin de plaat vanaf `lg:` vanzelf horizontaal werd. Op
 * een laptop van 1440 pixels paste daar met tien stappen nog geen kwart van, en de rest liep
 * onaangekondigd buiten beeld — terwijl je op datzelfde scherm gewoon zat te bewerken.
 *
 * **De lijn is decoratie, de lijst is de inhoud.** De haarlijn en de stippen staan op `aria-hidden`;
 * wie de plaat niet ziet krijgt een genummerde lijst met per stap de naam, de uitvoerder en de
 * knoppen. De knoppen zijn 44 bij 44 met een klein icoon erin — dezelfde constructie als bij de
 * matrixpunten, die anders door de globale 44px-regel tot strepen werden uitgerekt.
 */

export type StrookHandelingen = {
  onHernoem: (stap: ProcesStapRij, velden: { naam?: string; uitvoerder?: string; knelpunt?: string; uitzondering?: boolean }) => void;
  onVerplaats: (stap: ProcesStapRij, richting: -1 | 1) => void;
  onVerwijder: (stap: ProcesStapRij) => void;
  /** Zet het invoegpunt voor de volgende stap; de fase bepaalt hoe dat wordt getoond. */
  onVoegToeNa: (stap: ProcesStapRij) => void;
};

export function Processtrook({
  stappen,
  deelnemers,
  handelingen,
  richting = "verticaal",
  leegTekst = "Nog geen stappen. Begin bij wat de aanleiding is: waarmee start dit proces?",
}: {
  /** Al gesorteerd op volgorde. */
  stappen: ProcesStapRij[];
  deelnemers: DeelnemerRij[];
  /** Weggelaten betekent alleen lezen — zo staat de plaat op de beamer en in het rapport. */
  handelingen?: StrookHandelingen;
  /** Horizontaal alleen waar niet bewerkt wordt; zie de toelichting hierboven. */
  richting?: "verticaal" | "horizontaal";
  leegTekst?: string;
}) {
  const horizontaal = richting === "horizontaal";
  const [inBewerking, setInBewerking] = useState<string | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<string | null>(null);

  if (stappen.length === 0) {
    return (
      <div className="rounded-kaart border border-dashed border-rand-sterk p-5 text-center text-sm text-inkt-zacht">
        {leegTekst}
      </div>
    );
  }

  return (
    <ol
      className={
        horizontaal ? "scroll-x flex flex-row items-start pb-2" : "flex flex-col"
      }
    >
      {stappen.map((stap, index) => {
        const vorige = index > 0 ? stappen[index - 1] : null;
        const overdracht = isOverdracht(vorige, stap);

        return (
          <li key={stap.id} className={horizontaal ? "flex shrink-0 items-start" : ""}>
            {vorige ? (
              <Verbinding
                overdracht={overdracht}
                naar={stap.uitvoerder}
                horizontaal={horizontaal}
              />
            ) : null}

            <div className={horizontaal ? "w-56 shrink-0" : ""}>
              <div
                className={
                  stap.uitzondering
                    ? horizontaal
                      ? "border-t-2 border-dashed border-rand-sterk pt-3"
                      : "border-l-2 border-dashed border-rand-sterk pl-3"
                    : ""
                }
              >
                <Stapkaart
                  stap={stap}
                  nummer={index + 1}
                  auteur={deelnemers.find((d) => d.id === stap.toegevoegd_door)?.naam}
                  eersteStap={index === 0}
                  laatsteStap={index === stappen.length - 1}
                  handelingen={handelingen}
                  bewerkt={inBewerking === stap.id}
                  onBewerk={() => setInBewerking(inBewerking === stap.id ? null : stap.id)}
                  bevestigVerwijderen={teVerwijderen === stap.id}
                  onVraagVerwijderen={() =>
                    setTeVerwijderen(teVerwijderen === stap.id ? null : stap.id)
                  }
                  onSluitBewerking={() => setInBewerking(null)}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Verschilt de uitvoerder van de vorige stap? Dan ligt hier een overdracht. */
function isOverdracht(vorige: ProcesStapRij | null, stap: ProcesStapRij): boolean {
  if (!vorige) return false;
  if (!vorige.uitvoerder.trim() || !stap.uitvoerder.trim()) return false;
  return vorige.uitvoerder.trim().toLowerCase() !== stap.uitvoerder.trim().toLowerCase();
}

/** Telt hoe vaak het werk van hand wisselt. Voedt het grote cijfer boven de plaat. */
export function telOverdrachten(stappen: ProcesStapRij[]): number {
  return stappen.filter((stap, index) => isOverdracht(index > 0 ? stappen[index - 1] : null, stap))
    .length;
}

function Verbinding({
  overdracht,
  naar,
  horizontaal,
}: {
  overdracht: boolean;
  naar: string;
  horizontaal: boolean;
}) {
  if (!overdracht) {
    return (
      <div
        aria-hidden
        className={
          horizontaal ? "mt-9 h-px w-8 shrink-0 bg-rand-sterk" : "ml-[21px] h-5 w-px bg-rand-sterk"
        }
      />
    );
  }

  return (
    <div
      className={
        horizontaal
          ? "mt-6 flex w-24 shrink-0 flex-col items-center gap-1"
          : "flex items-center gap-2 py-1"
      }
    >
      <div
        aria-hidden
        className={horizontaal ? "h-0.5 w-full bg-accent" : "ml-[21px] h-6 w-0.5 bg-accent"}
      />
      {/*
       * Het label is geen decoratie: dat er hier een overdracht ligt is de kern van wat de plaat
       * laat zien, en dat hoort ook in de voorleesvolgorde te staan.
       */}
      <p
        className={`text-[11px] font-medium leading-tight text-accent-diep ${horizontaal ? "text-center" : ""}`}
      >
        overdracht naar {naar}
      </p>
    </div>
  );
}

function Stapkaart({
  stap,
  nummer,
  auteur,
  eersteStap,
  laatsteStap,
  handelingen,
  bewerkt,
  onBewerk,
  bevestigVerwijderen,
  onVraagVerwijderen,
  onSluitBewerking,
}: {
  stap: ProcesStapRij;
  nummer: number;
  auteur?: string;
  eersteStap: boolean;
  laatsteStap: boolean;
  handelingen?: StrookHandelingen;
  bewerkt: boolean;
  onBewerk: () => void;
  bevestigVerwijderen: boolean;
  onVraagVerwijderen: () => void;
  onSluitBewerking: () => void;
}) {
  return (
    <Kaart className="p-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="cijfer mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rand text-[12px] font-semibold text-inkt-zacht"
        >
          {nummer}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-inkt">{stap.naam}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {stap.uitvoerder.trim() ? (
              <Etiket>{stap.uitvoerder}</Etiket>
            ) : (
              <span className="text-xs text-inkt-licht">nog geen uitvoerder</span>
            )}
            {stap.uitzondering ? <Etiket toon="aandacht">uitzondering</Etiket> : null}
          </div>
          {stap.knelpunt.trim() ? (
            <p className="mt-1.5 text-xs leading-relaxed text-risico">{stap.knelpunt}</p>
          ) : null}
          {auteur ? <p className="mt-1.5 text-[11px] text-inkt-licht">toegevoegd door {auteur}</p> : null}
        </div>
      </div>

      {handelingen ? (
        <div className="mt-2 flex items-center gap-0.5 border-t border-rand pt-1">
          <IcoonKnop
            label={`"${stap.naam}" naar voren`}
            disabled={eersteStap}
            onClick={() => handelingen.onVerplaats(stap, -1)}
          >
            <OmhoogIcoon className="h-4 w-4" />
          </IcoonKnop>
          <IcoonKnop
            label={`"${stap.naam}" naar achteren`}
            disabled={laatsteStap}
            onClick={() => handelingen.onVerplaats(stap, 1)}
          >
            <OmlaagIcoon className="h-4 w-4" />
          </IcoonKnop>
          <IcoonKnop label={`Nieuwe stap na "${stap.naam}" plaatsen`} onClick={() => handelingen.onVoegToeNa(stap)}>
            <PlusIcoon className="h-4 w-4" />
          </IcoonKnop>
          <IcoonKnop label={`"${stap.naam}" verwijderen`} onClick={onVraagVerwijderen}>
            <PrullenbakIcoon className="h-4 w-4" />
          </IcoonKnop>
          <button
            type="button"
            onClick={onBewerk}
            className="ml-auto px-2 text-xs font-medium text-accent-diep hover:underline"
          >
            {bewerkt ? "Klaar" : "Bewerken"}
          </button>
        </div>
      ) : null}

      {/*
       * Verwijderen vraagt een bevestiging. Op een plaat waar iedereen tegelijk werkt is één
       * misplaatste tik anders genoeg om het werk van een collega weg te halen, en de plaat kent
       * geen ongedaan maken.
       */}
      {bevestigVerwijderen && handelingen ? (
        <div className="mt-2 rounded-kaart bg-risico-zacht p-2.5">
          <p className="text-xs leading-relaxed text-risico">
            &ldquo;{stap.naam}&rdquo; verwijderen? Dat kan niet ongedaan gemaakt worden.
          </p>
          <div className="mt-2 flex gap-2">
            <Knop
              soort="gevaar"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => {
                handelingen.onVerwijder(stap);
                onVraagVerwijderen();
              }}
            >
              Verwijderen
            </Knop>
            <Knop soort="stil" className="!px-3 !py-1.5 !text-xs" onClick={onVraagVerwijderen}>
              Laat maar staan
            </Knop>
          </div>
        </div>
      ) : null}

      {bewerkt && handelingen ? (
        <div className="mt-2 space-y-2 border-t border-rand pt-2">
          <input
            className={`${invoerStijl} !py-1.5 !text-sm`}
            defaultValue={stap.naam}
            aria-label="Naam van de stap"
            onBlur={(e) => handelingen.onHernoem(stap, { naam: e.target.value.trim() || stap.naam })}
          />
          <input
            className={`${invoerStijl} !py-1.5 !text-sm`}
            defaultValue={stap.uitvoerder}
            aria-label="Wie voert deze stap uit?"
            placeholder="Wie doet dit? Rol of afdeling"
            onBlur={(e) => handelingen.onHernoem(stap, { uitvoerder: e.target.value.trim() })}
          />
          <input
            className={`${invoerStijl} !py-1.5 !text-sm`}
            defaultValue={stap.knelpunt}
            aria-label="Waar schuurt het in deze stap?"
            placeholder="Waar schuurt het? (optioneel)"
            onBlur={(e) => handelingen.onHernoem(stap, { knelpunt: e.target.value.trim() })}
          />
          <label className="flex items-center gap-2 text-xs text-inkt-zacht">
            <input
              type="checkbox"
              checked={stap.uitzondering}
              onChange={(e) => handelingen.onHernoem(stap, { uitzondering: e.target.checked })}
            />
            Dit gebeurt maar in een deel van de gevallen
          </label>
          <Knop soort="stil" className="!px-3 !py-1.5 !text-xs" onClick={onSluitBewerking}>
            Klaar
          </Knop>
        </div>
      ) : null}
    </Kaart>
  );
}

/**
 * Een knop van 44 bij 44 met een klein icoon erin. Zonder die maat zou de globale regel dat elke
 * knop minstens 44 pixels hoog is de rij knoppen onder elke stap uit elkaar trekken; met alleen een
 * icoon erin zou de betekenis verdwijnen voor wie de plaat niet ziet, vandaar het `aria-label`.
 */
function IcoonKnop({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center text-inkt-licht transition-colors hover:text-accent-diep disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
