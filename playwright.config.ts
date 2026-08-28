import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end-tests draaien tegen de offline modus: de sessie leeft dan in het geheugen van de
 * Next.js-server, zodat drie browsers dezelfde sessie delen zonder externe dienst.
 *
 * De Supabase-variant van dezelfde datalaag wordt apart gedekt door de integratietest in
 * src/lib/sessie/__tests__, die tegen het echte project draait waar dat bereikbaar is.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "telefoon",
      use: {
        ...devices["Pixel 7"],
        // De omgeving levert een eigen Chromium; die gebruiken in plaats van er een te downloaden.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_OPSLAG: "lokaal",
      // Voorkomt dat .env.local de opslagkeuze alsnog naar Supabase trekt.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});
