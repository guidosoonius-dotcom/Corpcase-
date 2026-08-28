import Link from "next/link";
import { bibliotheek, cora, organisaties, realiteitschecks, rollen } from "@/lib/content";

export default function Home() {
  const org = organisaties[0];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
        Corpcase
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-inkt sm:text-4xl">
        Van jaarverslag naar een gedragen roadmap
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-inkt-zacht">
        Een werksessie waarin bestuur en management door de ogen van het eigen jaarverslag, de eigen
        huurders en de eigen uitdagingen tot use cases komen — en die vervolgens waarderen,
        prioriteren en op een roadmap zetten.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/start"
          className="knop inline-flex items-center justify-center rounded-kaart bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-diep"
        >
          Sessie starten
        </Link>
        <Link
          href="/deelnemen"
          className="knop inline-flex items-center justify-center rounded-kaart border border-rand-sterk bg-vlak px-5 py-3 text-sm font-medium text-inkt transition-colors hover:border-accent"
        >
          Deelnemen met een code
        </Link>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-kaart border border-rand bg-rand sm:grid-cols-4">
        {[
          { label: "Use cases in de bibliotheek", waarde: bibliotheek.usecases.length },
          { label: "CORA-domeinen", waarde: cora.domeinen.length },
          { label: "Rollen aan tafel", waarde: rollen.rollen.length },
          { label: "Realiteitschecks", waarde: realiteitschecks.checks.length },
        ].map((item) => (
          <div key={item.label} className="bg-vlak p-4">
            <dt className="text-xs leading-snug text-inkt-licht">{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-inkt">
              {item.waarde}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-12 rounded-kaart border border-rand bg-vlak p-5">
        <h2 className="text-sm font-semibold text-inkt">Voorbeeldcorporatie</h2>
        <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
          <span className="font-medium text-inkt">{org.naam}</span> — {org.pitch}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-inkt-licht">
          De cijfers in deze demo komen uit publieke bronnen en zijn nog niet geverifieerd tegen het
          originele jaarverslag. Elk cijfer toont zijn bron; zie <code>content/BRONNEN.md</code>.
        </p>
      </section>
    </main>
  );
}
