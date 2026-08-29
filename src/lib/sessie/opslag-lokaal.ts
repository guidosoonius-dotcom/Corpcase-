import type {
  BijdrageRij,
  Fase,
  SessieRij,
  SessieState,
  SessieUsecaseRij,
  UsecaseStatus,
} from "@/lib/supabase/types";
import {
  SessieFout,
  type AllocatieInvoer,
  type BesluitInvoer,
  type BijdrageInvoer,
  type Identiteit,
  type NieuweSessie,
  type NieuweUsecase,
  type Opslag,
  type RoadmapInvoer,
  type SessieVelden,
  type SignaalInvoer,
  type Toegang,
  type UsecaseVelden,
  type WaarderingInvoer,
} from "./soorten";

/**
 * Opslag-implementatie van de offline modus.
 *
 * Praat met /api/lokaal, waar de sessie in het geheugen van de server staat. Dezelfde
 * identiteitsheaders als bij Supabase, zodat de rest van de applicatie geen verschil merkt.
 */

async function roep<T>(actie: string, identiteit: Identiteit, argumenten: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (identiteit.deelnemerToken) headers["x-deelnemer-token"] = identiteit.deelnemerToken;
  if (identiteit.joinCode) headers["x-join-code"] = identiteit.joinCode;
  if (identiteit.beheerCode) headers["x-beheer-code"] = identiteit.beheerCode;

  const antwoord = await fetch("/api/lokaal", {
    method: "POST",
    headers,
    body: JSON.stringify({ actie, argumenten }),
  });

  const lichaam = (await antwoord.json()) as { resultaat?: T; fout?: string };
  if (!antwoord.ok) throw new SessieFout(lichaam.fout ?? `${actie} mislukt.`);
  return lichaam.resultaat as T;
}

export const lokaleOpslag: Opslag = {
  maakSessie: (invoer: NieuweSessie) => roep<Toegang>("maakSessie", {}, invoer),
  zoekSessie: (code: string) => roep<SessieRij | null>("zoekSessie", {}, { code }),
  neemDeel: (args) => roep<Toegang>("neemDeel", {}, args),
  facilitatorInloggen: (beheerCode) =>
    roep<Toegang>("facilitatorInloggen", {}, { beheerCode }),
  haalState: (identiteit, sessieId) =>
    roep<SessieState>("haalState", identiteit, { sessieId }),

  zetFase: (identiteit, sessieId, fase: Fase) =>
    roep<void>("zetFase", identiteit, { sessieId, fase }),
  zetFaseDeadline: (identiteit, sessieId, deadline) =>
    roep<void>("zetFaseDeadline", identiteit, {
      sessieId,
      deadline: deadline?.toISOString() ?? null,
    }),
  wijzigSessie: (identiteit, sessieId, velden: SessieVelden) =>
    roep<void>("wijzigSessie", identiteit, { sessieId, velden }),
  zetEigenFase: (identiteit, deelnemerId, fase: Fase | null) =>
    roep<void>("zetEigenFase", identiteit, { deelnemerId, fase }),

  selecteerSignaal: (identiteit, invoer: SignaalInvoer) =>
    roep<void>("selecteerSignaal", identiteit, invoer),
  verwijderSignaalSelectie: (identiteit, args) =>
    roep<void>("verwijderSignaalSelectie", identiteit, args),

  voegUsecaseToe: (identiteit, invoer: NieuweUsecase) =>
    roep<SessieUsecaseRij>("voegUsecaseToe", identiteit, invoer),
  koppelSignalen: (identiteit, usecaseId, signaalIds) =>
    roep<void>("koppelSignalen", identiteit, { usecaseId, signaalIds }),
  ontkoppelSignaal: (identiteit, usecaseId, signaalId) =>
    roep<void>("ontkoppelSignaal", identiteit, { usecaseId, signaalId }),
  wijzigUsecase: (identiteit, usecaseId, velden: UsecaseVelden) =>
    roep<void>("wijzigUsecase", identiteit, { usecaseId, velden }),
  zetUsecaseStatus: (identiteit, usecaseId, status: UsecaseStatus) =>
    roep<void>("zetUsecaseStatus", identiteit, { usecaseId, status }),
  verwijderUsecase: (identiteit, usecaseId) =>
    roep<void>("verwijderUsecase", identiteit, { usecaseId }),

  bewaarWaardering: (identiteit, invoer: WaarderingInvoer) =>
    roep<void>("bewaarWaardering", identiteit, invoer),

  voegBijdrageToe: (identiteit, invoer: BijdrageInvoer) =>
    roep<BijdrageRij>("voegBijdrageToe", identiteit, invoer),
  markeerOpgelost: (identiteit, bijdrageId, opgelost = true) =>
    roep<void>("markeerOpgelost", identiteit, { bijdrageId, opgelost }),

  bewaarAllocatie: (identiteit, invoer: AllocatieInvoer) =>
    roep<void>("bewaarAllocatie", identiteit, invoer),
  bewaarBesluit: (identiteit, invoer: BesluitInvoer) =>
    roep<void>("bewaarBesluit", identiteit, invoer),

  bewaarRoadmapItem: (identiteit, invoer: RoadmapInvoer) =>
    roep<void>("bewaarRoadmapItem", identiteit, invoer),
  verwijderRoadmapItem: (identiteit, usecaseId) =>
    roep<void>("verwijderRoadmapItem", identiteit, { usecaseId }),

  meldAanwezig: (identiteit, deelnemerId) =>
    roep<void>("meldAanwezig", identiteit, { deelnemerId }),
};
