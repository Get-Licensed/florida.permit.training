// app/api/course/status/route.ts

import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function GET(req: NextRequest) {
  const client = supabase;

  // Auth
  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = auth.user.id;

  // Course status
  const { data: cs, error } = await client
    .from("course_status")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .single();

  if (error || !cs) {
    return Response.json(
      { error: "course_status_not_found" },
      { status: 404 }
    );
  }

  return Response.json(
    {
      status: cs.status,
      exam_passed: cs.exam_passed,
      completed_at: cs.completed_at,
      paid_at: cs.paid_at,
      dmv_submitted_at: cs.dmv_submitted_at,
    },
    { status: 200 }
  );
}
