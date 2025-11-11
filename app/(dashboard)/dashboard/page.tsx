
export const dynamic = "force-dynamic";

"use client";


import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

/* ─────────────────────────────────────────
   Course lesson structure
───────────────────────────────────────── */
type Lesson = {
  id: number;
  title: string;
  duration: number;
  thumbnail: string;
  content: string;
};


const COURSE: Lesson[] = [
  { id: 0, title: "Begin Course", duration: 5, thumbnail: "/thumbs/begin.jpg", content: "Welcome to the Florida Permit Course. Learn about the course structure and what to expect." },
  { id: 1, title: "Introduction", duration: 5, thumbnail: "/thumbs/intro.jpg", content: "This section introduces the basics of Florida driving safety and licensing laws." },
  { id: 2, title: "The Traffic Safety Problem", duration: 25, thumbnail: "/thumbs/safety.jpg", content: "In this section we discuss common causes of accidents and how to prevent them." },
  { id: 3, title: "Physiological Effects of Alcohol and Other Drugs on Driving", duration: 25, thumbnail: "/thumbs/physiology.jpg", content: "Understand how alcohol and drugs impair driving ability." },
  { id: 4, title: "Psychological Factors That Affect Driving Ability", duration: 15, thumbnail: "/thumbs/psych.jpg", content: "Learn how emotions and fatigue impact driving safety." },
  { id: 5, title: "Driving Under the Influence", duration: 45, thumbnail: "/thumbs/dui.jpg", content: "Explore Florida DUI laws and prevention strategies." },
  { id: 6, title: "Graduated Driver Licensing & Insurance Laws", duration: 15, thumbnail: "/thumbs/licensing.jpg", content: "An overview of GDL and insurance requirements for young drivers." },
  { id: 7, title: "Driver Licensing Actions", duration: 15, thumbnail: "/thumbs/actions.jpg", content: "What happens when your license is suspended or revoked." },
  { id: 8, title: "Vehicle Safety Maintenance & Crash Avoidance", duration: 30, thumbnail: "/thumbs/avoidance.jpg", content: "Learn the essentials of maintaining your vehicle safely." },
  { id: 9, title: "Crash Dynamics & Human Body", duration: 30, thumbnail: "/thumbs/dynamics.jpg", content: "Physics of crashes and their effect on the human body." },
  { id: 10, title: "Florida Traffic Laws – Part 1", duration: 45, thumbnail: "/thumbs/laws1.jpg", content: "Learn the core traffic laws every Florida driver must know." },
  { id: 11, title: "Florida Traffic Laws – Part 2", duration: 45, thumbnail: "/thumbs/laws2.jpg", content: "Continuing Florida laws with practical driving scenarios." },
  { id: 12, title: "Florida Traffic Laws – Part 3", duration: 45, thumbnail: "/thumbs/laws3.jpg", content: "Final section on state laws, tickets, and safety enforcement." },
  { id: 13, title: "Getting Behind the Wheel", duration: 45, thumbnail: "/thumbs/wheel.jpg", content: "Prepare for your road test and defensive driving strategies." },
  { id: 14, title: "Pay $49 — No other fees", duration: 5, thumbnail: "", content: "Complete your payment securely to unlock certification." },
  { id: 15, title: "Take Final Exam Online (FREE)", duration: 15, thumbnail: "", content: "Complete your final exam online." },
  { id: 16, title: "Receive Permit In The Mail (FREE)", duration: 5, thumbnail: "", content: "Congratulations! Your permit will arrive shortly." },
];


const BRAND_ORANGE = "#ca5608";
const BRAND_BLUE = "#001f40";


export default function CoursePage() {
  const [current, setCurrent] = useState(0);
  const [hoverLesson, setHoverLesson] = useState<Lesson | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);


  const totalMinutes = useMemo(
    () => COURSE.reduce((acc, l) => acc + l.duration, 0),
    []
  );


  const completedIndex = current - 1;


  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);


  // Lesson timer
  useEffect(() => {
    setElapsed(0);
    if (COURSE[current].duration > 0) {
      const timer = setInterval(() => {
        setElapsed((e) => {
          if (e >= COURSE[current].duration * 60) {
            clearInterval(timer);
            return e;
          }
          return e + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [current]);


  const widthPercent = (lesson: Lesson) =>
    (lesson.duration / totalMinutes) * 100;


  const CARD_W = 300;
  const CARD_MARGIN = 12;
  const cardLeft =
    Math.max(
      CARD_MARGIN,
      Math.min(mouseX - CARD_W / 2, Math.max(0, vw) - CARD_W - CARD_MARGIN)
    ) + "px";


  const playNarration = () => {
    const utter = new SpeechSynthesisUtterance(COURSE[current].content);
    utter.rate = 1;
    utter.pitch = 1;
    speechSynthesis.speak(utter);
  };


  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ──────────────── LESSON CONTENT ──────────────── */}
      <section className="flex-1 px-6 py-6">
        <h1 className="text-2xl font-bold text-[#001f40] mb-2">
          {COURSE[current].title}
        </h1>
        <p className="text-[#001f40] text-lg leading-relaxed mb-4">
          {COURSE[current].content}
        </p>


        <p className="text-sm text-[#666]">
          Time elapsed: {Math.floor(elapsed / 60)}m {elapsed % 60}s
        </p>


        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            className="px-4 py-2 bg-[#001f40] text-white rounded disabled:opacity-50"
            disabled={current === 0}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrent((c) => Math.min(COURSE.length - 1, c + 1))}
            className="px-4 py-2 bg-[#ca5608] text-white rounded"
          >
            Next
          </button>
          <button
            onClick={playNarration}
            className="ml-auto px-4 py-2 bg-[#2596be] text-white rounded"
          >
            🔊 Narrate
          </button>
        </div>
      </section>


      {/* ──────────────── HOVER CARD ──────────────── */}
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


          {hoverLesson.id < 14 && (
            <>
              <p className="text-xs opacity-90 mb-2">
                Duration: {hoverLesson.duration} minutes
              </p>
              <div className="w-full h-20 bg-black/20 rounded flex items-center justify-center text-[11px]">
                (thumbnail here)
              </div>
            </>
          )}
        </div>
      )}


      {/* ──────────────── TIMELINE ──────────────── */}
      <footer className="w-full border-t shadow-inner p-4 relative bg-white">
        <div className="relative w-full h-6 flex">
          {COURSE.map((l, i) => {
            const done = i <= completedIndex;
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
                onClick={() => setCurrent(i)}
              >
                <div
                  className="flex-1 h-2 self-center transition-colors"
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


        {/* Durations */}
        <div className="flex w-full mt-1">
          {COURSE.map((l) => (
            <div
              key={`dur-${l.id}`}
              style={{ width: `${widthPercent(l)}%` }}
              className="flex justify-center"
            >
              <span className="text-[9px] text-[#ca5608]">
                {l.id < 14 && l.duration > 1 ? `${l.duration} min` : ""}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}



