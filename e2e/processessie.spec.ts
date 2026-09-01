import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * De processessie: het tweede spel.
 *
 * Deze test bewaakt vooral de fundering. De twee spellen delen de sessiemachinerie maar hebben een
 * eigen fasereeks, en dat is precies het soort onderscheid dat stilletjes kan omvallen — een
 * gedeelde `FASES`-lijst die ergens toch weer wordt aangeroepen, of een stippenbalk die de fases
 * van het andere spel toont. Hier wordt daarom expliciet getoetst dat een processessie zijn eigen
 * zeven fases doorloopt en nergens een use-casefase laat zien.
 */

async function nieuweSpeler(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

/** De fases van de processessie, in speelvolgorde, zoals de facilitator ze doorloopt. */
const PROCESFASES = [
  "Proceskeuze",
  "Afpellen",
  "Diagnose",
  "Herontwerp",
  "Doorrekenen",
  "Besluit",
] as const;

test("een processessie doorloopt zijn eigen fases, niet die van de use-casesessie", async ({
  browser,
}) => {
  const facilitator = await nieuweSpeler(browser);
  const wonen = await nieuweSpeler(browser);

  // --- Een processessie starten --------------------------------------------
  await facilitator.goto("/start");
  await facilitator.getByRole("radio", { name: /^Processen/ }).check();
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByLabel("Jouw rol").selectOption({ label: "Bestuurder" });
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);

  const code = (await facilitator.getByLabel(/Sessiecode/).innerText()).trim();
  expect(code).toHaveLength(6);

  // --- Een speler doet mee --------------------------------------------------
  await wonen.goto(`/deelnemen?code=${code}`);
  await wonen.getByLabel("Jouw naam").fill("Marieke");
  await wonen.getByLabel("Jouw rol").selectOption({ label: "Manager Wonen / Klant" });
  await wonen.getByRole("button", { name: "Meedoen" }).click();
  await wonen.waitForURL(/\/sessie\/[0-9a-f-]+$/);

  await expect(facilitator.getByText("Marieke")).toBeVisible();

  // --- De fasereeks is die van dít spel ------------------------------------
  // Het beheerscherm toont het raster met alle fases; daar hoort geen use-casefase bij te staan.
  // De knoppen dragen hun volgnummer in de naam ("1 Proceskeuze"), dus hier op patroon zoeken.
  for (const usecaseFase of ["Verkennen", "Identificatie", "Waardebepaling", "Roadmap"]) {
    await expect(facilitator.getByRole("button", { name: new RegExp(usecaseFase) })).toHaveCount(0);
  }
  for (const fase of PROCESFASES) {
    await expect(facilitator.getByRole("button", { name: new RegExp(fase) }).first()).toBeVisible();
  }

  // De stippenbalk van de speler telt zeven stappen: lobby plus de zes werkfases. Die knoppen
  // dragen hun fasenaam als aria-label, dus daar mag exact gezocht worden.
  await expect(wonen.getByRole("button", { name: "Lobby", exact: true })).toBeVisible();
  await expect(wonen.getByRole("button", { name: "Proceskeuze", exact: true })).toBeVisible();
  await expect(wonen.getByRole("button", { name: "Waardebepaling", exact: true })).toHaveCount(0);

  // --- De facilitator schuift de groep door alle fases ---------------------
  // De eerste twee fases hebben een eigen scherm; de rest toont voorlopig wat er komt. Beide
  // gevallen bewijzen hetzelfde: de speler volgt automatisch mee, zonder te verversen.
  // In deze test wordt geen proces gekozen, dus het afpellen toont zijn lege staat — precies wat
  // een team te zien hoort te krijgen dat een fase overslaat.
  const METEIGENScherm: Record<string, RegExp> = {
    Proceskeuze: /Welk proces leggen we op tafel\?/,
    Afpellen: /Er ligt nog geen proces op tafel/,
    Diagnose: /Er ligt nog geen proces op tafel/,
    Herontwerp: /Er ligt nog geen proces op tafel/,
  };

  for (const fase of PROCESFASES) {
    await facilitator.getByRole("button", { name: `Volgende fase: ${fase}` }).click();
    const eigenKop = METEIGENScherm[fase];
    await expect(
      wonen.getByRole("heading", { name: eigenKop ?? /Deze fase wordt nog gebouwd/ }),
    ).toBeVisible();
  }

  // Na de laatste fase is er niets meer om naar door te schuiven.
  await expect(facilitator.getByRole("button", { name: /^Volgende fase:/ })).toHaveCount(0);
});

