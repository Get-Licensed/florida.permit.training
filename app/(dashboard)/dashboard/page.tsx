"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/utils/requireAuth";

/* ───────────────────────────────
   CONSTANTS
────────────────────────────── */
const COURSE_ID = "FL_PERMIT_TRAINING";
const TOTAL_REQUIRED_SECONDS = 6 * 60 * 60; // 21600

/* ───────────────────────────────
   LOADER
────────────────────────────── */
function Loader() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white fade-in">
      <img
        src="/steering-wheel.png"
        alt="Loading"
        className="w-24 h-24 steering-animation"
      />
    </main>
  );
}

/* ───────────────────────────────
   DASHBOARD PAGE
────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [resumeLesson, setResumeLesson] = useState(0);
  const [resumeModule, setResumeModule] = useState(0);

  /* ───────── AUTH CHECK ───────── */
  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* ───────── LOAD PROGRESS ───────── */
  useEffect(() => {
    if (!authChecked) return;

    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("course_progress_modules")
        .select(
          `
          module_id,
          module_index,
          completed,
          total_effective_seconds
        `
        )
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .order("module_index", { ascending: true });

      if (error || !data || data.length === 0) {
        setProgress(0);
        setTimeRemaining(6);
        setPageReady(true);
        return;
      }

      /* Progress % */
      const totalModules = data.length;
      const completedModules = data.filter((m) => m.completed).length;

      setProgress(
        Math.round((completedModules / totalModules) * 100)
      );

      /* Time Remaining */
      const spentSeconds = data.reduce(
        (sum, m) => sum + (m.total_effective_seconds ?? 0),
        0
      );

      const remainingSeconds = Math.max(
        0,
        TOTAL_REQUIRED_SECONDS - spentSeconds
      );

      setTimeRemaining(remainingSeconds / 3600);

      /* Resume logic: first incomplete module */
      const next = data.find((m) => !m.completed);
      if (next) {
        setResumeLesson(0); // lesson routing stays logical
        setResumeModule(next.module_index);
      }

      setTimeout(() => setPageReady(true), 300);
    }

    loadProgress();
  }, [authChecked]);

  /* ───────── CONTINUE ───────── */
  const handleContinue = () => {
    router.push(
      `/course?lesson=${resumeLesson}&module=${resumeModule}`
    );
  };

  const cardBtn =
    "px-4 py-2 bg-[#001f40] text-white font-semibold rounded hover:opacity-90 w-full text-center";

  const continueBtn =
  "px-4 py-2 bg-[#ca5608] text-white font-semibold rounded hover:opacity-90 w-full";

  if (!pageReady) return <Loader />;

  /* ───────── RENDER ───────── */
  return (
    <main className="min-h-screen bg-white text-[#001f40]">
      <div className="p-6 flex justify-center">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

          {/* MY COURSE */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col gap-6">
            <h2 className="text-xl font-bold">My Course</h2>

          <div className="flex items-center gap-6 px-4 py-3 bg-[#f9fafb] border rounded-lg">
            <div className="text-2xl font-bold text-[#ca5608]">
              {progress}%
            </div>
            <div className="text-sm text-gray-700 leading-tight">
              <p className="font-semibold">Course Progress</p>
              <p>{timeRemaining.toFixed(1)} hours remaining</p>
            </div>
          </div>

            <button onClick={handleContinue} className={continueBtn}>
              Continue My Course
            </button>

            <div className="text-sm text-gray-700 leading-6 space-y-3">
              <p>
                This Florida Permit Training course must be completed
                in full before taking the final exam.
              </p>
              <p>
                The final exam contains <strong>40 questions</strong>.
                A minimum score of <strong>80%</strong> is required.
              </p>
            </div>
          </div>

          {/* MY PERMIT */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col gap-6">
            <h2 className="text-xl font-bold">My Permit</h2>

            <p className="text-sm text-gray-700">
              Track your remaining steps including exam completion,
              payment, and DMV readiness.
            </p>

            <div className="flex items-center gap-3">
              <Link href="/my-permit" className={cardBtn}>
                View My Permit Progress
              </Link>
              <span className="text-sm text-gray-500">
                Track exam status, payment, and DMV readiness.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/profile" className={cardBtn}>
                Update Profile
              </Link>
              <span className="text-sm text-gray-500">
                Ensure your personal information is accurate before visiting the DMV.
              </span>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
