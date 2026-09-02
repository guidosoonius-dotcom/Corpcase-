import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * De enige plek in dit project die de Supabase service-role-sleutel gebruikt.
 *
 * Die sleutel omzeilt alle RLS-policies uit supabase/schema.sql — hij hoort dus nooit in
 * clientcode en nooit ergens anders dan hier. Reden van bestaan: het wachtwoord-beveiligde
 * facilitatoroverzicht (src/app/api/facilitator/sessies/route.ts) moet alle sessies kunnen
 * lijsten, en dat is met het per-sessie-RLS-model in supabase/schema.sql (policy `sessies_lezen`,
 * gefilterd op de beheercode/join-code van precies één request) niet mogelijk. Elke andere actie
 * op een sessie — beheren, verwijderen — loopt na het aanroepen van dit endpoint gewoon weer via
 * de normale `Identiteit`/RLS-weg (`facilitatorInloggen` + de bestaande Opslag-methoden).
 *
 * Deze module mag nooit vanuit een client component of vanuit `opslag-supabase.ts` (dat draait ook
 * in de browser) geïmporteerd worden — alleen vanuit een route handler.
 */

let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (client) return client;

  const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sleutel) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Nodig voor het facilitatoroverzicht; zie .env.example.",
    );
  }

  client = createClient(supabaseUrl(), sleutel, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
