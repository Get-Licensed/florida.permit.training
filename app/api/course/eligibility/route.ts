// app/api/course/eligibility/route.ts

import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function GET(_req: NextRequest) {
  const client = supabase;

  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) {
    return Response.json({ eligible: false }, { status: 401 });
  }

  const { data } = await client
    .from("course_status")
    .select(
      `
      completed_at,
      exam_passed,
      paid_at,
      dmv_submitted_at
      `
    )
    .eq("user_id", auth.user.id)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .single();

  const eligible =
    Boolean(data?.completed_at) &&
    data?.exam_passed === true &&
    Boolean(data?.paid_at) &&
    !data?.dmv_submitted_at;

  return Response.json({ eligible });
}
