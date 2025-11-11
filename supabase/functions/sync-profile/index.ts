import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { user } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, email, user_metadata } = user;
  const full_name = user_metadata.full_name || user_metadata.name || null;
  const avatar_url = user_metadata.avatar_url || null;

const { data, error } = await supabase
  .from("profiles")
  .upsert({ id, email, full_name, avatar_url });

console.log("Upsert result:", { data, error });

if (error) {
  return new Response(`Profile sync error: ${error.message}`, { status: 500 });
}

  return new Response("Profile synced", { status: 200 });
});