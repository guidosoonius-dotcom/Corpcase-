import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  haalState,
  lijstAlleSessies,
  maakSessie,
  neemDeel,
  verwijderSessie,
  voegEigenUitdagingToe,
} from "../lokale-kern";
import { organisaties, rollen, speelmodi } from "@/lib/content";
import { SessieFout } from "../soorten";

/**
 * Een facilitator kan bij het starten kiezen om alleen te begeleiden, zonder zelf een rol te
 * spelen (`facilitatorRolId: null`). Dat moet een deelnemer zonder rol en zonder privé-opdracht
 * opleveren — niet een gecrashte insert of een letterlijke "null" ergens in de UI.
 */
describe("maakSessie zonder facilitatorrol", () => {
  it("maakt een facilitator zonder rol_id en zonder rolopdracht aan", () => {
    const toegang = maakSessie({
      titel: "Testsessie",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Testfacilitator",
      facilitatorRolId: null,
    });

    expect(toegang.deelnemer.rol_id).toBeNull();
    expect(toegang.deelnemer.rolopdracht_id).toBeNull();
    expect(toegang.deelnemer.is_facilitator).toBe(true);
  });

  it("blijft een rol en rolopdracht toekennen als de facilitator wél meespeelt", () => {
    const toegang = maakSessie({
      titel: "Testsessie",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Testfacilitator",
      facilitatorRolId: "bestuurder",
    });

    expect(toegang.deelnemer.rol_id).toBe("bestuurder");
  });
});

/**
 * Zelf een uitdaging toevoegen in Verkennen: de kaart moet gedeeld zijn (voor iedereen in de
 * sessie zichtbaar, net als de rest) en de auteur herkent zijn eigen kaart meteen — zonder dat
 * hij hem apart nog hoeft aan te tikken.
 */
describe("voegEigenUitdagingToe", () => {
  it("voegt een gedeelde kaart toe en herkent hem meteen namens de auteur", () => {
    const toegang = maakSessie({
      titel: "Testsessie",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Guido",
      facilitatorRolId: "bestuurder",
    });
    const identiteit = { deelnemerToken: toegang.identiteit.deelnemerToken };

    const kaart = voegEigenUitdagingToe(identiteit, {
      sessieId: toegang.sessie.id,
      deelnemerId: toegang.deelnemer.id,
      titel: "Te weinig grip op leegstand tussen twee huurders",
      tekst: "Niemand ziet het patroon over complexen heen.",
    });

    expect(kaart.lens).toBe("uitdaging");
    expect(kaart.titel).toBe("Te weinig grip op leegstand tussen twee huurders");

    const state = haalState(identiteit, toegang.sessie.id);
    expect(state.eigenSignalen).toHaveLength(1);
    expect(state.eigenSignalen[0].id).toBe(kaart.id);

    const eigenSelectie = state.selecties.find(
      (s) => s.signaal_id === kaart.id && s.deelnemer_id === toegang.deelnemer.id,
    );
    expect(eigenSelectie).toBeDefined();
    expect(eigenSelectie?.herkenning).toBe(3);
  });
});

/**
 * Het facilitatoroverzicht (/facilitator) werkt achter een gedeeld wachtwoord, niet achter een
 * per-sessie-identiteit — de enige plek in deze module die dat doet. `verwijderSessie` blijft wél
 * gewoon identiteitsgebonden, zoals elke andere mutatie.
 */
describe("lijstAlleSessies en verwijderSessie", () => {
  let eerdereWachtwoord: string | undefined;
  beforeAll(() => {
    eerdereWachtwoord = process.env.FACILITATOR_WACHTWOORD;
    process.env.FACILITATOR_WACHTWOORD = "geheim";
  });
  afterAll(() => {
    if (eerdereWachtwoord === undefined) delete process.env.FACILITATOR_WACHTWOORD;
    else process.env.FACILITATOR_WACHTWOORD = eerdereWachtwoord;
  });

  it("weigert een onjuist wachtwoord", () => {
    expect(() => lijstAlleSessies("verkeerd")).toThrow(SessieFout);
  });

  it("toont een net aangemaakte sessie in het overzicht", () => {
    const toegang = maakSessie({
      titel: "Overzichtstest",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Guido",
      facilitatorRolId: "bestuurder",
    });

    const overzicht = lijstAlleSessies("geheim");
    const gevonden = overzicht.find((s) => s.id === toegang.sessie.id);
    expect(gevonden?.titel).toBe("Overzichtstest");
    expect(gevonden?.beheer_code).toBe(toegang.identiteit.beheerCode);
    expect(gevonden?.deelnemers_aantal).toBe(1);
  });

  it("weigert verwijderSessie voor wie geen facilitator is", () => {
    const toegang = maakSessie({
      titel: "Beveiligingstest",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Guido",
      facilitatorRolId: null,
    });
    const deelnemerToegang = neemDeel({
      code: toegang.sessie.join_code,
      naam: "Marieke",
      rolId: rollen.rollen[1].id,
    });

    expect(() =>
      verwijderSessie(
        { deelnemerToken: deelnemerToegang.identiteit.deelnemerToken },
        toegang.sessie.id,
      ),
    ).toThrow(SessieFout);
    // De sessie bestaat na de geweigerde poging nog gewoon.
    expect(haalState(toegang.identiteit, toegang.sessie.id).sessie.id).toBe(toegang.sessie.id);
  });

  it("verwijdert de sessie voor de facilitator, onomkeerbaar", () => {
    const toegang = maakSessie({
      titel: "Verwijdertest",
      organisatieId: organisaties[0].id,
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Guido",
      facilitatorRolId: "bestuurder",
    });

    verwijderSessie(toegang.identiteit, toegang.sessie.id);

    expect(() => haalState(toegang.identiteit, toegang.sessie.id)).toThrow(SessieFout);
    expect(lijstAlleSessies("geheim").some((s) => s.id === toegang.sessie.id)).toBe(false);
  });
});
