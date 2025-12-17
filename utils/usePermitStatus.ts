"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export function usePermitStatus() {
  const [loading, setLoading] = useState(true);
  const [courseComplete, setCourseComplete] = useState(false);
  const [examPassed, setExamPassed] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("course_status")
          .select("completed_at, exam_passed, paid_at")
          .eq("user_id", user.id)
          .eq("course_id", "FL_PERMIT_TRAINING")
          .single();

        if (error || !data || !alive) return;

        setCourseComplete(Boolean(data.completed_at));
        setExamPassed(Boolean(data.exam_passed));
        setPaid(Boolean(data.paid_at));
      } catch (e) {
        console.error("usePermitStatus error", e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => { alive = false };
  }, []);

  return {
    loading,
    courseComplete,
    examPassed,
    paid,
    fullyComplete: courseComplete && examPassed && paid,
  };
}
