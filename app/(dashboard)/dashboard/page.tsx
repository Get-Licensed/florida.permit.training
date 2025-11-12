"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ─────────────── COURSE STRUCTURE (same as CoursePage) ─────────────── */
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
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [resumeLesson, setResumeLesson] = useState(0);
  const [resumeModule, setResumeModule] = useState(0);

  /* ─────────────── LOAD USER DATA + PROGRESS ─────────────── */
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }

      const { data, error } = await supabase
        .from("course_progress")
        .select("lesson_id, module_index, completed, elapsed_seconds")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) {
        console.error("❌ Error fetching progress:", error.message);
        return;
      }

      setNotifications([]);

      if (!data || data.length === 0) {
        setProgress(0);
        setTimeRemaining(0);
        return;
      }

      // Calculate total and completed
      const totalModules = COURSE.reduce((sum, l) => sum + l.modules.length, 0);
      const completedModules = data.length;
      const percent = Math.min(100, Math.round((completedModules / totalModules) * 100));
      setProgress(percent);

      // Estimate remaining hours
      const totalSeconds = COURSE.reduce(
        (sum, l) => sum + l.modules.length * 30, // assume 30s per module if not timed
        0
      );
      const completedSeconds = data.reduce((sum, r) => sum + (r.elapsed_seconds ?? 30), 0);
      const remainingSeconds = Math.max(0, totalSeconds - completedSeconds);
      setTimeRemaining(remainingSeconds / 3600); // in hours

      // Determine resume point (first incomplete module)
      for (let l = 0; l < COURSE.length; l++) {
        const mods = COURSE[l].modules;
        const completedCount = data.filter((r) => r.lesson_id === COURSE[l].id).length;
        if (completedCount < mods.length) {
          setResumeLesson(l);
          setResumeModule(completedCount);
          break;
        }
      }
    };

    fetchData();
  }, [router]);

  /* ─────────────── CONTINUE COURSE ─────────────── */
  const handleContinue = () => {
    router.push(`/course?lesson=${resumeLesson}&module=${resumeModule}`);
  };

  /* ─────────────── STYLES ─────────────── */
  const cancelBtnClasses =
    "px-4 py-2 bg-gray-300 text-[#001f40] rounded hover:bg-gray-400 w-full sm:w-auto text-center font-semibold";
  const saveBtnClasses = (saving: boolean) =>
    `px-4 py-2 rounded text-white font-semibold w-full sm:w-auto text-center ${
      saving ? "bg-gray-400" : "bg-[#ca5608] hover:bg-[#b24b06]"
    }`;

  /* ─────────────── UI ─────────────── */
  return (
    <main className="flex flex-col min-h-screen bg-[#001f40] text-white">
      {/* Top white bar */}
      <div className="w-full h-2 bg-white" />

      <div className="flex-1 p-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto mb-10">

          {/* Speedometer + Continue Button */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-72 h-72 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  className="text-gray-700"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#ca5608]"
                  strokeDasharray={`${progress}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-4xl font-bold">{progress}%</p>
                <p className="text-sm text-gray-300">
                  {timeRemaining.toFixed(1)} hrs left
                </p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className={saveBtnClasses(false)}
            >
              ▶ Continue My Course
            </button>
          </div>

          {/* Driving Updates + Profile/My Permit */}
          <div className="bg-gray-900 rounded-2xl shadow-lg w-full p-6 border border-gray-700 flex flex-col gap-6">
            <h2 className="text-xl font-semibold">📻 Driving Updates</h2>

            <div className="flex flex-col gap-2">
              <Link href="/profile" className={cancelBtnClasses}>
                👤 Update Profile
              </Link>
              <p className="text-sm text-gray-400">
                📋 Profile incomplete — please update your personal info.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/my-permit" className={cancelBtnClasses}>
                🧾 My Permit
              </Link>
              <p className="text-sm text-gray-400">
                💳 Payment pending — complete checkout to unlock your exam.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
