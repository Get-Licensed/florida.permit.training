"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";
import { usePermitStatus } from "@/utils/usePermitStatus";
import { supabase } from "@/utils/supabaseClient";
import CourseTimeline from "@/components/CourseTimeline";
import Loader from "@/components/loader";

export default function MyPermitPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);

  const {
    loading: statusLoading,
    courseComplete,
    examPassed,
    paid,
  } = usePermitStatus();

  const [modules, setModules] = useState<any[]>([]);
  const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);

  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  useEffect(() => {
    async function loadProgress() {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data } = await supabase
        .from("course_progress_modules")
        .select("module_index")
        .eq("user_id", user.data.user.id)
        .eq("course_id", "FL_PERMIT_TRAINING")
        .eq("completed", true);

      if (!data?.length) {
        setMaxCompletedIndex(0);
        return;
      }

      const max = Math.max(...data.map((r) => r.module_index ?? 0));
      setMaxCompletedIndex(max);
    }

    loadProgress();
  }, []);

  useEffect(() => {
    supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setModules(data);
      });
  }, []);

  const shouldRedirect =
    authChecked &&
    !statusLoading &&
    courseComplete &&
    examPassed &&
    paid;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/permit-complete");
    }
  }, [shouldRedirect, router]);

  if (!authChecked || statusLoading || shouldRedirect) {
    return <Loader />;
  }

  return (
    <>
      <main className="min-h-screen bg-white p-8 fade-in">
        <h1 className="text-3xl font-bold text-[#001f40] mb-6 text-center">
          Your Florida Learner’s Permit – Final Steps
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                  Course Complete
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
                  Exam Passed
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
                  Payment Complete
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {modules.length > 0 && (
        <CourseTimeline
          modules={modules}
          currentModuleIndex={maxCompletedIndex}
          maxCompletedIndex={maxCompletedIndex}
          currentLessonIndex={0}
          elapsedSeconds={1}
          totalModuleSeconds={1}
          examPassed={examPassed}
          paymentPaid={paid}
          goToModule={(i: number) => {
            if (i <= modules.length - 1) {
              router.push(`/course?module=${i}`);
            }
          }}
        />
      )}
    </>
  );
}
