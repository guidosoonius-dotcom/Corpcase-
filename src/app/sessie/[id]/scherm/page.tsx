"use client";

import { useParams } from "next/navigation";
import { FASE_LABELS } from "@/lib/supabase/types";
import { cora, domein as coraDomein, personaSignalen, speelmodus } from "@/lib/content";
import { useSessie } from "@/lib/sessie/gebruik";
import { alleBeelden, budgetStand, dekking, teamscore } from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import { Matrix } from "@/components/matrix";
import { Melding } from "@/components/basis";

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

  if (laden) return <main className="p-12 text-xl text-inkt-licht">Laden…</main>;

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
  const totaleBaat = beelden.reduce(
    (som, b) => som + (b.businessCase?.netto_baat?.verwacht ?? 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-8 py-8">
      <header className="flex items-baseline justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-inkt-licht">
            {FASE_LABELS[state.sessie.fase]}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-inkt">{state.sessie.titel}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-inkt-licht">Teamscore</p>
          <p className="text-3xl font-semibold tabular-nums text-accent">
            {score.totaal}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="text-base font-semibold text-inkt">Waarde tegen haalbaarheid</h2>
          <div className="mt-3">
            <Matrix beelden={beelden} hoogte={420} />
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-inkt">Op tafel</h2>
            <ol className="mt-3 space-y-2">
              {beelden.slice(0, 8).map((beeld) => (
                <li
                  key={beeld.usecase.id}
                  className="flex items-baseline justify-between gap-4 border-b border-rand pb-2"
                >
                  <span className="text-base leading-snug text-inkt">
                    {beeld.usecase.titel}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-inkt-licht">
                    {beeld.businessCase?.netto_baat
                      ? formatteerBandbreedte(beeld.businessCase.netto_baat)
                      : beeld.positie
                        ? `waarde ${beeld.positie.waarde.toFixed(1)}`
                        : "—"}
                  </span>
                </li>
              ))}
              {beelden.length === 0 ? (
                <li className="text-base text-inkt-licht">Nog niets.</li>
              ) : null}
              {beelden.length > 8 ? (
                <li className="text-sm text-inkt-licht">
                  en {beelden.length - 8} meer
                </li>
              ) : null}
            </ol>
          </div>

          {totaleBaat > 0 ? (
            <div className="rounded-kaart border border-waarde bg-waarde-zacht p-4">
              <p className="text-sm text-waarde">
                Verwachte netto waarde van het doorgerekende deel
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-waarde">
                {formatteerEuro(totaleBaat)} per jaar
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-waarde">
                Optelling van verwachte waarden, elk met een onzekerheid van{" "}
                {state.sessie.onzekerheid_pct}%. Geen begroting.
              </p>
            </div>
          ) : null}

          <div>
            <h2 className="text-base font-semibold text-inkt">Breedte</h2>
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
              {gedekt.personasGeraakt.length} van {personaSignalen.kaarten.length} huurderstypen
            </p>
            {gedekt.domeinenOngedekt.length > 0 ? (
              <p className="mt-1 text-sm leading-relaxed text-inkt-licht">
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
              <h2 className="text-base font-semibold text-inkt">Wat past er nog in</h2>
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
            <h2 className="text-base font-semibold text-inkt">Aan tafel</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
              {state.deelnemers.map((d) => d.naam).join(" · ")}
            </p>
            <p className="mt-2 text-sm text-inkt-licht">
              Speelduur: {modus.naam.toLowerCase()}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
