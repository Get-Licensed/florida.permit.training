"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
export const dynamic = "force-dynamic";

/* ───────────────────────────────
   COURSE LESSON STRUCTURE
────────────────────────────── */
type Lesson = {
  id: number;
  title: string;
  duration: number;
  thumbnail: string;
  modules: string[];
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
   MENU ICONS
────────────────────────────── */
const Menu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const Close = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ───────────────────────────────
   MAIN PAGE COMPONENT
────────────────────────────── */
export default function CoursePage() {
  const [hoverLesson, setHoverLesson] = useState<Lesson | null>(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  const totalMinutes = useMemo(
    () => COURSE.reduce((acc, l) => acc + l.duration, 0),
    []
  );

  const widthPercent = (lesson: Lesson) =>
    (lesson.duration / totalMinutes) * 100;

  const progress =
    ((currentModule + 1) / COURSE[currentLesson].modules.length) * 100;

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const CARD_W = 300;
  const CARD_MARGIN = 12;
  const cardLeft =
    Math.max(
      CARD_MARGIN,
      Math.min(mouseX - CARD_W / 2, Math.max(0, vw) - CARD_W - CARD_MARGIN)
    ) + "px";

  const handleNext = () => {
    if (currentModule < COURSE[currentLesson].modules.length - 1) {
      setCurrentModule(currentModule + 1);
    } else if (currentLesson < COURSE.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setCurrentModule(0);
    }
  };

  const handlePrev = () => {
    if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
    } else if (currentLesson > 0) {
      const prev = COURSE[currentLesson - 1];
      setCurrentLesson(currentLesson - 1);
      setCurrentModule(prev.modules.length - 1);
    }
  };

  /* ───────────────────────────────
      UI
  ─────────────────────────────── */
  return (
    <main className="flex flex-col min-h-screen bg-white relative">


      {/* ─────────────── PROGRESS BAR ─────────────── */}
      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-2 transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: BRAND_ORANGE }}
        />
      </div>

      {/* ─────────────── COURSE MODULE SECTION ─────────────── */}
      <section className="flex-1 flex flex-col px-8 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#001f40]">
            Module {currentModule + 1} of {COURSE[currentLesson].modules.length}
          </h2>
          <button
            onClick={() => {
              const text = COURSE[currentLesson].modules[currentModule];
              const utter = new SpeechSynthesisUtterance(text);
              utter.rate = 1;
              speechSynthesis.speak(utter);
            }}
            className="bg-[#2596be] text-white px-4 py-2 rounded hover:bg-[#1f7ea1]"
          >
            🔊 Narrate
          </button>
        </div>

        <p className="text-[#001f40] leading-relaxed text-lg flex-1">
          {COURSE[currentLesson].modules[currentModule]}
        </p>

        <div className="flex justify-between items-center mt-8">
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
            {currentModule + 1} / {COURSE[currentLesson].modules.length}
          </p>

          <button
            onClick={handleNext}
            className={`px-5 py-2 rounded font-semibold text-white ${
              currentLesson === COURSE.length - 1 &&
              currentModule === COURSE[currentLesson].modules.length - 1
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#ca5608] hover:bg-[#b24b06]"
            }`}
          >
            Next
          </button>
        </div>
      </section>

      {/* ─────────────── TIMELINE FOOTER ─────────────── */}
      <footer className="w-full border-t shadow-inner p-4 relative bg-white">
        <div className="relative w-full h-6 flex">
          {COURSE.map((l, i) => {
            const done = i < currentLesson;
            return (
              <div
                key={`seg-${l.id}`}
                style={{ width: `${widthPercent(l)}%` }}
                className="relative h-full flex"
                onMouseEnter={(e) => {
                  setHoverLesson(l);
                  setMouseX(e.clientX);
                }}
                onMouseMove={(e) => setMouseX(e.clientX)}
                onMouseLeave={() => setHoverLesson(null)}
                onClick={() => {
                  setCurrentLesson(i);
                  setCurrentModule(0);
                }}
              >
                <div
                  className="flex-1 h-2 self-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: done ? BRAND_BLUE : BRAND_ORANGE,
                  }}
                />
                {i < COURSE.length - 1 && (
                  <div className="w-[3px] h-full bg-white" />
                )}
              </div>
            );
          })}
        </div>

        {/* Durations under timeline */}
        <div className="flex w-full mt-1">
          {COURSE.map((l) => (
            <div
              key={`dur-${l.id}`}
              style={{ width: `${widthPercent(l)}%` }}
              className="flex justify-center"
            >
              <span className="text-[9px] text-[#ca5608]">
                {l.duration > 0 ? `${l.duration} min` : ""}
              </span>
            </div>
          ))}
        </div>
      </footer>

      {/* ─────────────── HOVER CARD ─────────────── */}
      {hoverLesson && (
        <div
          className="fixed z-30 bg-[var(--card-bg)] text-white shadow-xl rounded-lg p-4 w-[300px] pointer-events-none transition-transform"
          style={
            {
              left: cardLeft,
              bottom: "96px",
              "--card-bg": BRAND_ORANGE,
            } as React.CSSProperties
          }
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
            style={{ borderTopColor: BRAND_ORANGE }}
          />
          <h2 className="text-base font-bold mb-1 leading-snug">
            {hoverLesson.title}
          </h2>

          {hoverLesson.thumbnail && (
            <>
              <p className="text-xs opacity-90 mb-2">
                Duration: {hoverLesson.duration} minutes
              </p>
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
