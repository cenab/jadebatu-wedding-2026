import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env.js";

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});
