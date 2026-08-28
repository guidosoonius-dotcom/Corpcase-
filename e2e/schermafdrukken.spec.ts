import { test, expect, type Page } from "@playwright/test";

/**
 * Maakt schermafdrukken van de belangrijkste schermen, om ze met het oog te kunnen beoordelen.
 * Geen assertions op vormgeving: die zouden bij elke tekstwijziging breken.
 */

const MAP = process.env.SCHERMAFDRUKKEN_MAP ?? "schermafdrukken";

async function speelTot(page: Page, sessieId: string) {
  await page.goto(`/sessie/${sessieId}`);
}

test("schermafdrukken van een gevulde sessie", async ({ browser }) => {
  const facilitator = await (await browser.newContext()).newPage();
  const speler = await (await browser.newContext()).newPage();

  await facilitator.goto("/start");
  await facilitator.getByLabel("Jouw naam").fill("Guido");
  await facilitator.getByRole("button", { name: "Sessie starten" }).click();
  await facilitator.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);
  const sessieId = facilitator.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];
  const code = (await facilitator.locator("p.font-mono").first().innerText()).trim();

  await facilitator.screenshot({ path: `${MAP}/01-facilitator.png`, fullPage: false });

  await speler.goto(`/deelnemen?code=${code}`);
  await speler.getByLabel("Jouw naam").fill("Marieke");
  await speler.getByLabel("Jouw rol").selectOption({ label: "Manager Wonen / Klant" });
  await speler.getByRole("button", { name: "Meedoen" }).click();
  await speler.waitForURL(/\/sessie\/[0-9a-f-]+$/);
  await speler.screenshot({ path: `${MAP}/02-lobby.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Verkennen" }).click();
  await speelTot(speler, sessieId);
  await expect(speler.getByRole("heading", { name: "Wat herken je?" })).toBeVisible();
  await speler.getByRole("button", { name: "Jaarverslag", exact: true }).click();
  await speler.getByRole("button", { name: /Circa 18.000 verhuizingen/ }).click();
  await speler.getByRole("button", { name: "Huurder", exact: true }).click();
  await speler.getByRole("button", { name: /Mateo — internationale student/ }).click();
  await speler.screenshot({ path: `${MAP}/03-verkennen.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Identificatie" }).click();
  await expect(speler.getByRole("heading", { name: /Welke use cases/ })).toBeVisible();
  await speler.getByRole("button", { name: "Bibliotheek" }).click();
  await speler.getByRole("button", { name: "Op tafel leggen" }).first().click();
  await speler.getByRole("button", { name: "Op tafel leggen" }).first().click();
  await speler.screenshot({ path: `${MAP}/04-bibliotheek.png`, fullPage: false });

  await speler.getByRole("button", { name: /Op tafel \(/ }).click();
  await speler.getByRole("button", { name: "Openen en meehelpen" }).first().click();
  await speler.screenshot({ path: `${MAP}/05-usecase-open.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Waardebepaling" }).click();
  await expect(speler.getByRole("heading", { name: "Wat levert het op?" })).toBeVisible();
  await speler.getByRole("button", { name: "Waarderen" }).first().click();
  await speler.getByRole("button", { name: "Doorrekenen" }).click();
  await speler.getByRole("button", { name: /Begin met de ordegroottes/ }).click();
  await expect(speler.getByText(/Netto .* – .* per jaar/)).toBeVisible({ timeout: 20_000 });
  await speler
    .getByText("Waarde voor de huurder", { exact: true })
    .locator("xpath=..")
    .getByRole("button", { name: "Score 5" })
    .click();
  await speler
    .getByText("Databeschikbaarheid", { exact: true })
    .locator("xpath=..")
    .getByRole("button", { name: "Score 4" })
    .click();
  await speler.screenshot({ path: `${MAP}/06-businesscase.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Prioritering" }).click();
  await expect(speler.getByRole("heading", { name: "Wat doen we wél?" })).toBeVisible();
  await speler.getByRole("button", { name: "Opnemen" }).first().click();
  await speler.screenshot({ path: `${MAP}/07-prioritering.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Roadmap" }).click();
  await expect(speler.getByRole("heading", { name: "Wanneer doen we wat?" })).toBeVisible();
  await speler.getByRole("button", { name: "Nu", exact: true }).first().click();
  await speler.screenshot({ path: `${MAP}/08-roadmap.png`, fullPage: false });

  await facilitator.getByRole("button", { name: "Volgende fase: Opbrengst" }).click();
  await expect(speler.getByRole("heading", { name: "Wat er ligt" })).toBeVisible();
  await speler.screenshot({ path: `${MAP}/09-opbrengst.png`, fullPage: false });

  await speler.goto(`/sessie/${sessieId}/rapport`);
  await expect(speler.getByRole("heading", { name: "Het portfolio" })).toBeVisible();
  await speler.screenshot({ path: `${MAP}/10-rapport.png`, fullPage: false });

  // Beamerscherm op een breed scherm.
  const beamer = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await beamer.addInitScript(
    ([id, opslag]) => {
      window.localStorage.setItem(`corpcase:sessie:${id}`, opslag);
    },
    [
      sessieId,
      await facilitator.evaluate((id) => window.localStorage.getItem(`corpcase:sessie:${id}`), sessieId) ?? "",
    ],
  );
  await beamer.goto(`/sessie/${sessieId}/scherm`);
  await expect(beamer.getByRole("heading", { name: "Waarde tegen haalbaarheid" })).toBeVisible();
  await beamer.screenshot({ path: `${MAP}/11-beamer.png`, fullPage: false });
});
