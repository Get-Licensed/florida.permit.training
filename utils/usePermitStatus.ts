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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setLoading(false);
        return;
      }

      const [courseRes, examRes, paymentRes] = await Promise.all([
        supabase
          .from("course_status")
          .select("completed_at")
          .eq("user_id", user.id)
          .eq("course_id", "FL_PERMIT_TRAINING")
          .single(),

        supabase
          .from("course_status")
          .select("exam_passed")
          .eq("user_id", user.id)
          .eq("course_id", "FL_PERMIT_TRAINING")
          .single(),

        supabase
          .from("payments")
          .select("status")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (!alive) return;

      setCourseComplete(!!courseRes.data?.completed_at);
      setExamPassed(!!examRes.data?.exam_passed);
      setPaid(paymentRes.data?.status === "paid");

      setLoading(false);
    }

    run();
    return () => { alive = false; };
  }, []);

  const fullyComplete = courseComplete && examPassed && paid;

  return { loading, courseComplete, examPassed, paid, fullyComplete };
}
