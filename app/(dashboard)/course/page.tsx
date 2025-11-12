"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

/* ───────────────────────────────
   COURSE LESSON STRUCTURE
────────────────────────────── */
type Lesson = {
  id: number;
  title: string;
  duration: number;
  thumbnail: string;
  modules: string[];
  moduleDurations?: number[];
};

const COURSE: Lesson[] = [
  { id: 1, title: "Introduction", duration: 5, thumbnail: "/thumbs/intro.jpg", modules: Array(10).fill("Introduction module content...") },
  { id: 2, title: "The Traffic Safety Problem", duration: 25, thumbnail: "/thumbs/safety.jpg", modules: Array(10).fill("Traffic Safety Problem content...") },
  { id: 3, title: "Physiological Effects of Alcohol and Other Drugs on Driving", duration: 25, thumbnail: "/thumbs/physiology.jpg", modules: Array(10).fill("Physiological Effects content...") },
  { id: 4, title: "Psychological Factors That Affect Driving Ability", duration: 15, thumbnail: "/thumbs/psych.jpg", modules: Array(8).fill("Psychological Factors content...") },
  { id: 5, title: "Driving Under the Influence", duration: 45, thumbnail: "/thumbs/dui.jpg", modules: Array(12).fill("DUI content...") },
  { id: 6, title: "Florida’s Graduated Driver Licensing and Insurance Laws", duration: 15, thumbnail: "/thumbs/licensing.jpg", modules: Array(8).fill("Licensing Laws content...") },
  { id: 7, title: "Driver Licensing Actions", duration: 15, thumbnail: "/thumbs/actions.jpg", modules: Array(8).fill("Licensing Actions content...") },
  { id: 8, title: "Vehicle Safety Maintenance and Crash Avoidance", duration: 30, thumbnail: "/thumbs/avoidance.jpg", modules: Array(10).fill("Vehicle Safety content...") },
  { id: 9, title: "Crash Dynamics and the Human Body While Driving", duration: 30, thumbnail: "/thumbs/dynamics.jpg", modules: Array(10).fill("Crash Dynamics content...") },
  { id: 10, title: "Florida’s Traffic Laws – Part 1", duration: 45, thumbnail: "/thumbs/laws1.jpg", modules: Array(12).fill("Traffic Laws Part 1 content...") },
  { id: 11, title: "Florida’s Traffic Laws – Part 2", duration: 45, thumbnail: "/thumbs/laws2.jpg", modules: Array(12).fill("Traffic Laws Part 2 content...") },
  { id: 12, title: "Florida’s Traffic Laws – Part 3", duration: 45, thumbnail: "/thumbs/laws3.jpg", modules: Array(12).fill("Traffic Laws Part 3 content...") },
  { id: 13, title: "Getting Behind the Wheel", duration: 45, thumbnail: "/thumbs/wheel.jpg", modules: Array(12).fill("Getting Behind the Wheel content...") },
];

const BRAND_ORANGE = "#ca5608";
const BRAND_BLUE = "#001f40";

