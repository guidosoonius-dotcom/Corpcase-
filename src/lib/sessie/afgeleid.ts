import {
  bepaalKwadrant,
  bepaalPositie,
  berekenBudgetStand,
  berekenBusinessCase,
  type BusinessCase,
  type KwadrantId,
  type Positie,
} from "@/lib/waarde/berekening";
import type { DrivertypeId } from "@/lib/content/schemas";
import { cora, personasVoorOrganisatie, speelmodus, usecase as bibliotheekKaart } from "@/lib/content";
import {
  FASES,
  type DeelnemerRij,
  type Fase,
  type SessieState,
  type SessieUsecaseRij,
  type WaarderingRij,
} from "@/lib/supabase/types";

/**
 * Afgeleide waarden over een sessie: alles wat de schermen tonen maar niet in de database staat.
 *
 * Bewust pure functies over de state, zonder React of netwerk, zodat de spelregels los van de UI
 * te testen zijn.
 */

export type UsecaseBeeld = {
  usecase: SessieUsecaseRij;
  waardering: WaarderingRij | null;
  businessCase: BusinessCase | null;
  positie: Positie | null;
  kwadrant: KwadrantId | null;
  /** Hoeveel van de waardebepaling is ingevuld, 0 tot 1. Voedt de voortgang bij de facilitator. */
  volledigheid: number;
  signaalIds: string[];
  openHulpvragen: number;
  assists: number;
};

function driversVoorBerekening(waardering: WaarderingRij | null) {
  if (!waardering) return [];
  return waardering.drivers.map((d) => ({
    type: d.type as DrivertypeId,
    waarden: d.waarden,
  }));
}

export function businessCaseVan(
  waardering: WaarderingRij | null,
  onzekerheidPct: number,
): BusinessCase | null {
  if (!waardering || waardering.drivers.length === 0) return null;
  return berekenBusinessCase(
    driversVoorBerekening(waardering),
    waardering.kosten,
    onzekerheidPct,
  );
}

/**
 * De hoogste netto baat in de sessie, als ijkpunt voor de financiële as van de matrix.
 *
 * Relatief in plaats van absoluut: wat voor de ene corporatie een groot bedrag is, is dat voor de
 * andere niet, en een vaste schaal zou bij DUWO alles onderin duwen.
 */
export function hoogsteNettoBaat(state: SessieState): number | null {
  let hoogste: number | null = null;
  for (const waardering of state.waarderingen) {
    const bc = businessCaseVan(waardering, state.sessie.onzekerheid_pct);
    const netto = bc?.netto_baat?.verwacht;
    if (typeof netto === "number" && (hoogste === null || netto > hoogste)) hoogste = netto;
  }
  return hoogste;
}

function volledigheidVan(waardering: WaarderingRij | null): number {
  if (!waardering) return 0;

  const onderdelen: boolean[] = [
    Object.keys(waardering.kwalitatief).length > 0,
    Object.keys(waardering.haalbaarheid).length > 0,
    waardering.modus === "businesscase"
      ? waardering.drivers.length > 0
      : Object.keys(waardering.scorekaart).length > 0,
    waardering.kosten.eenmalig > 0 || waardering.kosten.jaarlijks > 0,
  ];
  return onderdelen.filter(Boolean).length / onderdelen.length;
}

export function beeldVan(state: SessieState, usecase: SessieUsecaseRij): UsecaseBeeld {
  const waardering = state.waarderingen.find((w) => w.usecase_id === usecase.id) ?? null;
  const businessCase = businessCaseVan(waardering, state.sessie.onzekerheid_pct);

  const positie = bepaalPositie({
    businessCase,
    hoogsteNettoBaatInSessie: hoogsteNettoBaat(state),
    kwalitatief: waardering?.kwalitatief ?? {},
    haalbaarheid: waardering?.haalbaarheid ?? {},
    scorekaart: waardering?.scorekaart ?? null,
  });

  const bijdragen = state.bijdragen.filter((b) => b.usecase_id === usecase.id);

  return {
    usecase,
    waardering,
    businessCase,
    positie,
    kwadrant: positie ? bepaalKwadrant(positie) : null,
    volledigheid: volledigheidVan(waardering),
    signaalIds: state.usecaseSignalen
      .filter((k) => k.usecase_id === usecase.id)
      .map((k) => k.signaal_id),
    openHulpvragen: bijdragen.filter((b) => b.soort === "hulpvraag" && !b.opgelost).length,
    assists: bijdragen.filter((b) => b.soort === "assist").length,
  };
}

