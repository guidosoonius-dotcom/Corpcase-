import Link from "next/link";
import type { ReactNode } from "react";
import { bibliotheek, cora, organisaties, realiteitschecks, rollen } from "@/lib/content";
import { Cijfer, Kaart } from "@/components/basis";
import { Cirkel, Halftoon, RasterCirkel } from "@/components/decoratie";
import { Thema } from "@/components/thema";

/**
 * Pijl-in-cirkel, dezelfde constructie als het pijltje in `PijlActie` — hier alleen inline
 * herbruikt omdat deze knop een vlak label draagt in plaats van de twee-regelige tekst daar.
 */
function Pijl() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/**
 * De hoofdhandeling van de startpagina: een volle pil met de pijl in zijn eigen rondje aan het
 * eind, dat op hover een stukje mee-schuift. Alleen hier gebruikt — de rest van de app kent zijn
 * eigen `Knop`, dit is bewust een marketing-variant voor precies twee knoppen.
 */
function StartKnop({
  href,
  primair = false,
  children,
}: {
  href: string;
  primair?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`knop group inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-medium transition-colors ${
        primair
          ? "bg-accent-sterk text-white hover:bg-accent-diep"
          : "border border-rand-sterk bg-vlak text-inkt hover:border-accent-sterk"
      }`}
    >
      {children}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
          primair ? "bg-white/25" : "bg-papier"
        }`}
      >
        <Pijl />
      </span>
    </Link>
  );
}

export default function Home() {
  const org = organisaties[0];

  return (
    <Thema accent={org.thema.accent} className="flex-1">
      <main className="relative mx-auto w-full max-w-5xl px-5 py-10 sm:py-16">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-inkt">
            Corp<span className="text-accent-sterk">case</span>
          </span>
          <span className="niet-printen hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-inkt-licht sm:block">
            Use-casesessie
          </span>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-kaart lg:mt-16 lg:overflow-visible">
          <Cirkel hoek="rechtsboven" formaat={0.62} />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
            <div>
              <p className="kicker text-base sm:text-lg">Serious game voor woningcorporaties</p>
              <h1 className="display mt-2 max-w-xl text-4xl leading-[1.05] text-inkt sm:text-6xl">
                Van jaarverslag naar een <em>gedragen</em> roadmap
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-inkt-zacht">
                Een werksessie waarin bestuur en management door de ogen van het eigen jaarverslag,
                de eigen huurders en de eigen uitdagingen tot use cases komen — en die vervolgens
                waarderen, prioriteren en op een roadmap zetten.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <StartKnop href="/facilitator" primair>
                  Ik ben facilitator
                </StartKnop>
                <StartKnop href="/deelnemen">Ik heb een sessiecode</StartKnop>
              </div>
            </div>

            {/*
              Een voorbeelduitkomst uit een echt gespeelde sessie (dezelfde bandbreedte die ook in
              de facilitatorhandleiding staat) — geen live koppeling, dus expliciet "voorbeeld" en
              niet "live": deze kaart mag nooit doen alsof hij een actuele sessie volgt.
            */}
            <div className="rotate-[-1.2deg]">
              <div className="rounded-[calc(var(--radius-kaart)+0.35rem)] border border-rand-sterk bg-rand p-[0.35rem] shadow-[0_24px_60px_-24px_rgba(34,32,30,0.28)]">
                <div className="relative overflow-hidden rounded-kaart border border-rand bg-vlak p-6">
                  <div className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 text-accent-zacht">
                    <Halftoon afstand={9} straal={1.6} />
                  </div>

                  <div className="relative flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-inkt-licht">
                    <b className="text-inkt">Use-casesessie {org.naam}</b>
                    <span className="text-accent-diep">Voorbeeld</span>
                  </div>

                  <div className="mt-5 flex items-center gap-1.5">
                    {["Verkennen", "Identificatie", "Waardebepaling", "Prioritering", "Roadmap"].map(
                      (naam, i) => (
                        <div
                          key={naam}
                          className={`h-[3px] flex-1 rounded-full ${i < 3 ? "bg-accent-sterk" : "bg-rand"}`}
                        />
                      ),
                    )}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-inkt-licht">
                    <span>Verkennen</span>
                    <span>Prioritering</span>
                    <span>Roadmap</span>
                  </div>

                  <div className="mt-5 border-t border-rand pt-4">
                    <p className="text-xs text-inkt-zacht">Meertalige AI-assistent — netto per jaar</p>
                    <p className="cijfer mt-1 text-3xl text-inkt">
                      €91.500 <span className="text-base font-normal text-inkt-licht">–</span> €208.500
                    </p>
                    <p className="mt-1.5 text-[11px] text-inkt-licht">
                      Bandbreedte uit een voorbeeldsessie, geen bedrag. Onzekerheid 30% rond de
                      verwachte waarde.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 border-t border-rand pt-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="display text-2xl text-inkt">Wat er in de bibliotheek zit</h2>
            <p className="text-xs text-inkt-licht sm:max-w-[22rem] sm:text-right">
              Elk cijfer draagt zijn eigen bron — geen aanname wordt als feit getoond.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <Kaart className="h-full p-5 sm:p-7">
                <Cijfer label="Use cases" waarde={bibliotheek.usecases.length} toon="accent" />
                <p className="mt-3 max-w-[26rem] text-sm leading-relaxed text-inkt-zacht">
                  Kant-en-klaar per CORA-domein, of het team schrijft er zelf een — altijd
                  gekoppeld aan het signaal waar hij uit voortkomt.
                </p>
              </Kaart>
            </div>
            <Kaart className="p-5">
              <Cijfer label="CORA-domeinen" waarde={cora.domeinen.length} toon="accent" />
            </Kaart>
            <Kaart className="p-5">
              <Cijfer label="Rollen aan tafel" waarde={rollen.rollen.length} toon="accent" />
            </Kaart>
            <div className="col-span-2">
              <Kaart className="h-full p-5">
                <Cijfer label="Realiteitschecks" waarde={realiteitschecks.checks.length} toon="accent" />
              </Kaart>
            </div>
          </div>
        </section>

        <Kaart className="mt-10 p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <RasterCirkel formaat={84} className="hidden shrink-0 sm:block" />
            <div>
              <h2 className="display text-xl text-inkt">Voorbeeldcorporatie: {org.naam}</h2>
              <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">{org.pitch}</p>
              <p className="mt-3 text-xs leading-relaxed text-inkt-licht">
                De cijfers in deze demo komen uit publieke bronnen en zijn nog niet geverifieerd
                tegen het originele jaarverslag. Elk cijfer toont zijn bron; zie{" "}
                <code>content/BRONNEN.md</code>.
              </p>
            </div>
          </div>
        </Kaart>
      </main>
    </Thema>
  );
}
