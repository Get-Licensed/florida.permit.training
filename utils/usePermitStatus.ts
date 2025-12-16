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
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) return;

        const [courseRes, examRes, paymentsRes] = await Promise.all([
          supabase
            .from("course_status")
            .select("completed_at")
            .eq("user_id", user.id)
            .eq("course_id", "FL_PERMIT_TRAINING")
            .maybeSingle(),

          supabase
            .from("course_status")
            .select("exam_passed")
            .eq("user_id", user.id)
            .eq("course_id", "FL_PERMIT_TRAINING")
            .maybeSingle(),

          supabase
            .from("payments")
            .select("status")
            .eq("user_id", user.id)
            .eq("course_id", "FL_PERMIT_TRAINING"),
        ]);

        if (!alive) return;

        const paidStatuses = new Set(["succeeded", "paid"]);

        setCourseComplete(Boolean(courseRes.data?.completed_at));
        setExamPassed(Boolean(examRes.data?.exam_passed));
        setPaid(
          paymentsRes.data?.some(p => paidStatuses.has(p.status)) ?? false
        );
      } catch (err) {
        console.error("usePermitStatus error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  return {
    loading,
    courseComplete,
    examPassed,
    paid,
    fullyComplete: courseComplete && examPassed && paid,
  };
}
