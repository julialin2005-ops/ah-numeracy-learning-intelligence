// Browser Supabase client.
// NOTE: Normally auto-generated, but overridden here because the platform
// .env values keep being reset to an unrelated Lovable Cloud project.
// Connection config lives in src/lib/supabase-config.ts as the single
// source of truth.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import {
  ASTRO_HIPPO_SUPABASE_URL,
  ASTRO_HIPPO_SUPABASE_PUBLISHABLE_KEY,
} from '@/lib/supabase-config';

function createSupabaseClient() {
  return createClient<Database>(
    ASTRO_HIPPO_SUPABASE_URL,
    ASTRO_HIPPO_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
