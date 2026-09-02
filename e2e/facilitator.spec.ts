import { expect, test } from "@playwright/test";
import { naarFacilitator } from "./hulp";

/**
 * De facilitatorhub (/facilitator): aanmaken en het overzicht zijn twee aparte stukken van
 * hetzelfde scherm, en horen na elkaar getoetst te worden — het overzicht moet een sessie tonen
 * die het aanmaakformulier zojuist heeft gezet, en "verwijderen" moet ook echt onomkeerbaar zijn.
 */

test("een nieuwe sessie verschijnt in het overzicht, is te beheren en te verwijderen", async ({
  page,
}) => {
  // Een eigen, unieke titel: het overzicht is server-breed en deelt zijn geheugen met elke
  // andere test die in dezelfde run draait, dus de standaardtitel alleen is geen betrouwbare match.
  const titel = `E2E-overzichtstest ${Date.now()}`;

  await naarFacilitator(page);
  await page.getByLabel("Naam van de sessie").fill(titel);
  await page.getByLabel("Jouw naam").fill("Guido");
  await page.getByLabel("Jouw rol").selectOption({ label: "Bestuurder" });
  await page.getByRole("button", { name: "Sessie starten" }).click();
  await page.waitForURL(/\/sessie\/[0-9a-f-]+\/beheer$/);
  const sessieId = page.url().match(/\/sessie\/([0-9a-f-]+)\//)![1];
  const code = (await page.getByLabel(/Sessiecode/).innerText()).trim();

  // Terug naar de hub: de zojuist aangemaakte sessie moet in het overzicht staan.
  await naarFacilitator(page);
  const rij = page.locator("li", { hasText: titel });
  await expect(rij).toBeVisible();
  await expect(rij.getByText("1 deelnemer")).toBeVisible();

  // "Beheren" brengt je op hetzelfde beheerscherm terug, met volledige rechten.
  await rij.getByRole("button", { name: "Beheren" }).click();
  await page.waitForURL(`/sessie/${sessieId}/beheer`);
  await expect(page.getByRole("button", { name: "Volgende fase: Verkennen" })).toBeVisible();

  // Verwijderen vraagt eerst een bevestiging.
  await naarFacilitator(page);
  const rijNaBeheren = page.locator("li", { hasText: titel });
  await rijNaBeheren.getByRole("button", { name: "Verwijderen" }).click();
  await expect(page.getByText("verwijderen? Dat kan niet ongedaan gemaakt worden")).toBeVisible();
  await rijNaBeheren.getByRole("button", { name: "Ja, verwijderen" }).click();
  await expect(page.locator("li", { hasText: titel })).toHaveCount(0);

  // En is dan ook echt weg: de sessiecode werkt nergens meer.
  await page.goto(`/deelnemen?code=${code}`);
  await page.getByLabel("Jouw naam").fill("Marieke");
  await page.getByRole("button", { name: "Meedoen" }).click();
  await expect(page.getByText("Geen sessie gevonden met deze code.")).toBeVisible();
});

test("een onjuist facilitatorwachtwoord wordt geweigerd", async ({ page }) => {
  await page.goto("/facilitator");
  await page.getByLabel("Wachtwoord").fill("dit-is-fout");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page.getByText("Onjuist wachtwoord.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nieuwe sessie" })).toHaveCount(0);
});
