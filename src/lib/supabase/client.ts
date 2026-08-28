import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-client met identiteit in de headers.
 *
 * Er zijn geen accounts. Wie je bent blijkt uit drie headers die de database in de RLS-policies
 * controleert: je deelnemertoken, de join-code (nodig om te mogen joinen voordat je deelnemer
 * bent) en de beheercode van de facilitator. De publieke sleutel alleen geeft nergens toegang toe.
 *
 * Omdat supabase-js zijn headers bij het aanmaken vastlegt, wordt er per identiteit één client
 * gemaakt en onthouden.
 */

export type Identiteit = {
  deelnemerToken?: string | null;
  joinCode?: string | null;
  beheerCode?: string | null;
};

const clients = new Map<string, SupabaseClient>();

function sleutelVoor(identiteit: Identiteit): string {
  return [
    identiteit.deelnemerToken ?? "",
    identiteit.joinCode ?? "",
    identiteit.beheerCode ?? "",
  ].join("|");
}

function omgeving() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ontbreken. Zie .env.example.",
    );
  }
  return { url, key };
}

export function maakClient(identiteit: Identiteit = {}): SupabaseClient {
  const sleutel = sleutelVoor(identiteit);
  const bestaand = clients.get(sleutel);
  if (bestaand) return bestaand;

  const { url, key } = omgeving();
  const headers: Record<string, string> = {};
  if (identiteit.deelnemerToken) headers["x-deelnemer-token"] = identiteit.deelnemerToken;
  if (identiteit.joinCode) headers["x-join-code"] = identiteit.joinCode;
  if (identiteit.beheerCode) headers["x-beheer-code"] = identiteit.beheerCode;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });

  clients.set(sleutel, client);
  return client;
}