export function alleBeelden(state: SessieState): UsecaseBeeld[] {
  return state.usecases.map((u) => beeldVan(state, u));
}

export function portfolio(state: SessieState): UsecaseBeeld[] {
  return alleBeelden(state).filter((b) => b.usecase.status === "portfolio");
}

export function budgetStand(state: SessieState) {
  return berekenBudgetStand(
    {
      geld_eur: state.sessie.budget_geld,
      verandercapaciteit_mensmaanden: state.sessie.budget_capaciteit,
    },
    state.allocaties.map((a) => ({
      usecase_id: a.usecase_id,
      geld_eur: a.geld_eur,
      capaciteit_mensmaanden: a.capaciteit_mensmaanden,
    })),
  );
}

// Dekking en teamscore ------------------------------------------------------

export type Dekking = {
  domeinenGedekt: string[];
  domeinenOngedekt: string[];
  personasGeraakt: string[];
  personasGemist: string[];
};

/**
 * Welke CORA-domeinen en huurderspersona's het team heeft geraakt.
 *
 * Dit is de tegenkracht tegen het bekende patroon dat een MT alleen praat over de onderwerpen
 * waar het toch al mee bezig is.
 */
export function dekking(state: SessieState): Dekking {
  const personas = personasVoorOrganisatie(state.sessie.organisatie_id);
  const geraakteDomeinen = new Set(state.usecases.map((u) => u.domein));

  const geraaktePersonas = new Set<string>();
  for (const koppeling of state.usecaseSignalen) {
    if (personas.some((k) => k.id === koppeling.signaal_id)) {
      geraaktePersonas.add(koppeling.signaal_id);
    }
  }
  // Een use case uit de bibliotheek draagt zijn persona's mee.
  for (const u of state.usecases) {
    const kaart = u.bibliotheek_id ? bibliotheekKaart(u.bibliotheek_id) : undefined;
    for (const persona of kaart?.personas ?? []) geraaktePersonas.add(persona);
  }

  return {
    domeinenGedekt: cora.domeinen.filter((d) => geraakteDomeinen.has(d.id)).map((d) => d.id),
    domeinenOngedekt: cora.domeinen.filter((d) => !geraakteDomeinen.has(d.id)).map((d) => d.id),
    personasGeraakt: personas.filter((k) => geraaktePersonas.has(k.id)).map((k) => k.id),
    personasGemist: personas.filter((k) => !geraaktePersonas.has(k.id)).map((k) => k.id),
  };
}

export type Teamscore = {
  totaal: number;
  onderdelen: { id: string; label: string; punten: number; maximum: number; toelichting: string }[];
};

/**
 * Eén teamscore, geen ranglijst tussen collega's.
 *
 * De score beloont alleen dingen die het resultaat echt beter maken: breed kijken, elkaar helpen,
 * onderbouwen en doorrekenen. Er zitten bewust geen punten op "veel use cases maken".
 */
