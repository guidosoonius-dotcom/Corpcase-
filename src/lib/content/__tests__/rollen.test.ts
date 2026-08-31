import { describe, expect, it } from "vitest";
import { rol, rolNaam, rolopdrachtVoorRol, rollen } from "../index";

/**
 * Een facilitator zonder rol (`rol_id: null`) mag nergens een letterlijke "null" of een lege
 * plek opleveren in lijsten en het rapport — dit toetst dat de helpers daarop zijn voorbereid.
 */
describe("rol-helpers met een lege rol", () => {
  it("rol() en rolopdrachtVoorRol() geven undefined terug voor null, niet een crash", () => {
    expect(rol(null)).toBeUndefined();
    expect(rol(undefined)).toBeUndefined();
    expect(rolopdrachtVoorRol(null)).toBeUndefined();
  });

  it("rolNaam() geeft een leesbare tekst voor null en anders de rolnaam", () => {
    expect(rolNaam(null)).toBe("Begeleidt, geen rol");
    expect(rolNaam(rollen.rollen[0].id)).toBe(rollen.rollen[0].naam);
  });
});
