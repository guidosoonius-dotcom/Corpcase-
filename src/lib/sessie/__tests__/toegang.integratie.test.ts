import { afterAll, describe, expect, it } from "vitest";
import { maakClient } from "@/lib/supabase/client";
import {
  facilitatorInloggen,
  haalState,
  maakSessie,
  neemDeel,
  voegUsecaseToe,
  zetFase,
  zoekSessie,
} from "../opslag-supabase";
import type { Toegang } from "../soorten";

/**
 * Integratietest tegen het echte Supabase-project.
 *
 * Deze test bestaat om één ding te bewijzen: dat het toegangsmodel echt sluit. Er zijn geen
 * accounts, dus de enige verdediging is de combinatie van deelnemertoken en beheercode in de
 * RLS-policies. Als die lekt, kan iedereen met de publieke sleutel in andermans sessie kijken.
 *
 * De test slaat zichzelf over als de omgevingsvariabelen ontbreken, zodat `npm test` ook werkt
 * zonder toegang tot het project.
 */

/**
 * De test draait alleen als het project daadwerkelijk bereikbaar is. In afgeschermde
 * omgevingen (CI zonder netwerk, een sandbox met een egress-allowlist) wordt hij overgeslagen
 * in plaats van rood te worden: een netwerkbeperking is geen defect in de applicatie.
 */
async function projectBereikbaar(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;

  try {
    const antwoord = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
    });
    return antwoord.ok;
  } catch {
    return false;
  }
}

const heeftOmgeving = await projectBereikbaar();

if (!heeftOmgeving) {
  console.warn(
    "Toegangstests overgeslagen: het Supabase-project is vanuit deze omgeving niet bereikbaar.",
  );
}

const opruimen: Toegang[] = [];

async function nieuweSessie(titel: string): Promise<Toegang> {
  const toegang = await maakSessie({
    titel,
    organisatieId: "duwo",
    speelmodusId: "kort",
    facilitatorNaam: "Testfacilitator",
    facilitatorRolId: "bestuurder",
  });
  opruimen.push(toegang);
  return toegang;
}