test("twee spelers tekenen samen één procesplaat", async ({ browser }) => {
  const facilitator = await nieuweSpeler(browser);
  const wonen = await nieuweSpeler(browser);

  await facilitator.goto("/start");
  await facilitator.getByRole("radio", { name: /^Processen/ }).check();
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByLabel("Jouw rol").selectOption({ label: "Manager Vastgoed" });
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);
  const sessieId = facilitator.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];
  const code = (await facilitator.getByLabel(/Sessiecode/).innerText()).trim();

  await wonen.goto(`/deelnemen?code=${code}`);
  await wonen.getByLabel("Jouw naam").fill("Marieke");
  await wonen.getByLabel("Jouw rol").selectOption({ label: "Manager Wonen / Klant" });
  await wonen.getByRole("button", { name: "Meedoen" }).click();
  await wonen.waitForURL(/\/sessie\/[0-9a-f-]+$/);

  // --- Fase 1: een proces kiezen -------------------------------------------
  await facilitator.getByRole("button", { name: "Volgende fase: Proceskeuze" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);

  await facilitator.getByLabel("Zoeken in de bedrijfsfuncties").fill("reparatieonderhoud");
  await facilitator.getByRole("button", { name: "Op tafel leggen" }).first().click();
  await expect(facilitator.getByText("Staat al op tafel.")).toBeVisible();

  // Marieke ziet hetzelfde proces verschijnen, zonder te verversen.
  await expect(wonen.getByText("Coördineren reparatieonderhoud").first()).toBeVisible();

  // --- Fase 2: samen de plaat tekenen --------------------------------------
  await facilitator.goto(`/sessie/${sessieId}/beheer`);
  await facilitator.getByRole("button", { name: "Volgende fase: Afpellen" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);

  await facilitator.locator("#nieuwe-stap").fill("Huurder meldt een reparatie");
  await facilitator.getByRole("button", { name: "Toevoegen", exact: true }).click();

  // Marieke vult aan op de plaat van een ander. Dat is de kern van deze fase.
  await expect(wonen.getByText("Huurder meldt een reparatie")).toBeVisible();
  await wonen.locator("#nieuwe-stap").fill("Aannemer inplannen");
  await wonen.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await expect(facilitator.getByText("Aannemer inplannen")).toBeVisible();

  // Wie wat toevoegde staat erbij; anders verdwijnt het werk van een collega in de massa.
  await expect(facilitator.getByText("toegevoegd door Marieke")).toBeVisible();

  // --- De overdracht verschijnt zodra de uitvoerders verschillen -----------
  const eerste = facilitator.locator("li").filter({ hasText: "Huurder meldt een reparatie" }).first();
  await eerste.getByRole("button", { name: "Bewerken" }).click();
  await eerste.getByLabel("Wie voert deze stap uit?").fill("Klantcontact");
  await eerste.getByLabel("Wie voert deze stap uit?").blur();

  const tweede = facilitator.locator("li").filter({ hasText: "Aannemer inplannen" }).first();
  await tweede.getByRole("button", { name: "Bewerken" }).click();
  await tweede.getByLabel("Wie voert deze stap uit?").fill("Onderhoud");
  await tweede.getByLabel("Wie voert deze stap uit?").blur();

  await expect(facilitator.getByText("overdracht naar Onderhoud")).toBeVisible();
  await expect(wonen.getByText("overdracht naar Onderhoud")).toBeVisible();

  // --- Verplaatsen komt bij iedereen in dezelfde volgorde terug ------------
  await facilitator
    .getByRole("button", { name: '"Aannemer inplannen" naar voren' })
    .click();

  /*
   * Dat de volgorde is omgedraaid blijkt uit de richting van de overdracht: die liep naar
   * Onderhoud en loopt nu naar Klantcontact. Dat is een sterker bewijs dan de positie in de lijst
   * — het toont dat de plaat de nieuwe volgorde ook echt heeft doorgerekend — en het is niet
   * afhankelijk van welke andere lijsten er nog op de pagina staan.
   */
  await expect(wonen.getByText("overdracht naar Klantcontact")).toBeVisible();
  await expect(wonen.getByText("overdracht naar Onderhoud")).toHaveCount(0);

  // --- De beamer toont dezelfde plaat, horizontaal en zonder bediening -----
  // Zonder een eigen beamervariant klapte dit scherm om op een processessie: het rekende op een
  // speelmodus uit het andere spel. Vandaar dat hier expliciet naar gekeken wordt.
  // In dezelfde browsercontext als de facilitator: het beamerscherm hangt aan zijn apparaat, en
  // een verse browser heeft geen toegang tot de sessie — precies zoals bedoeld.
  const beamer = await facilitator.context().newPage();
  await beamer.goto(`/sessie/${sessieId}/scherm`);
  await expect(beamer.getByRole("heading", { name: "Hoe het nu loopt" })).toBeVisible();
  await expect(beamer.getByText("Zo vaak wisselt het werk van hand")).toBeVisible();
  // Op de beamer wordt niet bewerkt.
  await expect(beamer.getByRole("button", { name: "Bewerken" })).toHaveCount(0);

  // --- Verwijderen gaat pas na een bevestiging -----------------------------
  const teVerwijderen = facilitator
    .locator("li")
    .filter({ hasText: "Huurder meldt een reparatie" })
    .first();
  await teVerwijderen.getByRole("button", { name: '"Huurder meldt een reparatie" verwijderen' }).click();
  await expect(facilitator.getByRole("button", { name: "Laat maar staan" })).toBeVisible();

  // Bedenken kan: de stap blijft staan.
  await facilitator.getByRole("button", { name: "Laat maar staan" }).click();
  await expect(facilitator.getByText("Huurder meldt een reparatie")).toBeVisible();

  // En pas na bevestigen is hij echt weg, ook bij de ander.
  await teVerwijderen.getByRole("button", { name: '"Huurder meldt een reparatie" verwijderen' }).click();
  await facilitator.getByRole("button", { name: "Verwijderen", exact: true }).click();
  await expect(wonen.getByText("Huurder meldt een reparatie")).toHaveCount(0);
});

