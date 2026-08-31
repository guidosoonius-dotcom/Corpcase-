"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { opslag } from "@/lib/sessie/api";
import { bewaarIdentiteit } from "@/lib/sessie/identiteit";
import { rollen } from "@/lib/content";
import { normaliseerCode } from "@/lib/sessie/codes";
import { Knop, Melding, Veld, invoerStijl } from "@/components/basis";
import { Cirkel } from "@/components/decoratie";

function Formulier() {
  const router = useRouter();
  const zoekparameters = useSearchParams();
  const [code, setCode] = useState(zoekparameters.get("code") ?? "");
  const [naam, setNaam] = useState("");
  const [rolId, setRolId] = useState(rollen.rollen[1].id);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function meedoen() {
    if (normaliseerCode(code).length !== 6) {
      setFout("Een sessiecode bestaat uit zes tekens.");
      return;
    }
    if (!naam.trim()) {
      setFout("Vul je naam in, dan weten de anderen wie er meedoet.");
      return;
    }

    setBezig(true);
    setFout(null);
    try {
      const toegang = await opslag.neemDeel({ code, naam: naam.trim(), rolId });
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}`);
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Deelnemen mislukte.");
      setBezig(false);
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-md overflow-hidden px-5 py-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-center">
      <Cirkel
        hoek="rechtsboven"
        formaat={0.55}
        afbeelding={{ src: "/illustraties/meedoen.jpg" }}
      />
      <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
        ← Terug
      </Link>
      <h1 className="display mt-4 text-3xl text-inkt">Meedoen</h1>
      <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
        Vul de code in die de facilitator deelt.
      </p>

      <div className="mt-7 space-y-5">
        <Veld label="Sessiecode">
          <input
            className={`${invoerStijl} text-center font-mono text-2xl tracking-[0.3em] uppercase`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={9}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />
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

        <Knop onClick={meedoen} disabled={bezig} className="w-full">
          {bezig ? "Bezig…" : "Meedoen"}
        </Knop>
      </div>
    </main>
  );
}

export default function DeelnemenPagina() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-inkt-licht">Laden…</main>}>
      <Formulier />
    </Suspense>
  );
}
