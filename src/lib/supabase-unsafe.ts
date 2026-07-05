// Type-unsafe Supabase client wrapper.
// The auto-generated types.ts targets the Lovable-managed project, which has
// an empty schema. We connect to the user's existing Supabase database, so
// we bypass the generated types and rely on runtime validation.
import { supabase } from "@/integrations/supabase/client";
export const sdb = supabase as any;
