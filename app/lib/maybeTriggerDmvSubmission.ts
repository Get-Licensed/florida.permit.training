// app/lib/maybeTriggerDmvSubmission.ts

import { supabase } from "@/utils/supabaseClient";

export async function maybeTriggerDmvSubmission(userId: string) {
  const client = supabase;

  const { data: cs, error } = await client
    .from("course_status")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .single();

  if (!cs || error) return;

  const examPassed = cs.exam_passed;
  const timeCompleted = !!cs.completed_at;
  const paid = !!cs.paid_at;
  const dmvSubmitted = !!cs.dmv_submitted_at;

  // Only continue if all three are done
  if (!examPassed || !timeCompleted || !paid || dmvSubmitted) {
    return;
  }

  // mark submission
  const now = new Date().toISOString();

  await client
    .from("course_status")
    .update({
      status: "dmv_submitted",
      dmv_submitted_at: now,
    })
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING");

  // insert log for your records
  await client.from("dmv_submissions").insert({
    user_id: userId,
    course_id: "FL_PERMIT_TRAINING",
    dmv_status: "pending", 
    notes: "stubbed submission",
  });

  return true; // indicate change
}