export function teamscore(state: SessieState): Teamscore {
  const beelden = alleBeelden(state);
  const gedekt = dekking(state);

  const domeinPunten = gedekt.domeinenGedekt.length * 3;
  const domeinMax = cora.domeinen.length * 3;

  const personaAantal = gedekt.personasGeraakt.length + gedekt.personasGemist.length;
  const personaPunten = gedekt.personasGeraakt.length * 4;
  const personaMax = personaAantal * 4;

  const assists = state.bijdragen.filter((b) => b.soort === "assist").length;
  const assistPunten = assists * 5;
  const assistMax = Math.max(30, assistPunten);

  const challenges = state.bijdragen.filter((b) => b.soort === "challenge").length;
  const challengePunten = challenges * 4;
  const challengeMax = Math.max(20, challengePunten);

  const onderbouwd = beelden.filter((b) => b.signaalIds.length > 0).length;
  const onderbouwPunten = onderbouwd * 3;
  const onderbouwMax = Math.max(beelden.length * 3, 3);

  const doorgerekend = beelden.filter((b) => b.businessCase?.volledig).length;
  const modus = speelmodus(state.sessie.speelmodus);
  const doorrekenPunten = doorgerekend * 6;
  const doorrekenMax = Math.max(modus.businesscase_verplicht_aantal, 1) * 6;

  const opgelosteHulpvragen = state.bijdragen.filter(
    (b) => b.soort === "hulpvraag" && b.opgelost,
  ).length;
  const hulpPunten = opgelosteHulpvragen * 3;
  const hulpMax = Math.max(15, hulpPunten);

  const onderdelen = [
    {
      id: "domeinen",
      label: "Breedte",
      punten: domeinPunten,
      maximum: domeinMax,
      toelichting: `${gedekt.domeinenGedekt.length} van de ${cora.domeinen.length} CORA-domeinen geraakt`,
    },
    {
      id: "personas",
      label: "Huurdersblik",
      punten: personaPunten,
      maximum: personaMax,
      toelichting: `${gedekt.personasGeraakt.length} van de ${personaAantal} huurderstypen in beeld`,
    },
    {
      id: "onderbouwing",
      label: "Onderbouwing",
      punten: onderbouwPunten,
      maximum: onderbouwMax,
      toelichting:
        onderbouwd === 1
          ? "1 use case herleidbaar naar een signaal"
          : `${onderbouwd} use cases herleidbaar naar een signaal`,
    },
    {
      id: "doorrekening",
      label: "Doorrekening",
      punten: doorrekenPunten,
      maximum: doorrekenMax,
      toelichting:
        doorgerekend === 1
          ? "1 volledig doorgerekende business case"
          : `${doorgerekend} volledig doorgerekende business cases`,
    },
    {
      id: "assists",
      label: "Elkaar helpen",
      punten: assistPunten,
      maximum: assistMax,
      toelichting:
        assists === 1
          ? "1 aanvulling op andermans use case"
          : `${assists} aanvullingen op andermans use case`,
    },
    {
      id: "hulpvragen",
      label: "Vragen opgelost",
      punten: hulpPunten,
      maximum: hulpMax,
      toelichting:
        opgelosteHulpvragen === 1
          ? "1 hulpvraag beantwoord"
          : `${opgelosteHulpvragen} hulpvragen beantwoord`,
    },
    {
      id: "challenges",
      label: "Kritisch kijken",
      punten: challengePunten,
      maximum: challengeMax,
      toelichting:
        challenges === 1
          ? "1 aanname expliciet gemaakt"
          : `${challenges} aannames expliciet gemaakt`,
    },
  ];

  return { totaal: onderdelen.reduce((som, o) => som + o.punten, 0), onderdelen };
}

/** Hulpvragen die nog openstaan, met de rol die er waarschijnlijk antwoord op heeft. */
export function openHulpvragen(state: SessieState) {
  return state.bijdragen
    .filter((b) => b.soort === "hulpvraag" && !b.opgelost)
    .map((b) => ({
      bijdrage: b,
      vrager: state.deelnemers.find((d) => d.id === b.deelnemer_id) ?? null,
      usecase: state.usecases.find((u) => u.id === b.usecase_id) ?? null,
    }));
}

/** Deelnemers die de afgelopen twee minuten iets van zich lieten horen. */
export function aanwezig(state: SessieState, nu = Date.now()) {
  return state.deelnemers.filter(
    (d) => nu - new Date(d.laatst_gezien_op).getTime() < 2 * 60 * 1000,
  );
}

// Vrije fasenavigatie ---------------------------------------------------------

/** De fase die deze deelnemer daadwerkelijk bekijkt: zijn eigen keuze, anders de groep. */
export function eigenFase(deelnemer: DeelnemerRij, state: SessieState): Fase {
  return deelnemer.eigen_fase ?? state.sessie.fase;
}

/** Loopt deze deelnemer voor op waar de facilitator de groep heeft neergezet? */
export function looptVoor(deelnemer: DeelnemerRij, state: SessieState): boolean {
  return FASES.indexOf(eigenFase(deelnemer, state)) > FASES.indexOf(state.sessie.fase);
}

// Rolopdrachten -------------------------------------------------------------

export type OpdrachtOordeel = { gehaald: boolean; toelichting: string };

/**
 * Beoordeelt of een privé-rolopdracht is gelukt.
 *
 * De uitkomst is geen cijfer maar een gespreksopener bij de onthulling: als de informatiemanager
 * zijn opdracht niet haalde, staan er use cases in het portfolio zonder benoemde databron — en
 * dat is precies wat je wilt weten voordat je eraan begint.
 */