describe.skipIf(!heeftOmgeving)("toegangsmodel", () => {
  afterAll(async () => {
    for (const toegang of opruimen) {
      const client = maakClient(toegang.identiteit);
      await client.from("sessies").delete().eq("id", toegang.sessie.id);
    }
  });

  it("maakt een sessie met een facilitator die meteen meespeelt", async () => {
    const { sessie, deelnemer, identiteit } = await nieuweSessie("Integratietest sessie");

    expect(sessie.join_code).toHaveLength(6);
    // De echte beheercode reist alleen in `identiteit`, nooit in `sessie` — zie de test
    // "laat de beheercode nergens lekken buiten de identiteit van de facilitator" hieronder.
    expect(sessie.beheer_code).toBeNull();
    expect(identiteit.beheerCode).toHaveLength(10);
    expect(sessie.fase).toBe("lobby");
    expect(deelnemer.is_facilitator).toBe(true);
    // De facilitator krijgt net als iedereen een privé-rolopdracht.
    expect(deelnemer.rolopdracht_id).toBe("ro-bestuurder");
    // De uitgangspunten van DUWO zijn overgenomen, zodat de business cases kunnen rekenen.
    expect(sessie.uitgangspunten.uurtarief_intern).toBe(65);
  });

  it("laat een tweede speler joinen met de join-code", async () => {
    const eerste = await nieuweSessie("Sessie met twee spelers");

    const tweede = await neemDeel({
      code: eerste.sessie.join_code,
      naam: "Tweede speler",
      rolId: "informatiemanager",
    });

    expect(tweede.deelnemer.is_facilitator).toBe(false);
    expect(tweede.deelnemer.token).not.toBe(eerste.deelnemer.token);

    // Beide spelers zien elkaar in dezelfde sessie.
    const state = await haalState(tweede.identiteit, eerste.sessie.id);
    expect(state.deelnemers).toHaveLength(2);
    expect(state.deelnemers.map((deelnemer) => deelnemer.naam).sort()).toEqual([
      "Testfacilitator",
      "Tweede speler",
    ]);
  });

  it("ziet werk van een medespeler zodra het is opgeslagen", async () => {
    const eerste = await nieuweSessie("Sessie met gedeeld werk");
    const tweede = await neemDeel({
      code: eerste.sessie.join_code,
      naam: "Manager Wonen",
      rolId: "manager-wonen",
    });

    await voegUsecaseToe(tweede.identiteit, {
      sessieId: eerste.sessie.id,
      eigenaarId: tweede.deelnemer.id,
      titel: "Proactieve statusupdates",
      domein: "klantbeheer",
      bibliotheekId: "uc-04",
    });

    const gezienDoorFacilitator = await haalState(eerste.identiteit, eerste.sessie.id);
    expect(gezienDoorFacilitator.usecases).toHaveLength(1);
    expect(gezienDoorFacilitator.usecases[0].titel).toBe("Proactieve statusupdates");
  });

  it("geeft een deelnemer van sessie A geen toegang tot sessie B", async () => {
    const a = await nieuweSessie("Sessie A");
    const b = await nieuweSessie("Sessie B");

    await voegUsecaseToe(b.identiteit, {
      sessieId: b.sessie.id,
      eigenaarId: b.deelnemer.id,
      titel: "Vertrouwelijk in B",
      domein: "besturing",
    });

    // Lezen met het token van A levert niets uit B op.
    const clientVanA = maakClient({ deelnemerToken: a.deelnemer.token });
    const { data: sessiesVanB } = await clientVanA.from("sessies").select("*").eq("id", b.sessie.id);
    expect(sessiesVanB).toEqual([]);

    const { data: usecasesVanB } = await clientVanA
      .from("sessie_usecases")
      .select("*")
      .eq("sessie_id", b.sessie.id);
    expect(usecasesVanB).toEqual([]);

    // En schrijven in B lukt evenmin.
    const { error } = await clientVanA.from("sessie_usecases").insert({
      sessie_id: b.sessie.id,
      eigenaar_id: b.deelnemer.id,
      titel: "Ingebroken",
      domein: "besturing",
    });
    expect(error).not.toBeNull();
  });

  it("geeft zonder enige identiteit nul rijen terug", async () => {
    const a = await nieuweSessie("Sessie zonder toeschouwers");

    const anoniem = maakClient({});
    const { data: sessies } = await anoniem.from("sessies").select("*");
    expect(sessies).toEqual([]);

    const { data: deelnemers } = await anoniem.from("deelnemers").select("*");
    expect(deelnemers).toEqual([]);

    // Zelfs gericht zoeken op het id van een bestaande sessie levert niets op.
    const { data: gericht } = await anoniem.from("sessies").select("*").eq("id", a.sessie.id);
    expect(gericht).toEqual([]);
  });

  it("laat de sessie vinden op join-code, maar toont dan nog geen inhoud", async () => {
    const a = await nieuweSessie("Sessie om te vinden");

    const gevonden = await zoekSessie(a.sessie.join_code);
    expect(gevonden?.id).toBe(a.sessie.id);
    expect(gevonden?.beheer_code).toBeNull();

    // Met alleen de join-code zie je de sessie zelf, maar niet wat erin gebeurt.
    const metJoinCode = maakClient({ joinCode: a.sessie.join_code });
    const { data: usecases } = await metJoinCode.from("sessie_usecases").select("*");
    expect(usecases).toEqual([]);
  });

  /**
   * De joincode is juist bedoeld om rond te sturen (whatsapp, mail). Deze test bewijst dat wie
   * hem kent zich niet met een handgeschreven verzoek tot facilitator kan bevorderen: de
   * publieke sleutel en de URL staan in een publieke repo, dus "de app vraagt de kolom nooit op"
   * is geen verdediging — het moet op rijniveau in de database dichtzitten.
   */
  it("laat de beheercode nergens lekken buiten de identiteit van de facilitator", async () => {
    const a = await nieuweSessie("Sessie met een gevoelige beheercode");
    const speler = await neemDeel({
      code: a.sessie.join_code,
      naam: "Gewone speler",
      rolId: "manager-vastgoed",
    });

    // Een gewone deelnemer krijgt hem nooit terug, ook niet via de volle sessiestate.
    const state = await haalState(speler.identiteit, a.sessie.id);
    expect(state.sessie.beheer_code).toBeNull();

    // Rechtstreeks bij de basistabel met alleen de joincode: geen rij, dus ook geen kolom.
    const metJoinCode = maakClient({ joinCode: a.sessie.join_code });
    const { data: viaBasistabel } = await metJoinCode
      .from("sessies")
      .select("beheer_code")
      .eq("id", a.sessie.id);
    expect(viaBasistabel).toEqual([]);

    // Ook met een geldig deelnemertoken blijft de basistabel dicht: alleen de facilitator komt er
    // via `sessies_lezen` in.
    const metToken = maakClient(speler.identiteit);
    const { data: viaToken } = await metToken.from("sessies").select("beheer_code").eq("id", a.sessie.id);
    expect(viaToken).toEqual([]);

    // De publieke view heeft de kolom niet eens: die vraag is geen toegangsfout meer, maar een
    // kolom die niet bestaat.
    const { error: viaView } = await metToken
      .from("sessies_publiek")
      .select("beheer_code")
      .eq("id", a.sessie.id);
    expect(viaView).not.toBeNull();
  });

  it("laat de facilitator op een ander apparaat opnieuw inloggen met alleen de beheercode", async () => {
    const a = await nieuweSessie("Sessie om opnieuw in te loggen");

    const opnieuw = await facilitatorInloggen(a.identiteit.beheerCode!);
    expect(opnieuw.deelnemer.id).toBe(a.deelnemer.id);
    expect(opnieuw.identiteit.deelnemerToken).toBe(a.deelnemer.token);
    expect(opnieuw.sessie.beheer_code).toBeNull();

    // Die herwonnen identiteit besturen ook echt: de fase verzetten lukt ermee.
    await zetFase(opnieuw.identiteit, a.sessie.id, "verkennen");
    const state = await haalState(a.identiteit, a.sessie.id);
    expect(state.sessie.fase).toBe("verkennen");

    // Een onbekende code levert geen toegang op.
    await expect(facilitatorInloggen("GEENGELDIGECODE")).rejects.toThrow();
  });

  it("staat fasebesturing alleen toe met de beheercode", async () => {
    const a = await nieuweSessie("Sessie met fasebesturing");
    const speler = await neemDeel({
      code: a.sessie.join_code,
      naam: "Gewone speler",
      rolId: "manager-vastgoed",
    });

    // Een gewone speler kan de fase niet verzetten: de update raakt geen rijen.
    await zetFase(speler.identiteit, a.sessie.id, "identificatie");
    let state = await haalState(a.identiteit, a.sessie.id);
    expect(state.sessie.fase).toBe("lobby");

    // De facilitator wel.
    await zetFase(a.identiteit, a.sessie.id, "verkennen");
    state = await haalState(a.identiteit, a.sessie.id);
    expect(state.sessie.fase).toBe("verkennen");
  });
});
