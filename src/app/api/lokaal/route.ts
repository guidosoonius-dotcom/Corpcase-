import { NextResponse } from "next/server";
import * as kern from "@/lib/sessie/lokale-kern";
import { SessieFout, type Identiteit } from "@/lib/sessie/soorten";
import type { Fase, UsecaseStatus } from "@/lib/supabase/types";

/**
 * Endpoint van de offline modus.
 *
 * Eén POST met een actienaam en argumenten, in plaats van twintig losse routes: de datalaag is
 * al vastgelegd in de Opslag-interface, dus deze route hoeft alleen te dispatchen. De identiteit
 * komt in dezelfde headers als bij Supabase, zodat beide modi zich hetzelfde gedragen.
 */

export const dynamic = "force-dynamic";

function identiteitUit(request: Request): Identiteit {
  return {
    deelnemerToken: request.headers.get("x-deelnemer-token"),
    joinCode: request.headers.get("x-join-code"),
    beheerCode: request.headers.get("x-beheer-code"),
  };
}

type Handler = (identiteit: Identiteit, argumenten: Record<string, unknown>) => unknown;

/**
 * De argumenten komen als JSON binnen en zijn dus per definitie onbetrouwbaar getypeerd. De kern
 * controleert zelf op toegang en bestaan; de casts hier zijn puur vormelijk.
 */
function als<T>(argumenten: Record<string, unknown>): T {
  return argumenten as T;
}

const acties: Record<string, Handler> = {
  maakSessie: (_identiteit, a) => kern.maakSessie(als(a)),
  zoekSessie: (_identiteit, a) => kern.zoekSessie(als<{ code: string }>(a).code),
  neemDeel: (_identiteit, a) => kern.neemDeel(als(a)),
  facilitatorInloggen: (_identiteit, a) =>
    kern.facilitatorInloggen(als<{ beheerCode: string }>(a).beheerCode),

  haalState: (i, a) => kern.haalState(i, als<{ sessieId: string }>(a).sessieId),

  zetFase: (i, a) => {
    const { sessieId, fase } = als<{ sessieId: string; fase: Fase }>(a);
    return kern.zetFase(i, sessieId, fase);
  },
  zetFaseDeadline: (i, a) => {
    const { sessieId, deadline } = als<{ sessieId: string; deadline: string | null }>(a);
    return kern.zetFaseDeadline(i, sessieId, deadline);
  },
  wijzigSessie: (i, a) => {
    const { sessieId, velden } = als<{ sessieId: string; velden: Parameters<typeof kern.wijzigSessie>[2] }>(a);
    return kern.wijzigSessie(i, sessieId, velden);
  },
  zetEigenFase: (i, a) => {
    const { deelnemerId, fase } = als<{ deelnemerId: string; fase: Fase | null }>(a);
    return kern.zetEigenFase(i, deelnemerId, fase);
  },

  selecteerSignaal: (i, a) => kern.selecteerSignaal(i, als(a)),
  verwijderSignaalSelectie: (i, a) => kern.verwijderSignaalSelectie(i, als(a)),

  voegUsecaseToe: (i, a) => kern.voegUsecaseToe(i, als(a)),
  koppelSignalen: (i, a) => {
    const { usecaseId, signaalIds } = als<{ usecaseId: string; signaalIds: string[] }>(a);
    return kern.koppelSignalen(i, usecaseId, signaalIds);
  },
  ontkoppelSignaal: (i, a) => {
    const { usecaseId, signaalId } = als<{ usecaseId: string; signaalId: string }>(a);
    return kern.ontkoppelSignaal(i, usecaseId, signaalId);
  },
  wijzigUsecase: (i, a) => {
    const { usecaseId, velden } = als<{ usecaseId: string; velden: Parameters<typeof kern.wijzigUsecase>[2] }>(a);
    return kern.wijzigUsecase(i, usecaseId, velden);
  },
  zetUsecaseStatus: (i, a) => {
    const { usecaseId, status } = als<{ usecaseId: string; status: UsecaseStatus }>(a);
    return kern.zetUsecaseStatus(i, usecaseId, status);
  },
  verwijderUsecase: (i, a) => kern.verwijderUsecase(i, als<{ usecaseId: string }>(a).usecaseId),

  bewaarWaardering: (i, a) => kern.bewaarWaardering(i, als(a)),

  voegBijdrageToe: (i, a) => kern.voegBijdrageToe(i, als(a)),
  markeerOpgelost: (i, a) => {
    const { bijdrageId, opgelost } = als<{ bijdrageId: string; opgelost?: boolean }>(a);
    return kern.markeerOpgelost(i, bijdrageId, opgelost);
  },

  bewaarAllocatie: (i, a) => kern.bewaarAllocatie(i, als(a)),
  bewaarBesluit: (i, a) => kern.bewaarBesluit(i, als(a)),

  bewaarRoadmapItem: (i, a) => kern.bewaarRoadmapItem(i, als(a)),
  verwijderRoadmapItem: (i, a) =>
    kern.verwijderRoadmapItem(i, als<{ usecaseId: string }>(a).usecaseId),

  meldAanwezig: (i, a) => kern.meldAanwezig(i, als<{ deelnemerId: string }>(a).deelnemerId),
};

export async function POST(request: Request) {
  let lichaam: { actie?: string; argumenten?: Record<string, unknown> };
  try {
    lichaam = await request.json();
  } catch {
    return NextResponse.json({ fout: "Onleesbaar verzoek." }, { status: 400 });
  }

  const uitvoeren = lichaam.actie ? acties[lichaam.actie] : undefined;
  if (!uitvoeren) {
    return NextResponse.json({ fout: `Onbekende actie: ${lichaam.actie}` }, { status: 400 });
  }

  try {
    const resultaat = uitvoeren(identiteitUit(request), lichaam.argumenten ?? {});
    return NextResponse.json({ resultaat: resultaat ?? null });
  } catch (fout) {
    if (fout instanceof SessieFout) {
      return NextResponse.json({ fout: fout.message }, { status: 403 });
    }
    const bericht = fout instanceof Error ? fout.message : "Onbekende fout";
    return NextResponse.json({ fout: bericht }, { status: 500 });
  }
}