export function beoordeelRolopdracht(state: SessieState, controle: string): OpdrachtOordeel {
  const inPortfolio = portfolio(state);

  switch (controle) {
    case "elke_usecase_heeft_thema": {
      const zonder = inPortfolio.filter((b) => b.signaalIds.length === 0);
      return {
        gehaald: inPortfolio.length > 0 && zonder.length === 0,
        toelichting:
          zonder.length === 0
            ? "Elke use case in het portfolio is herleidbaar naar een signaal."
            : `${zonder.length} use ${zonder.length === 1 ? "case is" : "cases zijn"} niet herleidbaar naar een signaal.`,
      };
    }

    case "minimaal_twee_hoge_huurderswaarde": {
      const raakt = inPortfolio.filter(
        (b) => (b.waardering?.kwalitatief.huurderswaarde ?? 0) >= 4,
      );
      return {
        gehaald: raakt.length >= 2,
        toelichting: `${raakt.length} use ${raakt.length === 1 ? "case raakt" : "cases raken"} de bewoner direct merkbaar.`,
      };
    }

    case "minimaal_een_horizon_nu": {
      const nu = state.roadmap.filter((r) => r.horizon === "nu");
      return {
        gehaald: nu.length >= 1,
        toelichting:
          nu.length >= 1
            ? `${nu.length} use ${nu.length === 1 ? "case start" : "cases starten"} binnen zes maanden.`
            : "Er start niets binnen zes maanden; alles ligt verder weg.",
      };
    }

    case "helft_doorgerekend": {
      const doorgerekend = inPortfolio.filter((b) => b.businessCase?.volledig).length;
      const nodig = Math.ceil(inPortfolio.length / 2);
      return {
        gehaald: inPortfolio.length > 0 && doorgerekend >= nodig,
        toelichting: `${doorgerekend} van de ${inPortfolio.length} zijn volledig doorgerekend; nodig was ${nodig}.`,
      };
    }

    case "elke_usecase_heeft_databron": {
      const zonder = inPortfolio.filter((b) => b.usecase.benodigde_data.length === 0);
      return {
        gehaald: inPortfolio.length > 0 && zonder.length === 0,
        toelichting:
          zonder.length === 0
            ? "Elke use case in het portfolio heeft een benoemde databron."
            : `${zonder.length} use ${zonder.length === 1 ? "case gaat" : "cases gaan"} het portfolio in zonder benoemde databron.`,
      };
    }

    case "privacy_aandachtspunt_vastgelegd": {
      const raaktPersoonsgegevens = inPortfolio.filter((b) =>
        b.usecase.benodigde_data.some((d) =>
          /relatie|persoon|huurder|betaal|contract|verbruik|dossier|inschrijving/i.test(d),
        ),
      );
      const zonder = raaktPersoonsgegevens.filter(
        (b) =>
          b.usecase.aandachtspunten.length === 0 &&
          !state.bijdragen.some((c) => c.usecase_id === b.usecase.id && c.soort === "challenge"),
      );
      return {
        gehaald: zonder.length === 0,
        toelichting:
          zonder.length === 0
            ? "Elke use case met persoonsgegevens heeft een vastgelegd aandachtspunt of kanttekening."
            : `${zonder.length} use ${zonder.length === 1 ? "case gebruikt" : "cases gebruiken"} persoonsgegevens zonder vastgelegd aandachtspunt.`,
      };
    }

    default:
      return { gehaald: false, toelichting: `Onbekende controle: ${controle}` };
  }
}

/** Alle aannames en kanttekeningen die tijdens de sessie expliciet zijn gemaakt. */
export function aannames(state: SessieState) {
  return state.bijdragen
    .filter((b) => b.soort === "challenge")
    .map((b) => ({
      bijdrage: b,
      usecase: state.usecases.find((u) => u.id === b.usecase_id) ?? null,
      auteur: state.deelnemers.find((d) => d.id === b.deelnemer_id) ?? null,
    }));
}

/** Use cases die zijn doorgerekend maar nog velden missen; het rapport moet dat eerlijk melden. */
export function onvolledigeBusinessCases(state: SessieState) {
  return alleBeelden(state).filter(
    (b) => b.businessCase !== null && !b.businessCase.volledig,
  );
}
