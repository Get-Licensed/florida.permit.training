"use client";
export const dynamic = "force-dynamic";

import TopProgressBar from "@/components/TopProgressBar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";

/* ───────────────────────────────
   COURSE DATA
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
  { id: 1, title: "Introduction", duration: 10, thumbnail: "/thumbs/intro.jpg", modules: Array(10).fill("Introduction module content...") },
  { id: 2, title: "The Traffic Safety Problem", duration: 35, thumbnail: "/thumbs/safety.jpg", modules: Array(10).fill("Traffic Safety Problem content...") },
  { id: 3, title: "Physiological Effects of Alcohol and Other Drugs on Driving", duration: 35, thumbnail: "/thumbs/physiology.jpg", modules: Array(10).fill("Physiological Effects content...") },
  { id: 4, title: "Psychological Factors That Affect Driving Ability", duration: 25, thumbnail: "/thumbs/psych.jpg", modules: Array(8).fill("Psychological Factors content...") },
  { id: 5, title: "Driving Under the Influence", duration: 60, thumbnail: "/thumbs/dui.jpg", modules: Array(12).fill("DUI content...") },
  { id: 6, title: "Florida’s Graduated Driver Licensing and Insurance Laws", duration: 25, thumbnail: "/thumbs/licensing.jpg", modules: Array(8).fill("Licensing Laws content...") },
  { id: 7, title: "Driver Licensing Actions", duration: 25, thumbnail: "/thumbs/actions.jpg", modules: Array(8).fill("Licensing Actions content...") },
  { id: 8, title: "Vehicle Safety Maintenance and Crash Avoidance", duration: 40, thumbnail: "/thumbs/avoidance.jpg", modules: Array(10).fill("Vehicle Safety content...") },
  { id: 9, title: "Crash Dynamics and the Human Body While Driving", duration: 40, thumbnail: "/thumbs/dynamics.jpg", modules: Array(10).fill("Crash Dynamics content...") },
  { id: 10, title: "Florida’s Traffic Laws – Part 1", duration: 55, thumbnail: "/thumbs/laws1.jpg", modules: Array(12).fill("Traffic Laws Part 1 content...") },
  { id: 11, title: "Florida’s Traffic Laws – Part 2", duration: 55, thumbnail: "/thumbs/laws2.jpg", modules: Array(12).fill("Traffic Laws Part 2 content...") },
  { id: 12, title: "Florida’s Traffic Laws – Part 3", duration: 55, thumbnail: "/thumbs/laws3.jpg", modules: Array(12).fill("Traffic Laws Part 3 content...") },
  { id: 13, title: "Getting Behind the Wheel", duration: 55, thumbnail: "/thumbs/wheel.jpg", modules: Array(12).fill("Getting Behind the Wheel content...") },
];


const BRAND_ORANGE = "#ca5608";
const BRAND_BLUE = "#001f40";


/* ───────────────────────────────
   MAIN COMPONENT
────────────────────────────── */
export default function CoursePage() {
  const router = useRouter();

  /* 1) AUTH CHECK */
  const [authDone, setAuthDone] = useState(false);
  useEffect(() => {
    async function run() {
      await requireAuth(router);
      setAuthDone(true);
    }
    run();
  }, [router]);

  /* 2) LOAD SAVED PROGRESS */
  const [userId, setUserId] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});
  const [progressDone, setProgressDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data } = await supabase
          .from("course_progress")
          .select("lesson_id,module_index,completed")
          .eq("user_id", uid)
          .eq("completed", true);

        if (data) {
          const map: Record<string, boolean> = {};
          data.forEach((r) => (map[`${r.lesson_id}-${r.module_index}`] = true));
          setCompletedModules(map);
        }
      }

      setProgressDone(true);
    };
    load();
  }, []);

  /* 3) DECIDE WHERE TO RESUME */
  const [resumeLesson, setResumeLesson] = useState<number | null>(null);
  const [resumeModule, setResumeModule] = useState<number | null>(null);
  useEffect(() => {
    if (!progressDone) return;

    if (Object.keys(completedModules).length === 0) {
      setResumeLesson(0);
      setResumeModule(0);
      return;
    }

    for (let l = 0; l < COURSE.length; l++) {
      const lesson = COURSE[l];
      const idx = lesson.modules.findIndex((_, i) => completedModules[`${lesson.id}-${i}`] !== true);
      if (idx !== -1) {
        setResumeLesson(l);
        setResumeModule(idx);
        return;
      }
    }
  }, [progressDone, completedModules]);

  /* 4) SMOOTH PAGE-READY DELAY */
  const [pageReady, setPageReady] = useState(false);
  useEffect(() => {
    if (authDone && progressDone && resumeLesson !== null && resumeModule !== null) {
      const t = setTimeout(() => setPageReady(true), 350);
      return () => clearTimeout(t);
    }
  }, [authDone, progressDone, resumeLesson, resumeModule]);

  /* 5) ALWAYS-MOUNTED ACTIVE STATE */
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);

  useEffect(() => {
    if (resumeLesson !== null) setCurrentLesson(resumeLesson);
  }, [resumeLesson]);
  useEffect(() => {
    if (resumeModule !== null) setCurrentModule(resumeModule);
  }, [resumeModule]);

  const [timeLeft, setTimeLeft] = useState(30);
  const [isCounting, setIsCounting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [awaitingClick, setAwaitingClick] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [finalSegmentX, setFinalSegmentX] = useState<number | null>(null);

  // NEW: Narrator volume (0–1)
  const [volume, setVolume] = useState(1);

  const fmt = (s: number) => `${Math.ceil(Math.max(0, s))}s`;

  /* RESET TIMER WHEN MODULE CHANGES */
  const isModuleDone = (l: number, m: number) => completedModules[`${l}-${m}`] === true;
  useEffect(() => {
    if (resumeLesson === null || resumeModule === null) return;
    const lesson = COURSE[currentLesson];

    setAwaitingClick(false);
    if (isModuleDone(lesson.id, currentModule)) {
      setTimeLeft(0);
      setIsCounting(false);
      setIsComplete(true);
      setAwaitingClick(true);
      return;
    }

    const dur = lesson.moduleDurations?.[currentModule] ?? 30;
    setTimeLeft(dur);
    setIsCounting(true);
    setIsComplete(false);
  }, [currentLesson, currentModule]);

  /* PAUSE / RESUME */
  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsCounting(true);
    } else {
      setIsPaused(true);
      setIsCounting(false);
      speechSynthesis.cancel();
      setNarrating(false);
    }
  };

  /* COUNTDOWN */
  useEffect(() => {
    if (!isCounting || isPaused) return;

    const start = performance.now();
    const startingLeft = timeLeft;
    let id: number;

    const tick = (now: number) => {
      if (isPaused) return;
      const elapsed = (now - start) / 1000;
      const newLeft = Math.max(0, startingLeft - elapsed);

      setTimeLeft((p) => (Math.abs(p - newLeft) > 0.016 ? newLeft : p));

      if (newLeft <= 0) {
        setIsCounting(false);
        setIsComplete(true);
        setAwaitingClick(true);
        handleModuleComplete();
        cancelAnimationFrame(id);
      } else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [isCounting, isPaused]);

  /* SAVE COMPLETION */
  const handleModuleComplete = async () => {
    if (!userId) return;
    const lesson = COURSE[currentLesson];
    const key = `${lesson.id}-${currentModule}`;
    if (completedModules[key]) return;

    const dur = lesson.moduleDurations?.[currentModule] ?? 30;
    await supabase.from("course_progress").upsert(
      {
        user_id: userId,
        course_id: "FL_PERMIT_TRAINING",
        lesson_id: lesson.id,
        module_index: currentModule,
        completed: true,
        elapsed_seconds: dur,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id,lesson_id,module_index" }
    );

    setCompletedModules((prev) => ({ ...prev, [key]: true }));
  };

  /* NEXT / PREVIOUS */
  const handleNext = () => {
    if (!awaitingClick || isPaused) return;
    const lesson = COURSE[currentLesson];

    if (currentModule < lesson.modules.length - 1) {
      setCurrentModule(currentModule + 1);
    } else if (currentLesson < COURSE.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setCurrentModule(0);
    }
    setAwaitingClick(false);
    setIsComplete(false);
  };

  const handlePrev = () => {
    if (isPaused) return;
    if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
    } else if (currentLesson > 0) {
      const prev = COURSE[currentLesson - 1];
      setCurrentLesson(currentLesson - 1);
      setCurrentModule(prev.modules.length - 1);
    }
    setAwaitingClick(false);
    setIsComplete(false);
  };

  /* PROGRESS BAR */
  const lessonObj = COURSE[currentLesson];
  const moduleDuration = lessonObj.moduleDurations?.[currentModule] ?? 30;
  const moduleFraction = isComplete ? 1 : Math.max(0, Math.min(1, (moduleDuration - timeLeft) / moduleDuration));
  const progress = ((currentModule + moduleFraction) / lessonObj.modules.length) * 100;
  const totalMinutes = useMemo(() => COURSE.reduce((acc, l) => acc + l.duration, 0), []);
  const widthPercent = (l: Lesson) => (l.duration / totalMinutes) * 100;

  /* RENDER */
  return (
    <div className="relative min-h-screen bg-white">

      {/* LOADER */}
      <div
        style={{
          opacity: pageReady ? 0 : 1,
          pointerEvents: pageReady ? "none" : "all",
          transition: "opacity 0.45s ease",
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      >
        <img src="/steering-wheel.png" className="w-20 h-20 steering-animation opacity-80" />
      </div>

      {/* COURSE */}
      <main
        className="flex flex-col bg-white relative overflow-hidden"
        style={{
          opacity: pageReady ? 1 : 0,
          transition: "opacity 0.45s ease",
          height: "calc(100vh - (64px + 120px))",
        }}
      >
        {/* FIXED TOP PROGRESS BAR – ONLY ON COURSE PAGE */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-200 h-2">
          <TopProgressBar percent={progress} />
        </div>

        {/* CONTENT */}
        <section className="flex flex-col px-8 py-6 overflow-auto flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-[#001f40]">
              Module {currentModule + 1} of {lessonObj.modules.length}
            </h2>

            {/* Narrate + Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isPaused) return;
                  const utter = new SpeechSynthesisUtterance(lessonObj.modules[currentModule]);
                  utter.rate = 1;
                  utter.volume = volume; // use current volume
                  utter.onstart = () => setNarrating(true);
                  utter.onend = () => {
                    setNarrating(false);
                    setIsComplete(true);
                    setAwaitingClick(true);
                    handleModuleComplete();
                  };
                  speechSynthesis.speak(utter);
                }}
                disabled={narrating || isPaused}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-2xl transition-all ${
                  isPaused
                    ? "bg-gray-300 cursor-not-allowed"
                    : narrating
                    ? "bg-gray-400 scale-90"
                    : "bg-[#2596be] hover:bg-[#1f7ea1] hover:scale-110"
                }`}
              >
                🔊
              </button>

              {/* Volume slider */}
              <div className="flex flex-col items-start">
                <span className="text-[11px] text-[#001f40] font-medium mb-1">
                  Volume: {Math.round(volume * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-32 accent-[#ca5608]"
                />
              </div>
            </div>
          </div>

          <p className="text-[#001f40] leading-relaxed text-lg flex-1">
            {lessonObj.modules[currentModule]}
          </p>

         {/* <div className="text-sm text-[#ca5608] mt-3 font-medium">
          {awaitingClick ? "Module complete! ✅" : isPaused ? "Paused" : `Time remaining: ${fmt(timeLeft)}`}
        </div> */}

        </section>


              
      {/* FOOTER */}
      <footer
        className="fixed left-0 right-0 border-t shadow-inner bg-white z-40"
        style={{ bottom: "1px" }}
      >
      <div className="p-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center px-0 sm:px-0 lg:px-0 mb-0 select-none">


        {/* PREVIOUS ARROW */}
          <button
            onClick={handlePrev}
            disabled={(currentLesson === 0 && currentModule === 0) || isPaused}
            className={`
              p-1 sm:p-2 
              transition-opacity
              ${(currentLesson === 0 && currentModule === 0) || isPaused 
                ? "opacity-30 cursor-default" 
                : "cursor-pointer"}
            `}
          >
            <img
              src="/back-arrow.png"
              alt="Previous"
              className="w-16 sm:w-20 object-contain pointer-events-none"
            />
          </button>



          {/* PAUSE / RESUME (KEEP TEXT) */}
          <button
            onClick={togglePause}
            className="w-full sm:w-[160px] text-center px-5 py-2 rounded font-semibold text-white bg-[#ca5608] hover:bg-[#b24b06]"
          >
            {isPaused ? "▶️ Resume" : "⏸️ Pause"}
          </button>

        {/* NEXT ARROW */}
          <button
            onClick={handleNext}
            disabled={!awaitingClick || isPaused}
            className={`
              p-1 sm:p-2 
              transition-opacity
              ${(!awaitingClick || isPaused)
                ? "opacity-30 cursor-default"
                : "cursor-pointer"}
            `}
          >
            <img
              src="/forward-arrow.png"
              alt="Next"
              className="w-16 sm:w-20 object-contain pointer-events-none"
            />
          </button>
        </div>
      </div>
   </div>


        {/* TIMELINE (Homepage Style + Final Segment) */}
        <div className="p-4">
          <div className="max-w-6xl mx-auto px-4">
            <div className="relative w-full h-6 flex items-center">

              {/* Base rail */}
              <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full" />

              {/* Segments */}
              <div className="relative w-full h-6 flex items-center">
                {COURSE.map((l, i) => {
                  const done = i < currentLesson;
                  const active = i === currentLesson;
                 // A segment is unlocked if user has completed anything up to it, OR it's the current one
                  const unlocked =
                    i <= currentLesson ||
                    Object.keys(completedModules).some((key) =>
                      key.startsWith(`${COURSE[i].id}-`)
                    );

                  // Paused only blocks forward jumping, not backward review
                  const disabledClick = isPaused ? i > currentLesson : !unlocked;
                  const canClick = !disabledClick;

                  return (
                    <div
                      key={l.id}
                      style={{ width: `${widthPercent(l)}%` }}
                      className={`relative h-full flex items-center justify-center transition-all ${
                        disabledClick ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                      onClick={() => {
                        if (disabledClick) return;

                        setCurrentLesson(i);
                        const nextModule = COURSE[i].modules.findIndex(
                          (_, idx) => !completedModules[`${COURSE[i].id}-${idx}`]
                        );

                        setCurrentModule(nextModule === -1 ? 0 : nextModule);
                        setAwaitingClick(false);
                        setIsComplete(false);
                      }}
                    >
                      <div
                        className={`flex-1 h-2 transition-all duration-500 ${
                          done
                            ? "bg-[#001f40]"
                            : active
                            ? "bg-[#ca5608] shadow-[0_0_6px_#ca5608]"
                            : "bg-[#ca5608]/70"
                        } ${i === 0 ? "rounded-l-full" : ""}`}
                      ></div>

                      {i < COURSE.length - 1 && <div className="w-[3px] h-full bg-white" />}
                    </div>
                  );

                })}

                {/* Divider before final segment */}
                <div className="w-[3px] h-full bg-white" />

                {/* FINAL SEGMENT */}
                  <div
                    className="relative h-full flex items-center justify-center"
                    style={{ width: "4%" }}
                  >
                    <div
                      className="flex-1 h-2 bg-[#001f40] rounded-r-full cursor-pointer"
                      onMouseEnter={(e) => {
                        if (window.innerWidth >= 768) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setFinalSegmentX(rect.left + rect.width / 2);
                        }
                        setShowFinalCard(true);
                      }}
                      onMouseLeave={() => {
                        if (window.innerWidth >= 768) {
                          setTimeout(() => setShowFinalCard(false), 200);
                        }
                      }}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setShowFinalCard(true);
                        }
                      }}
                    />
                  </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showFinalCard && (
        <div
          className="fixed bg-[#001f40] text-white rounded-xl shadow-xl p-5 z-50"
          style={{
            bottom: "80px",
            left:
              window.innerWidth >= 768 && finalSegmentX
                ? `${finalSegmentX}px`
                : "50%",
            transform:
              window.innerWidth >= 768 && finalSegmentX
                ? "translateX(-50%)"
                : "translateX(-50%)",
            width: "260px",
          }}
        >
          <PromoText />
          <Arrow />

          {/* Mobile close button */}
          <button
            onClick={() => setShowFinalCard(false)}
            className="absolute top-1 right-2 text-white text-lg block md:hidden"
          >
            ✕
          </button>
        </div>
      )}


      </main> 
    </div>
  );
}

/* ------------ FINAL ACTIONS CONTENT ------------ */
function PromoText() {
  return (
    <div className="text-center">
      {/* STEP 1 */}
      <p className="text-[12px] italic opacity-90">(No cost)</p>
      <h3 className="font-bold text-[15px] leading-tight mb-2">6 hour course</h3>

      <hr className="border-white/30 my-3" />

      {/* STEP 2 */}
      <p className="text-[12px] italic opacity-90">(No cost)</p>
      <h3 className="font-bold text-[15px] leading-tight mb-2">
        Pass 40 question final
      </h3>

      <hr className="border-white/30 my-3" />

      {/* STEP 3 */}
      <h3 className="text-[12px] font-semibold leading-tight mb-1">Pay $59.95</h3>
      <p className="text-[12px] opacity-90 mb-3">
        Electronically submit your test<br /> results to the DMV
      </p>

      <hr className="border-white/30 my-3" />

      {/* STEP 4 (NO LINE BREAKS, ALL 12px) */}
      <p className="text-[12px] opacity-90">
        Set DMV appointment! Bring: 2 forms of proof of Residency, Social Security card,
        Birth certificate & a smile for the camera!
        <br />
        <span className="font-semibold">$48 Payable to the FL DMV</span>
      </p>
    </div>
  );
}



function Arrow() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8"
      style={{
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#001f40",
        bottom: "-7px",
      }}
    />
  );
}
