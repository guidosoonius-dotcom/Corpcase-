import { describe, expect, it } from "vitest";
import { haalState, maakSessie, voegEigenUitdagingToe } from "../lokale-kern";
import { organisaties, speelmodi } from "@/lib/content";

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
