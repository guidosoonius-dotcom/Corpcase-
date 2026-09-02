import type { Page } from "@playwright/test";

/** Wachtwoord van de facilitatoromgeving in de teststand — zie playwright.config.ts. */
export const FACILITATOR_WACHTWOORD = "test-wachtwoord";

/**
 * Gaat naar /facilitator en wacht tot het aanmaakformulier staat.
 *
 * Vervangt het vroegere `page.goto("/start")`: dat pad bestaat nog als redirect, maar het
 * aanmaakformulier zit nu achter het facilitatorwachtwoord. Een tweede bezoek op dezelfde pagina
 * (het wachtwoord staat dan al in localStorage) slaat het wachtwoordveld vanzelf over — vandaar
 * dat hier op allebei gewacht wordt in plaats van blind het veld in te vullen.
 */
export async function naarFacilitator(page: Page): Promise<void> {
  await page.goto("/facilitator");
  const wachtwoordVeld = page.getByLabel("Wachtwoord");
  const hubKop = page.getByRole("heading", { name: "Nieuwe sessie" });
  await Promise.race([wachtwoordVeld.waitFor(), hubKop.waitFor()]);
  if (await wachtwoordVeld.isVisible().catch(() => false)) {
    await wachtwoordVeld.fill(FACILITATOR_WACHTWOORD);
    await page.getByRole("button", { name: "Inloggen" }).click();
  }
  await hubKop.waitFor();
}
