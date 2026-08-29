import { heeftSupabase } from "@/lib/supabase/config";
import { lokaleOpslag } from "./opslag-lokaal";
import { supabaseOpslag } from "./opslag-supabase";
import type { Opslag } from "./soorten";

export * from "./soorten";

/**
 * Kiest de opslag waarmee de applicatie werkt.
 *
 * Supabase is de normale modus: meerdere apparaten, en de sessie blijft bewaard. De offline modus
 * houdt de sessie in het geheugen van de Next.js-server; die is bedoeld om te testen en als
 * terugvaloptie voor een sessie op locatie waar het netwerk niet meewerkt.
 *
 * De keuze valt automatisch op offline als de Supabase-omgevingsvariabelen ontbreken, zodat de
 * app na `npm install && npm run dev` meteen speelbaar is. Met NEXT_PUBLIC_OPSLAG=lokaal forceer
 * je de offline modus expliciet.
 */

export type OpslagSoort = "supabase" | "lokaal";

export function gekozenOpslagSoort(): OpslagSoort {
  if (process.env.NEXT_PUBLIC_OPSLAG === "lokaal") return "lokaal";
  if (process.env.NEXT_PUBLIC_OPSLAG === "supabase") return "supabase";

  return heeftSupabase() ? "supabase" : "lokaal";
}

export const opslag: Opslag =
  gekozenOpslagSoort() === "lokaal" ? lokaleOpslag : supabaseOpslag;
