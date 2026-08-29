/**
 * Waar de app zijn Supabase-project vindt.
 *
 * De omgevingsvariabelen hebben voorrang; staan ze er niet, dan gelden onderstaande waarden.
 * Dat is bewust: zo werkt de app na het klonen en na een deploy meteen, zonder dat er ergens
 * een instelling vergeten kan worden.
 *
 * De publiceerbare sleutel mág openbaar zijn. Hij zit sowieso in elke browser die de app opent,
 * en geeft op zichzelf nergens toegang toe: de RLS-policies in supabase/schema.sql weigeren alles
 * zonder een geldig deelnemertoken of een geldige beheercode. De geheime service-sleutel wordt
 * nergens in dit project gebruikt.
 */

const STANDAARD_URL = "https://bijycvgfvybcqrmqtywy.supabase.co";
const STANDAARD_SLEUTEL = "sb_publishable_L5YQhzMVr1pSDhrcJOzGug_UZ_KQvjZ";

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || STANDAARD_URL;
}

export function supabaseSleutel(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || STANDAARD_SLEUTEL;
}

/** Of er een bruikbaar project is. Zo niet, valt de app terug op de offline modus. */
export function heeftSupabase(): boolean {
  return Boolean(supabaseUrl() && supabaseSleutel());
}
