"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/utils/requireAuth";

/* ───────────────────────────────
   LOADER
────────────────────────────── */
function Loader() {
  return (
    <main
      style={{ opacity: 1, transition: "opacity 0.45s ease" }}
      className="min-h-screen flex items-center justify-center bg-white"
    >
      <img
        src="/steering-wheel.png"
        alt="Loading"
        className="w-20 h-20 steering-animation opacity-80"
      />
    </main>
  );
}

/* ───────────────────────────────
   STATIC COURSE
────────────────────────────── */
const COURSE = [
  { id: 1, duration: 5, modules: Array(10).fill("") },
  { id: 2, duration: 25, modules: Array(10).fill("") },
  { id: 3, duration: 25, modules: Array(10).fill("") },
  { id: 4, duration: 15, modules: Array(8).fill("") },
  { id: 5, duration: 45, modules: Array(12).fill("") },
  { id: 6, duration: 15, modules: Array(8).fill("") },
  { id: 7, duration: 15, modules: Array(8).fill("") },
  { id: 8, duration: 30, modules: Array(10).fill("") },
  { id: 9, duration: 30, modules: Array(10).fill("") },
  { id: 10, duration: 45, modules: Array(12).fill("") },
  { id: 11, duration: 45, modules: Array(12).fill("") },
  { id: 12, duration: 45, modules: Array(12).fill("") },
  { id: 13, duration: 45, modules: Array(12).fill("") },
];

/* ───────────────────────────────
   DASHBOARD PAGE
────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  /* AUTH + PROGRESS STATE */
  const [authChecked, setAuthChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [resumeLesson, setResumeLesson] = useState(0);
  const [resumeModule, setResumeModule] = useState(0);

  /* PAGE VISIBILITY CONTROL */
  const [pageReady, setPageReady] = useState(false);

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

    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

    const { data } = await supabase
      .from("course_progress")
      .select("lesson_id, slide_index, completed, elapsed_seconds")
      .eq("user_id", user.id)
      .eq("completed", true);


      if (!data || data.length === 0) {
        setProgress(0);
        setTimeRemaining(0);
        setPageReady(true);
        return;
      }

      const totalModules = COURSE.reduce((sum, l) => sum + l.modules.length, 0);
      const completedModules = data.length;

      setProgress(Math.min(100, Math.round((completedModules / totalModules) * 100)));

      const totalSeconds = COURSE.reduce(
        (sum, l) => sum + l.modules.length * 30,
        0
      );
      const completedSeconds = data.reduce(
        (sum, r) => sum + (r.elapsed_seconds ?? 30),
        0
      );
      setTimeRemaining((totalSeconds - completedSeconds) / 3600);

      for (let l = 0; l < COURSE.length; l++) {
        const doneCount = data.filter((r) => r.lesson_id === COURSE[l].id).length;
        if (doneCount < COURSE[l].modules.length) {
          setResumeLesson(l);
          setResumeModule(doneCount);
          break;
        }
      }

      /* Delay UI reveal smoothly */
      setTimeout(() => setPageReady(true), 350);
    }

    fetchData();
  }, [authChecked]);

  /* ───────── CONTINUE BUTTON ───────── */
  const handleContinue = () => {
    router.push(`/course?lesson=${resumeLesson}&module=${resumeModule}`);
  };

  const cardBtn =
    "px-4 py-2 bg-gray-300 text-[#001f40] rounded hover:bg-gray-400 w-full text-center";

  const continueBtn =
    "px-4 py-2 rounded text-white font-semibold w-full text-center bg-[#ca5608] hover:bg-[#b24b06]";

  /* ───────── CONDITIONAL RENDER ───────── */
  if (!pageReady) return <Loader />;

/* ───────── RENDER DASHBOARD ───────── */
return (
  <main
    className="min-h-screen bg-white text-[#001f40]"
    style={{
      opacity: pageReady ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}
  >
    <div className="p-6 flex justify-center">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

        {/* SECTION 1 — YOUR COURSE */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-[#001f40]">
            My Course
          </h2>

          {/* Compact Progress */}
          <div className="flex items-center gap-4 p-4 bg-[#f9fafb] border border-gray-200 rounded-lg">
            <div className="text-3xl font-bold text-[#ca5608]">
              {progress}%
            </div>

            <div className="text-sm text-gray-700">
              <p className="font-semibold">Course Progress</p>
              <p>{timeRemaining.toFixed(1)} hours remaining</p>
            </div>
          </div>
         
          <button onClick={handleContinue} className={continueBtn}>
            Continue My Course
          </button>

          {/* Course Explanation */}
          <div className="text-gray-700 space-y-3 text-sm leading-6">
            <p>
              This Florida Permit Training course must be completed in full
              before taking the final exam.
            </p>

            <p>
              Once you finish the course, you will take a
              <strong> 40-question exam</strong>. A minimum score of
              <strong> 80%</strong> is required to pass.
            </p>

            <p>
              After passing the exam, you’ll be eligible to complete payment
              and proceed with obtaining your learner’s permit.
            </p>
          </div>
        </div>

        {/* SECTION 2 — MY PERMIT */}
        <div className="bg-white rounded-2xl shadow-lg w-full p-6 border border-gray-200 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-[#001f40]">
            My Permit
          </h2>

          <div className="text-gray-700 text-sm leading-6 space-y-3">
            <p>
              Your permit page shows the remaining steps required to obtain
              your Florida learner’s permit.
            </p>

            <p>
              This includes taking the exam, completing payment, and preparing
              for your DMV visit.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/my-permit" className={cardBtn}>
              View My Permit Progress
            </Link>
            <p className="text-sm text-gray-500">
              Track exam status, payment, and DMV readiness.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <Link href="/profile" className={cardBtn}>
              Update Profile
            </Link>
            <p className="text-sm text-gray-500">
              Make sure your personal information is accurate before visiting the DMV.
            </p>
          </div>
        </div>

      </section>
    </div>
  </main>
);
}