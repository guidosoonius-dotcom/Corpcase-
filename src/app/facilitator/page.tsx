"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { opslag } from "@/lib/sessie/api";
import { bewaarIdentiteit } from "@/lib/sessie/identiteit";
import { normaliseerCode } from "@/lib/sessie/codes";
import { Knop, Melding, Veld, invoerStijl } from "@/components/basis";
import { Cirkel } from "@/components/decoratie";

/**
 * Apart van `/deelnemen`: hier log je in met de beheercode, niet met de joincode.
 *
 * Dit is voor wie de sessie al startte en op een ander apparaat verder wil, of voor een collega
 * die het overneemt — niet voor wie voor het eerst meedoet. De facilitator is ook gewoon
 * deelnemer, dus na het inloggen land je op hetzelfde beheerscherm als bij het starten zelf.
 */
export default function FacilitatorPagina() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function inloggen() {
    if (normaliseerCode(code).length !== 10) {
      setFout("Een beheercode bestaat uit tien tekens.");
      return;
    }

    setBezig(true);
    setFout(null);
    try {
      const toegang = await opslag.facilitatorInloggen(code);
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}/beheer`);
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Inloggen mislukte.");
      setBezig(false);
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-md overflow-hidden px-5 py-10">
      <Cirkel hoek="rechtsboven" formaat={0.55} toon="zacht" />
      <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
        ← Terug
      </Link>
      <h1 className="display mt-4 text-3xl text-inkt">Facilitator inloggen</h1>
      <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
        Vul de beheercode in die je bij het starten van de sessie kreeg. Ben je zelf net
        begonnen, dan hoef je dit niet te doen — dan sta je er al in.
      </p>

      <div className="mt-7 space-y-5">
        <Veld label="Beheercode" hint="Anders dan de sessiecode: langer, en alleen voor de facilitator.">
          <input
            className={`${invoerStijl} text-center font-mono text-xl tracking-[0.2em] uppercase`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD234EFG"
            maxLength={14}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />
        </Veld>

        {fout ? <Melding toon="risico">{fout}</Melding> : null}

        <Knop onClick={inloggen} disabled={bezig} className="w-full">
          {bezig ? "Bezig…" : "Inloggen"}
        </Knop>
      </div>
    </main>
  );
}
