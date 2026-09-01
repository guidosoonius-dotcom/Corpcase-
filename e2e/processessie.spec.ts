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
  for (const fase of PROCESFASES) {
    await facilitator.getByRole("button", { name: `Volgende fase: ${fase}` }).click();
    // De speler volgt automatisch mee, zonder de pagina te verversen.
    await expect(wonen.getByRole("heading", { name: /Deze fase wordt nog gebouwd/ })).toBeVisible();
    await expect(wonen.getByText(fase).first()).toBeVisible();
  }

  // Na de laatste fase is er niets meer om naar door te schuiven.
  await expect(facilitator.getByRole("button", { name: /^Volgende fase:/ })).toHaveCount(0);
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
