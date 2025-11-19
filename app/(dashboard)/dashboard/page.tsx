"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/utils/requireAuth";

// Loader Component
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

export default function DashboardPage() {
  const router = useRouter();

  /* ────────────── HOOKS (ALWAYS TOP-LEVEL, NEVER CONDITIONAL) ────────────── */
  const [authChecked, setAuthChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [resumeLesson, setResumeLesson] = useState(0);
  const [resumeModule, setResumeModule] = useState(0);

  /* ─────────────────── AUTH CHECK ─────────────────── */
  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* ─────────────────── LOAD USER PROGRESS ─────────────────── */
  useEffect(() => {
    if (!authChecked) return;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("course_progress")
        .select("lesson_id, module_index, completed, elapsed_seconds")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (!data || data.length === 0) {
        setProgress(0);
        setTimeRemaining(0);
        return;
      }

      const totalModules = COURSE.reduce(
        (sum, l) => sum + l.modules.length,
        0
      );

      const completedModules = data.length;

      setProgress(
        Math.min(100, Math.round((completedModules / totalModules) * 100))
      );

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
        const doneCount = data.filter(
          (r) => r.lesson_id === COURSE[l].id
        ).length;

        if (doneCount < COURSE[l].modules.length) {
          setResumeLesson(l);
          setResumeModule(doneCount);
          break;
        }
      }
    };

    fetchData();
  }, [authChecked]);

  /* ────────────── CONDITIONAL RENDERING (SAFE NOW) ────────────── */
  if (!authChecked) {
    return <Loader />;
  }

  /* ─────────────── CONTINUE COURSE ─────────────── */
  const handleContinue = () => {
    router.push(`/course?lesson=${resumeLesson}&module=${resumeModule}`);
  };

  const cardBtn =
    "px-4 py-2 bg-gray-200 text-[#001f40] rounded hover:bg-gray-300 w-full font-semibold text-center";

  const continueBtn =
    "px-4 py-2 rounded text-white font-semibold w-full text-center bg-[#ca5608] hover:bg-[#b24b06]";

  /* ─────────────── RENDER ─────────────── */
  return (
    <main className="min-h-screen bg-white text-[#001f40] fade-in">
      <div className="p-6 flex justify-center">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

          {/* Progress Card */}
          <div className="flex flex-col items-center gap-6 bg-white p-6 rounded-2xl shadow border border-gray-200">
            <div className="relative w-72 h-72 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  className="text-gray-300"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#ca5608]"
                  strokeDasharray={`${progress}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              <div className="absolute text-center">
                <p className="text-4xl font-bold">{progress}%</p>
                <p className="text-sm text-gray-600">
                  {timeRemaining.toFixed(1)} hrs left
                </p>
              </div>
            </div>

            <button onClick={handleContinue} className={continueBtn}>
              ▶ Continue My Course
            </button>
          </div>

          {/* Profile + Permit Panel */}
          <div className="bg-white rounded-2xl shadow-lg w-full p-6 border border-gray-200 flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Driving Updates</h2>

            <div className="flex flex-col gap-2">
              <Link href="/profile" className={cardBtn}>
                👤 Update Profile
              </Link>
              <p className="text-sm text-gray-500">
                Your personal information is incomplete.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/my-permit" className={cardBtn}>
                🧾 My Permit
              </Link>
              <p className="text-sm text-gray-500">
                Complete payment to unlock your final exam.
              </p>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
