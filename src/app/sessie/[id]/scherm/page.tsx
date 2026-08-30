"use client";

import { useParams } from "next/navigation";
import { FASE_LABELS } from "@/lib/supabase/types";
import { cora, domein as coraDomein, organisatie, speelmodus } from "@/lib/content";
import { useSessie } from "@/lib/sessie/gebruik";
import { alleBeelden, budgetStand, dekking, teamscore } from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import { Matrix } from "@/components/matrix";
import { Cijfer, DonkerPaneel, Melding } from "@/components/basis";
import { Cirkel, Halftoon } from "@/components/decoratie";
import { Thema } from "@/components/thema";

/**
 * Het scherm op de beamer.
 *
 * Alles hier moet van vier meter afstand leesbaar zijn, dus grotere tekst, minder detail en geen
 * bediening. Wat er staat, is wat het gesprek in de zaal nodig heeft: waar staan we, wat ligt er
 * op tafel, en waar wringt het.
 */
export default function SchermPagina() {
  const parameters = useParams<{ id: string }>();
  const { state, laden } = useSessie(parameters.id);

  if (laden) return <main className="p-12 text-xl text-inkt-zacht">Laden…</main>;

  if (!state) {
    return (
      <main className="p-12">
        <Melding toon="risico">
          Deze browser heeft geen toegang tot de sessie. Open dit scherm vanaf het apparaat van de
          facilitator.
        </Melding>
      </main>
    );
  }

  const beelden = alleBeelden(state);
  const score = teamscore(state);
  const gedekt = dekking(state);
  const stand = budgetStand(state);
  const modus = speelmodus(state.sessie.speelmodus);
  const doorgerekend = beelden.filter((b) => b.businessCase?.netto_baat);
  const totaleBaat = doorgerekend.reduce(
    (som, b) => som + (b.businessCase!.netto_baat!.verwacht ?? 0),
    0,
  );

  return (
    <Thema accent={organisatie(state.sessie.organisatie_id).thema.accent} className="flex-1">
    <main className="relative mx-auto w-full max-w-6xl overflow-hidden px-8 py-8">
      {/*
       * De cirkel begint onder de kop. Daarboven staat de teamscore in vol koraal, en dat cijfer
       * haalt op de zachte tint 3,05 — net genoeg voor grote tekst, te mager voor een beamer
       * waar je van vier meter naar kijkt. Onder de kop valt de tint alleen achter inkt en
       * inkt-zacht, en die halen daar 13,5 en 6,7.
       */}
      <Cirkel hoek="rechtsboven" formaat={0.32} toon="zacht" vanBoven={140} />

      <header className="relative flex items-baseline justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-inkt-zacht">
            {FASE_LABELS[state.sessie.fase]}
          </p>
          <h1 className="display mt-1 text-4xl leading-tight text-inkt">{state.sessie.titel}</h1>
        </div>
        <Cijfer
          waarde={score.totaal}
          label="Teamscore"
          toon="accent"
          formaat="groot"
          toelichting="Meet de breedte en onderbouwing van het gesprek, niet wie er wint."
        />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="display text-2xl text-inkt">Waarde tegen haalbaarheid</h2>
          <div className="mt-3">
            <Matrix beelden={beelden} hoogte={420} donker />
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="display text-2xl text-inkt">Op tafel</h2>
            <ol className="mt-3 space-y-2">
              {beelden.slice(0, 8).map((beeld) => (
                <li
                  key={beeld.usecase.id}
                  className="flex items-baseline justify-between gap-4 border-b border-rand pb-2"
                >
                  <span className="text-base leading-snug text-inkt">
                    {beeld.usecase.titel}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-inkt-zacht">
                    {beeld.businessCase?.netto_baat
                      ? formatteerBandbreedte(beeld.businessCase.netto_baat)
                      : beeld.positie
                        ? `waarde ${beeld.positie.waarde.toFixed(1)}`
                        : "—"}
                  </span>
                </li>
              ))}
              {beelden.length === 0 ? (
                <li className="text-base text-inkt-zacht">Nog niets.</li>
              ) : null}
              {beelden.length > 8 ? (
                <li className="text-sm text-inkt-zacht">
                  en {beelden.length - 8} meer
                </li>
              ) : null}
            </ol>
          </div>

          {doorgerekend.length > 0 ? (
            <DonkerPaneel bloedt="rechts" className="p-5">
              <div aria-hidden className="absolute -right-10 -top-14 h-44 w-44 text-white/[0.07]">
            <Halftoon />
              </div>
              <div className="relative">
                <p className="text-sm text-houtskool-zacht">
                  Verwachte netto waarde van het doorgerekende deel
                </p>
                <p
                  className={`cijfer mt-2 text-5xl ${
                    totaleBaat >= 0 ? "text-accent-op-donker" : "text-white"
                  }`}
                >
                  {formatteerEuro(totaleBaat)}
                </p>
                <p className="mt-1 text-sm text-white">per jaar</p>
                <p className="mt-3 border-t border-houtskool-rand pt-2.5 text-xs leading-relaxed text-houtskool-zacht">
                  Optelling van verwachte waarden, elk met een onzekerheid van{" "}
                  {state.sessie.onzekerheid_pct}%. Geen begroting.
                </p>
              </div>
            </DonkerPaneel>
          ) : null}

          <div>
            <h2 className="display text-2xl text-inkt">Breedte</h2>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-rand">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${(gedekt.domeinenGedekt.length / cora.domeinen.length) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-inkt-zacht">
              {gedekt.domeinenGedekt.length} van {cora.domeinen.length} domeinen ·{" "}
              {gedekt.personasGeraakt.length} van{" "}
              {gedekt.personasGeraakt.length + gedekt.personasGemist.length} huurderstypen
            </p>
            {gedekt.domeinenOngedekt.length > 0 ? (
              <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
                Nog niet geraakt:{" "}
                {gedekt.domeinenOngedekt
                  .slice(0, 5)
                  .map((id) => coraDomein(id)?.naam)
                  .filter(Boolean)
                  .join(", ")}
                {gedekt.domeinenOngedekt.length > 5 ? "…" : ""}
              </p>
            ) : null}
          </div>

          {state.sessie.fase === "prioritering" || state.sessie.fase === "roadmap" ? (
            <div>
              <h2 className="display text-2xl text-inkt">Wat past er nog in</h2>
              <p className="mt-1.5 text-sm tabular-nums text-inkt-zacht">
                {formatteerEuro(stand.besteed.geld_eur)} van{" "}
                {formatteerEuro(state.sessie.budget_geld)} ·{" "}
                {stand.besteed.verandercapaciteit_mensmaanden} van{" "}
                {state.sessie.budget_capaciteit} mensmaanden
              </p>
              {stand.overschreden.geld || stand.overschreden.capaciteit ? (
                <p className="mt-1.5 text-sm font-medium text-risico">
                  Het budget is overschreden.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <h2 className="display text-2xl text-inkt">Aan tafel</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
              {state.deelnemers.map((d) => d.naam).join(" · ")}
            </p>
            <p className="mt-2 text-sm text-inkt-zacht">
              Speelduur: {modus.naam.toLowerCase()}
            </p>
          </div>
        </section>
      </div>
    </main>
    </Thema>
  );
}
