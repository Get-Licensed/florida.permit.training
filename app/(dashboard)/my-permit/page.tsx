"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";

/* -------------------- Loader -------------------- */
function Loader() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white fade-in">
      <img
        src="/steering-wheel.png"
        alt="Loading"
        className="w-20 h-20 steering-animation opacity-80"
      />
    </main>
  );
}

export default function MyPermitPage() {
  const router = useRouter();

  /* -------------------- STATE -------------------- */
  const [authChecked, setAuthChecked] = useState(false);
  const [statusReady, setStatusReady] = useState(false);

  const [courseComplete, setCourseComplete] = useState(false);
  const [examPassed, setExamPassed] = useState(false);
  const [paid, setPaid] = useState(false);

  // ✅ NEW: terminal completion flag
  const fullyComplete = courseComplete && examPassed && paid;

  /* -------------------- AUTH CHECK -------------------- */
  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* -------------------- LOAD ALL STATUSES -------------------- */
  useEffect(() => {
    if (!authChecked) return;

    async function loadStatuses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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

      setCourseComplete(!!courseRes.data?.completed_at);
      setExamPassed(!!examRes.data?.exam_passed);
      setPaid(paymentRes.data?.status === "paid");

      setStatusReady(true);
    }

    loadStatuses();
  }, [authChecked]);

  /* -------------------- HARD GATE -------------------- */
  if (!authChecked || !statusReady) {
    return <Loader />;
  }

  /* -------------------- RENDER -------------------- */
  return (
    <main className="min-h-screen bg-white p-8 fade-in">
      <h1 className="text-3xl font-bold text-[#001f40] mb-6 text-center">
        Your Florida Learner’s Permit – Final Steps
      </h1>

      {/* ✅ FINAL COMPLETION MESSAGE */}
      {fullyComplete && (
        <div className="max-w-4xl mx-auto mb-10 p-6 rounded-2xl border border-green-300 bg-green-50 text-center">
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            🎉 Congratulations!
          </h2>

          <p className="text-green-900 leading-6">
            You are now officially done with the Florida Learner’s Permit course.
            <br />
            Your information will be sent to the Florida DMV, and you may visit
            the DMV to obtain your learner’s permit.
          </p>

          <p className="mt-3 text-sm text-green-800">
            DMV submission typically occurs within 1 business day.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* STEP 1 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-white flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 1: Complete the Course
            </h2>

            <p className="text-gray-700 mb-4">
              You’ve completed the required Florida Permit Training course. Your
              progress has been recorded successfully.
            </p>
          </div>

          <div className="mt-6">
            <div className="w-full p-3 bg-green-100 text-green-800 border border-green-300 rounded-lg font-semibold text-center">
              ✅ Course Complete
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-white flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 2: Take the Exam
            </h2>

            <p className="text-gray-700 mb-4">
              Take the final <strong>40-question exam</strong>. A minimum score
              of <strong>80%</strong> is required to pass.
            </p>

            <p className="text-gray-700">
              You may retake the exam as many times as needed.
            </p>
          </div>

          <div className="mt-6">
            {examPassed ? (
              <div className="w-full p-3 bg-green-100 text-green-800 border border-green-300 rounded-lg font-semibold text-center">
                ✅ Exam Passed
              </div>
            ) : (
              <button
                disabled={!courseComplete}
                onClick={() => courseComplete && router.push("/exam")}
                className={`
                  w-full h-12 rounded-lg font-semibold transition
                  ${
                    courseComplete
                      ? "bg-[#001f40] text-white hover:bg-[#00356e]"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }
                `}
              >
                Start Exam
              </button>
            )}
          </div>
        </div>

        {/* STEP 3 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-white flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 3: Pay & Visit the DMV
            </h2>

            <p className="text-gray-700 mb-4">
              After passing the exam, complete payment and visit your local
              Florida DMV to pick up your learner’s permit.
            </p>

            <p className="text-gray-600 mt-2">
              * Payment is required for DMV submission.
            </p>
          </div>

          <div className="mt-6">
            {!paid ? (
              <a
                href="/payment"
                className="w-full h-12 flex items-center justify-center bg-[#ca5608] text-white font-semibold rounded-lg hover:bg-[#b24b06]"
              >
                Complete Payment
              </a>
            ) : (
              <div className="w-full p-3 bg-green-100 text-green-800 border border-green-300 rounded-lg font-semibold text-center">
                ✅ Payment Complete
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
