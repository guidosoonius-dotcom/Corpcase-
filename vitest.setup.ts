import { config } from "dotenv";

// Integratietests praten met het echte Supabase-project; de sleutels staan in .env.local.
config({ path: ".env.local", quiet: true });