test("een speler die vooruitloopt in een processessie krijgt daar een waarschuwing bij", async ({
  browser,
}) => {
  const facilitator = await nieuweSpeler(browser);

  await facilitator.goto("/start");
  await facilitator.getByRole("radio", { name: /^Processen/ }).check();
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByLabel("Jouw rol").selectOption({ label: "Bestuurder" });
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);

  const sessieId = facilitator.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];

  // De facilitator speelt zelf mee en bladert op zijn spelersscherm vooruit naar een latere fase.
  await facilitator.goto(`/sessie/${sessieId}`);
  await facilitator.getByRole("button", { name: "Herontwerp" }).click();

  // "Voorloopt" wordt per spelsoort bepaald; zonder eigen fasereeks zou deze vergelijking
  // stuurloos zijn en de waarschuwing uitblijven.
  await expect(facilitator.getByText(/loopt voor op de groep/i)).toBeVisible();
});

/** De vijf assen, in de volgorde waarin `Diagnose.tsx` ze rendert. */
const ASSEN_VOLGORDE = ["Pijn", "Volume", "Variatie", "Datakwaliteit", "Strategisch belang"];

/** Scoort één as voor de speler die op het diagnosescherm staat. */
async function scoor(page: Page, asNaam: string, waarde: number) {
  const index = ASSEN_VOLGORDE.indexOf(asNaam);
  await page
    .getByRole("button", { name: `Score ${waarde}`, exact: true })
    .nth(index)
    .click();
}

async function kiesProces(page: Page, zoekterm: string) {
  await page.getByLabel("Zoeken in de bedrijfsfuncties").fill(zoekterm);
  await page.getByRole("button", { name: "Op tafel leggen" }).first().click();
}

