import { describe, expect, it } from "vitest";
import { maakSessie } from "../lokale-kern";
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