/* ───────────────────────────────
   MAIN COMPONENT
────────────────────────────── */
export default function CoursePage() {
  const [hoverLesson, setHoverLesson] = useState<Lesson | null>(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [awaitingClick, setAwaitingClick] = useState(false); // ← NEW: user must click Next
  const [narrating, setNarrating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});

  /* Format helpers */
  const fmt = (s: number) => {
    const sec = Math.max(0, Math.ceil(s));
    const m = Math.floor(sec / 60);
    const ss = String(sec % 60).padStart(2, "0");
    return m > 0 ? `${m}:${ss}` : `${sec}s`;
  };
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  /* ─────────────── Load user progress ─────────────── */
  useEffect(() => {
    const loadProgress = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      setUserId(uid || null);
      if (!uid) return;

      const { data } = await supabase
        .from("course_progress")
        .select("lesson_id, module_index, completed")
        .eq("user_id", uid)
        .eq("completed", true);

      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((r) => (map[`${r.lesson_id}-${r.module_index}`] = true));
        setCompletedModules(map);
      }
    };
    loadProgress();
  }, []);

  const isModuleCompleted = (lessonId: number, modIdx: number) =>
    completedModules[`${lessonId}-${modIdx}`] === true;

  /* ─────────────── Resume from last incomplete ─────────────── */
  useEffect(() => {
    if (!Object.keys(completedModules).length) return;
    for (let l = 0; l < COURSE.length; l++) {
      const mods = COURSE[l].modules;
      const firstIncomplete = mods.findIndex((_, idx) => !isModuleCompleted(COURSE[l].id, idx));
      if (firstIncomplete !== -1) {
        setCurrentLesson(l);
        setCurrentModule(firstIncomplete);
        return;
      }
    }
  }, [completedModules]);

  /* ─────────────── Responsive width ─────────────── */
  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ─────────────── Timer setup ─────────────── */
  useEffect(() => {
    const lesson = COURSE[currentLesson];

    // Starting any module resets the click requirement
    setAwaitingClick(false);

    if (isModuleCompleted(lesson.id, currentModule)) {
      setTimeLeft(0);
      setIsCounting(false);
      setIsComplete(true);
      // In review mode, still require a click to advance
      setAwaitingClick(true);
      return;
    }
    const dur = lesson.moduleDurations?.[currentModule] ?? 30;
    setTimeLeft(dur);
    setIsCounting(true);
    setIsComplete(false);
  }, [currentLesson, currentModule]);

  /* ─────────────── Pause on blur ─────────────── */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setIsCounting(false);
      else if (timeLeft > 0 && !isComplete) setIsCounting(true);
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timeLeft > 0 && !isComplete) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [timeLeft, isComplete]);

  /* ─────────────── Smooth countdown ─────────────── */
  useEffect(() => {
    if (!isCounting) return;

    const start = performance.now();
    const startLeft = timeLeft;
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const newLeft = Math.max(0, startLeft - elapsed);
      setTimeLeft((prev) => (Math.abs(prev - newLeft) > 0.016 ? newLeft : prev));

      if (newLeft <= 0) {
        setIsCounting(false);
        setIsComplete(true);
        setAwaitingClick(true); // ← require explicit click
        handleModuleComplete();
        // subtle chime when complete
        const audio = new Audio("/sounds/complete.mp3");
        audio.volume = 0.4;
        audio.play().catch(() => {});
        cancelAnimationFrame(frameId);
      } else frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isCounting]);

  /* ─────────────── Narration ─────────────── */
  const handleNarrate = () => {
    const text = COURSE[currentLesson].modules[currentModule];
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.onstart = () => setNarrating(true);
    utter.onend = () => {
      setNarrating(false);
      setIsComplete(true);
      setAwaitingClick(true); // ← require explicit click after narration
      handleModuleComplete();
    };
    speechSynthesis.speak(utter);
  };

  /* ─────────────── Save progress ─────────────── */
  const handleModuleComplete = async () => {
    if (!userId) return;
    const lesson = COURSE[currentLesson];
    const key = `${lesson.id}-${currentModule}`;
    if (completedModules[key]) return;
    const moduleDuration = lesson.moduleDurations?.[currentModule] ?? 30;

    const { error } = await supabase
      .from("course_progress")
      .upsert(
        {
          user_id: userId,
          course_id: "FL_PERMIT_TRAINING",
          lesson_id: lesson.id,
          module_index: currentModule,
          completed: true,
          elapsed_seconds: moduleDuration,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_id,lesson_id,module_index" }
      );

    if (!error) setCompletedModules((prev) => ({ ...prev, [key]: true }));
    else console.error("❌ Error saving progress:", error.message);
  };

  /* ─────────────── Navigation ─────────────── */
  const handleNext = () => {
    // Absolute guard: never move unless user has clicked after completion
    if (!awaitingClick) return;

    const lesson = COURSE[currentLesson];
    if (currentModule < lesson.modules.length - 1) {
      setCurrentModule(currentModule + 1);
    } else if (currentLesson < COURSE.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setCurrentModule(0);
    }
    // reset click requirement for the next module (timer setup also resets)
    setAwaitingClick(false);
    setIsComplete(false);
  };

  const handlePrev = () => {
    if (currentModule > 0) setCurrentModule(currentModule - 1);
    else if (currentLesson > 0) {
      const prev = COURSE[currentLesson - 1];
      setCurrentLesson(currentLesson - 1);
      setCurrentModule(prev.modules.length - 1);
    }
    setAwaitingClick(false);
    setIsComplete(false);
  };

  /* ─────────────── Progress ─────────────── */
  const lesson = COURSE[currentLesson];
  const moduleDuration = lesson.moduleDurations?.[currentModule] ?? 30;
  const moduleFraction = isComplete ? 1 : clamp01((moduleDuration - timeLeft) / moduleDuration);
  const lessonModuleCount = lesson.modules.length;
  const progress = ((currentModule + moduleFraction) / lessonModuleCount) * 100;

  const totalMinutes = useMemo(() => COURSE.reduce((acc, l) => acc + l.duration, 0), []);
  const widthPercent = (l: Lesson) => (l.duration / totalMinutes) * 100;
  const CARD_W = 300;
  const CARD_MARGIN = 12;
  const cardLeft =
    Math.max(CARD_MARGIN, Math.min(mouseX - CARD_W / 2, Math.max(0, vw) - CARD_W - CARD_MARGIN)) + "px";

  /* ─────────────── UI ─────────────── */
  return (
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "calc(100vh - (64px + 120px))" }}>
      {/* Top progress bar */}
      <div className="w-full h-2 bg-gray-200">
        <div className="h-2" style={{ width: `${progress}%`, backgroundColor: BRAND_ORANGE }} />
      </div>

      {/* Module content */}
      <section className="flex flex-col px-8 py-6 overflow-auto flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#001f40]">
            Module {currentModule + 1} of {lesson.modules.length}
          </h2>
          <button
            onClick={handleNarrate}
            disabled={narrating}
            className={`px-4 py-2 rounded text-white font-semibold ${
              narrating ? "bg-gray-400 cursor-not-allowed" : "bg-[#2596be] hover:bg-[#1f7ea1]"
            }`}
          >
            🔊 {narrating ? "Playing..." : "Narrate"}
          </button>
        </div>

        <p className="text-[#001f40] leading-relaxed text-lg flex-1">{lesson.modules[currentModule]}</p>
        <div className="text-sm text-[#ca5608] mt-3 font-medium">
          {awaitingClick ? "Module complete! ✅" : `Time remaining: ${fmt(timeLeft)}`}
        </div>
      </section>

      {/* Footer with buttons + timeline */}
      <footer className="fixed left-0 right-0 border-t shadow-inner bg-white" style={{ bottom: "1px" }}>
        <div className="flex justify-between items-center px-8 pb-1 py-6">
          <button
            onClick={handlePrev}
            className={`px-5 py-2 rounded font-semibold text-white ${
              currentLesson === 0 && currentModule === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#001f40] hover:bg-[#00356e]"
            }`}
            disabled={currentLesson === 0 && currentModule === 0}
          >
            Previous
          </button>

          <p className="text-sm text-[#666]">
            {currentModule + 1} / {lesson.modules.length}
          </p>

          <button
            onClick={handleNext}
            disabled={!awaitingClick}
            aria-disabled={!awaitingClick}
            className={`px-5 py-2 rounded font-semibold text-white transition-all ${
              awaitingClick
                ? "bg-[#ca5608] hover:bg-[#b24b06] animate-pulse cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {awaitingClick ? "Next" : `Wait ${fmt(timeLeft)}`}
          </button>
        </div>

        {/* Timeline */}
        <div className="p-4">
          <div className="relative w-full h-6 flex">
            {COURSE.map((l, i) => {
              const done = i < currentLesson;
              const active = i === currentLesson;
              const locked = i > currentLesson;

              return (
                <div
                  key={`seg-${l.id}`}
                  style={{ width: `${widthPercent(l)}%` }}
                  className={`relative h-full flex items-center justify-center transition-all duration-300 ${
                    locked ? "opacity-40" : "cursor-pointer"
                  }`}
                  onMouseEnter={(e) => {
                    setHoverLesson(l);
                    setMouseX(e.clientX);
                  }}
                  onMouseMove={(e) => setMouseX(e.clientX)}
                  onMouseLeave={() => setHoverLesson(null)}
                  onClick={() => {
                    if (!locked) {
                      setCurrentLesson(i);
                      setCurrentModule(0);
                      setAwaitingClick(false);
                      setIsComplete(false);
                    }
                  }}
                >
                  <div
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                      done
                        ? "bg-[#001f40]" // Completed = Blue
                        : active
                        ? "bg-[#ca5608] shadow-[0_0_6px_#ca5608]" // Active = glowing orange
                        : "bg-[#ca5608]/70" // Future = muted orange
                    }`}
                  />
                  {i < COURSE.length - 1 && <div className="w-[3px] h-full bg-white" />}

                  {/* 🚫 Hover Overlay for Locked Lessons */}
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-red-600 text-xl">🚫</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Duration labels */}
          <div className="flex w-full mt-1">
            {COURSE.map((l) => (
              <div key={`dur-${l.id}`} style={{ width: `${widthPercent(l)}%` }} className="flex justify-center">
                <span className="text-[9px] text-[#ca5608]">{l.duration > 0 ? `${l.duration} min` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>

      {/* Hover card */}
      {hoverLesson && (
        <div
          className="fixed z-30 bg-[var(--card-bg)] text-white shadow-xl rounded-lg p-4 w-[300px] pointer-events-none"
          style={{ left: `${cardLeft}`, bottom: "80px", "--card-bg": BRAND_ORANGE } as React.CSSProperties}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
            style={{ borderTopColor: BRAND_ORANGE }}
          />
          <h2 className="text-base font-bold mb-1 leading-snug">{hoverLesson.title}</h2>
          {hoverLesson.thumbnail && (
            <>
              <p className="text-xs opacity-90 mb-2">Duration: {hoverLesson.duration} minutes</p>
              <div className="w-full h-20 bg-black/20 rounded flex items-center justify-center text-[11px]">
                (Thumbnail: {hoverLesson.thumbnail})
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
