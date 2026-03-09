import { createClient } from "@supabase/supabase-js";

type ServerClientOptions = {
  useServiceRole?: boolean;
};

function getSupabaseServerConfig({ useServiceRole = false }: ServerClientOptions = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  const shouldUseServiceRole = useServiceRole && Boolean(supabaseServiceRoleKey);

  return {
    supabaseUrl,
    supabaseKey: shouldUseServiceRole ? supabaseServiceRoleKey : supabaseAnonKey,
    keyType: shouldUseServiceRole ? "service_role" : "anon"
  };
}

export function getSupabaseServerClient(options: ServerClientOptions = {}) {
  const { supabaseUrl, supabaseKey } = getSupabaseServerConfig(options);

  return createClient(supabaseUrl, supabaseKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseServerClientMeta(options: ServerClientOptions = {}) {
  const { supabaseUrl, keyType } = getSupabaseServerConfig(options);

  return {
    keyType,
    supabaseUrl,
    projectRef: supabaseUrl.replace(/^https:\/\//, "").split(".")[0] ?? "unknown"
  };
}
