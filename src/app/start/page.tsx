"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { opslag } from "@/lib/sessie/api";
import { bewaarIdentiteit } from "@/lib/sessie/identiteit";
import { organisaties, rollen, speelmodi } from "@/lib/content";
import { Kaart, Knop, Melding, Veld, invoerStijl } from "@/components/basis";

export default function StartPagina() {
  const router = useRouter();
  const org = organisaties[0];

  const [titel, setTitel] = useState(`Use-casesessie ${org.naam}`);
  const [modusId, setModusId] = useState("halve-dag");
  const [naam, setNaam] = useState("");
  const [rolId, setRolId] = useState(rollen.rollen[0].id);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const modus = speelmodi.modi.find((m) => m.id === modusId)!;

  async function starten() {
    if (!naam.trim()) {
      setFout("Vul je naam in, dan weten de anderen wie er aan tafel zit.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const toegang = await opslag.maakSessie({
        titel: titel.trim() || `Use-casesessie ${org.naam}`,
        organisatieId: org.id,
        speelmodusId: modusId,
        facilitatorNaam: naam.trim(),
        facilitatorRolId: rolId,
      });
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}/beheer`);
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Sessie starten mislukte.");
      setBezig(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10">
      <Link href="/" className="text-sm text-[--color-inkt-licht] hover:text-[--color-accent]">
        ← Terug
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-[--color-inkt]">Sessie starten</h1>
      <p className="mt-2 text-sm leading-relaxed text-[--color-inkt-zacht]">
        Je wordt facilitator én speler: je kiest een rol en doet gewoon mee. Alleen het openen en
        sluiten van de fases is van jou.
      </p>

      <div className="mt-7 space-y-5">
        <Veld label="Naam van de sessie">
          <input
            className={invoerStijl}
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Use-casesessie"
          />
        </Veld>

        <Veld label="Corporatie">
          <Kaart className="p-3">
            <p className="text-sm font-medium text-[--color-inkt]">{org.naam}</p>
            <p className="mt-1 text-xs leading-relaxed text-[--color-inkt-zacht]">{org.pitch}</p>
          </Kaart>
        </Veld>

        <Veld label="Hoeveel tijd heb je?" hint="Bepaalt het aantal kaarten, de timers en hoe diep je doorrekent.">
          <div className="space-y-2">
            {speelmodi.modi.map((m) => (
              <label
                key={m.id}
                className={`keuze flex cursor-pointer items-start gap-3 rounded-[--radius-kaart] border p-3 transition-colors ${
                  modusId === m.id
                    ? "border-[--color-accent] bg-[--color-accent-zacht]"
                    : "border-[--color-rand] bg-[--color-vlak] hover:border-[--color-rand-sterk]"
                }`}
              >
                <input
                  type="radio"
                  name="modus"
                  className="mt-1"
                  checked={modusId === m.id}
                  onChange={() => setModusId(m.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[--color-inkt]">
                    {m.naam} · {Math.round(m.duur_minuten / 15) * 15} minuten
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[--color-inkt-zacht]">
                    {m.omschrijving}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Veld>

        <Veld label="Jouw naam">
          <input
            className={invoerStijl}
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Voor- en achternaam"
            autoComplete="name"
          />
        </Veld>

        <Veld label="Jouw rol" hint="Bepaalt door welke bril je kijkt en welke privé-opdracht je krijgt.">
          <select className={invoerStijl} value={rolId} onChange={(e) => setRolId(e.target.value)}>
            {rollen.rollen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.naam}
              </option>
            ))}
          </select>
        </Veld>

        {fout ? <Melding toon="risico">{fout}</Melding> : null}

        <div className="flex items-center gap-3">
          <Knop onClick={starten} disabled={bezig}>
            {bezig ? "Bezig…" : "Sessie starten"}
          </Knop>
          <p className="text-xs text-[--color-inkt-licht]">
            Maximaal {modus.max_usecases} use cases in deze modus.
          </p>
        </div>
      </div>
    </main>
  );
}