test("twee spelers scoren een proces en zien hetzelfde gemiddelde advies", async ({ browser }) => {
  const facilitator = await nieuweSpeler(browser);
  const wonen = await nieuweSpeler(browser);

  await facilitator.goto("/start");
  await facilitator.getByRole("radio", { name: /^Processen/ }).check();
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByLabel("Jouw rol").selectOption({ label: "Manager Vastgoed" });
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);
  const sessieId = facilitator.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];
  const code = (await facilitator.getByLabel(/Sessiecode/).innerText()).trim();

  await wonen.goto(`/deelnemen?code=${code}`);
  await wonen.getByLabel("Jouw naam").fill("Marieke");
  await wonen.getByLabel("Jouw rol").selectOption({ label: "Manager Wonen / Klant" });
  await wonen.getByRole("button", { name: "Meedoen" }).click();
  await wonen.waitForURL(/\/sessie\/[0-9a-f-]+$/);

  await facilitator.getByRole("button", { name: "Volgende fase: Proceskeuze" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);
  await kiesProces(facilitator, "reparatieonderhoud");

  await facilitator.goto(`/sessie/${sessieId}/beheer`);
  await facilitator.getByRole("button", { name: "Volgende fase: Afpellen" }).click();
  await facilitator.getByRole("button", { name: "Volgende fase: Diagnose" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);

  await expect(facilitator.getByText("0 van 2 aan tafel")).toBeVisible();

  /*
   * Pijn en volume hoog, variatie laag: dat is precies de iteratief-regel, ongeacht wat er op de
   * andere twee assen staat. Zo blijft de uitkomst voorspelbaar terwijl de twee spelers toch echt
   * verschillend scoren — het gemiddelde moet het doen, niet toevallig gelijke invoer.
   */
  await scoor(facilitator, "Pijn", 4);
  await scoor(facilitator, "Volume", 4);
  await scoor(facilitator, "Variatie", 1);
  await scoor(facilitator, "Datakwaliteit", 4);
  await scoor(facilitator, "Strategisch belang", 2);

  // Marieke ziet de teller oplopen zodra Guido zijn eerste as scoort — zonder te verversen.
  await expect(wonen.getByText("1 van 2 aan tafel")).toBeVisible();

  await scoor(wonen, "Pijn", 4);
  await scoor(wonen, "Volume", 4);
  await scoor(wonen, "Variatie", 1);
  await scoor(wonen, "Datakwaliteit", 2);
  await scoor(wonen, "Strategisch belang", 4);

  // Beiden zien hetzelfde advies, zonder dat iemand ververst heeft. De naam staat twee keer op het
  // scherm (het advies zelf en de bevestigknop) — "p.cijfer" is specifiek het advies.
  await expect(facilitator.locator("p.cijfer", { hasText: "Iteratief verbeteren" })).toBeVisible();
  await expect(wonen.locator("p.cijfer", { hasText: "Iteratief verbeteren" })).toBeVisible();
  // "Pijn" staat twee keer op het scherm (de scorevraag en het etiket in het advies); het etiket
  // staat lager op de pagina.
  await expect(facilitator.getByText("Pijn").last()).toBeVisible();
});

test("een team dat afwijkt van het advies moet een motivatie kunnen vastleggen", async ({
  browser,
}) => {
  const facilitator = await nieuweSpeler(browser);
  const wonen = await nieuweSpeler(browser);

  await facilitator.goto("/start");
  await facilitator.getByRole("radio", { name: /^Processen/ }).check();
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByLabel("Jouw rol").selectOption({ label: "Manager Vastgoed" });
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);
  const sessieId = facilitator.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];
  const code = (await facilitator.getByLabel(/Sessiecode/).innerText()).trim();

  await wonen.goto(`/deelnemen?code=${code}`);
  await wonen.getByLabel("Jouw naam").fill("Marieke");
  await wonen.getByLabel("Jouw rol").selectOption({ label: "Manager Wonen / Klant" });
  await wonen.getByRole("button", { name: "Meedoen" }).click();
  await wonen.waitForURL(/\/sessie\/[0-9a-f-]+$/);

  await facilitator.getByRole("button", { name: "Volgende fase: Proceskeuze" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);
  await kiesProces(facilitator, "reparatieonderhoud");

  await facilitator.goto(`/sessie/${sessieId}/beheer`);
  await facilitator.getByRole("button", { name: "Volgende fase: Afpellen" }).click();
  await facilitator.getByRole("button", { name: "Volgende fase: Diagnose" }).click();
  await facilitator.goto(`/sessie/${sessieId}`);

  // Weinig pijn, weinig volume: dat adviseert "niet nu", ongeacht de andere assen.
  for (const [as, waarde] of [
    ["Pijn", 1],
    ["Volume", 1],
    ["Variatie", 3],
    ["Datakwaliteit", 3],
    ["Strategisch belang", 3],
  ] as const) {
    await scoor(facilitator, as, waarde);
  }
  // "Niet nu" staat ook op de spoorknop; "p.cijfer" is specifiek het advies.
  await expect(facilitator.locator("p.cijfer", { hasText: "Niet nu" })).toBeVisible();

  // Het team kiest toch iteratief verbeteren — dat wijkt af van het advies.
  await facilitator.getByRole("button", { name: "Iteratief verbeteren" }).click();
  await expect(facilitator.getByText(/Dit spoor wijkt af van het advies/)).toBeVisible();
  await expect(wonen.getByText(/Dit spoor wijkt af van het advies/)).toBeVisible();

  // De motivatie wordt pas opgeslagen bij het (opnieuw) bevestigen van het spoor.
  await facilitator
    .getByPlaceholder("Motivatie (verplicht bij afwijken van het advies)")
    .fill("De aannemer loopt hier al maanden op vast; wachten kost meer dan nu ingrijpen.");
  await facilitator.getByRole("button", { name: "Iteratief verbeteren" }).click();

  await expect(
    wonen.getByText(/De aannemer loopt hier al maanden op vast/),
  ).toBeVisible();
});
