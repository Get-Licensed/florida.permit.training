import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function GET(_req: NextRequest) {
  const client = supabase;

  // First get course status rows
  const { data: statusRows, error } = await client
    .from("course_status")
    .select("*")
    .order("completed_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!statusRows || statusRows.length === 0) {
    return Response.json([], { status: 200 });
  }

  // Now fetch profiles manually and merge
  const userIds = statusRows.map((r) => r.user_id);

  const { data: profileRows, error: pErr } = await client
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (pErr) {
    return Response.json({ error: pErr.message }, { status: 500 });
  }

  const profileById = Object.fromEntries(
    (profileRows ?? []).map((p) => [p.id, p])
  );

  // Merge profiles into course rows
  const merged = statusRows.map((r) => ({
    ...r,
    profile: profileById[r.user_id] || null,
  }));

  return Response.json(merged, { status: 200 });
}
