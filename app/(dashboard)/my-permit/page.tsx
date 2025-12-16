"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";
import { usePermitStatus } from "@/utils/usePermitStatus";
import PermitStatusFooter from "@/app/(dashboard)/PermitStatusFooter";

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

  /* -------------------- AUTH -------------------- */
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* -------------------- STATUS (SINGLE SOURCE OF TRUTH) -------------------- */
  const {
    loading: statusLoading,
    courseComplete,
    examPassed,
    paid,
    fullyComplete,
  } = usePermitStatus();

  /* -------------------- HARD GATE -------------------- */
  if (!authChecked || statusLoading) {
    return <Loader />;
  }

  /* -------------------- RENDER -------------------- */
  return (
    <>
      <main className="min-h-screen bg-white p-8 fade-in">
        <h1 className="text-3xl font-bold text-[#001f40] mb-6 text-center">
          Your Florida Learner’s Permit – Final Steps
        </h1>

        {/* FINAL COMPLETION MESSAGE */}
        {fullyComplete && (
          <div className="max-w-4xl mx-auto mb-10 p-6 rounded-2xl border border-green-300 bg-green-50 text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              🎉 Congratulations!
            </h2>

            <p className="text-green-900 leading-6">
              You are now officially done with the Florida Learner’s Permit
              course.
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
          <div className="p-6 rounded-2xl shadow-md border bg-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#001f40] mb-3">
                Step 1: Complete the Course
              </h2>
              <p className="text-gray-700 mb-4">
                You’ve completed the required Florida Permit Training course.
              </p>
            </div>

            <div className="mt-6">
              {courseComplete ? (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                  ✅ Course Complete
                </div>
              ) : (
                <button
                  onClick={() => router.push("/course")}
                  className="w-full h-12 bg-[#001f40] text-white rounded-lg font-semibold hover:bg-[#00356e]"
                >
                  Continue Course
                </button>
              )}
            </div>
          </div>

          {/* STEP 2 */}
          <div className="p-6 rounded-2xl shadow-md border bg-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#001f40] mb-3">
                Step 2: Take the Exam
              </h2>
              <p className="text-gray-700 mb-4">
                Take the final <strong>40-question exam</strong>. A minimum score
                of <strong>80%</strong> is required.
              </p>
            </div>

            <div className="mt-6">
              {examPassed ? (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                  ✅ Exam Passed
                </div>
              ) : (
                <button
                  disabled={!courseComplete}
                  onClick={() => router.push("/exam")}
                  className={`w-full h-12 rounded-lg font-semibold ${
                    courseComplete
                      ? "bg-[#001f40] text-white hover:bg-[#00356e]"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  Start Exam
                </button>
              )}
            </div>
          </div>

          {/* STEP 3 */}
          <div className="p-6 rounded-2xl shadow-md border bg-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#001f40] mb-3">
                Step 3: Pay & Visit the DMV
              </h2>
              <p className="text-gray-700 mb-4">
                After passing the exam, complete payment and visit the DMV.
              </p>
            </div>

            <div className="mt-6">
              {!paid ? (
                <button
                  onClick={() => router.push("/payment")}
                  className="w-full h-12 bg-[#ca5608] text-white rounded-lg font-semibold hover:bg-[#b24b06]"
                >
                  Complete Payment
                </button>
              ) : (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                  ✅ Payment Complete
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PermitStatusFooter
        courseComplete={courseComplete}
        examPassed={examPassed}
        paid={paid}
      />
    </>
  );
}
