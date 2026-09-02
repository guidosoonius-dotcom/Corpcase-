import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import type { SessieRij } from "@/lib/supabase/types";
import type { FacilitatorSessieOverzicht } from "@/lib/sessie/soorten";

/**
 * Het facilitatoroverzicht: alle sessies, achter een gedeeld wachtwoord.
 *
 * Enige plek die de service-role-sleutel aanroept (via serviceClient()) — zie de toelichting
 * daar. Wachtwoord gaat in het body van een POST, niet als queryparameter, zodat hij niet in
 * serverlogs of browsergeschiedenis belandt. Geen sessie/cookie-laag: net als een beheercode is
 * dit "wie het wachtwoord heeft, mag", niet meer dan dat.
 */

export const dynamic = "force-dynamic";

function wachtwoordKlopt(opgegeven: string): boolean {
  const verwacht = process.env.FACILITATOR_WACHTWOORD;
  return Boolean(verwacht) && opgegeven === verwacht;
}

export async function POST(request: Request) {
  let lichaam: { wachtwoord?: string };
  try {
    lichaam = await request.json();
  } catch {
    return NextResponse.json({ fout: "Onleesbaar verzoek." }, { status: 400 });
  }

  if (!lichaam.wachtwoord || !wachtwoordKlopt(lichaam.wachtwoord)) {
    return NextResponse.json({ fout: "Onjuist wachtwoord." }, { status: 401 });
  }

  let data: (SessieRij & { deelnemers: { count: number }[] })[] | null;
  try {
    const client = serviceClient();
    const resultaat = await client
      .from("sessies")
      .select("*, deelnemers(count)")
      .order("aangemaakt_op", { ascending: false });
    if (resultaat.error) {
      return NextResponse.json({ fout: resultaat.error.message }, { status: 500 });
    }
    data = resultaat.data as typeof data;
  } catch (fout) {
    const bericht = fout instanceof Error ? fout.message : "Onbekende fout";
    return NextResponse.json({ fout: bericht }, { status: 500 });
  }

  const sessies: FacilitatorSessieOverzicht[] = (data ?? []).map((s) => ({
    id: s.id,
    titel: s.titel,
    spelsoort: s.spelsoort,
    speelmodus: s.speelmodus,
    fase: s.fase,
    join_code: s.join_code,
    beheer_code: s.beheer_code ?? "",
    deelnemers_aantal: s.deelnemers?.[0]?.count ?? 0,
    aangemaakt_op: s.aangemaakt_op,
    afgerond_op: s.afgerond_op,
  }));

  return NextResponse.json({ sessies });
}
