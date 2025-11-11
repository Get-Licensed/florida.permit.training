"use client";

import { useState, useEffect } from "react";

/* ─────────────────────────────────────────
   Course structure (simplified)
───────────────────────────────────────── */
type Lesson = {
  id: number;
  title: string;
  duration: number; // seconds
  text: string;
};

const COURSE: Lesson[] = [
  {
    id: 0,
    title: "Begin Course",
    duration: 10,
    text: "Welcome to the course. In this section we’ll explain how to navigate and complete your Florida permit training lessons.",
  },
  {
    id: 1,
    title: "Introduction to Safe Driving",
    duration: 20,
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula mi at sapien tristique, ut facilisis justo efficitur. Vivamus ut nisi quis magna malesuada pharetra nec in nulla. Duis congue felis sed ante dignissim, sed congue augue blandit.`,
  },
  {
    id: 2,
    title: "The Traffic Safety Problem",
    duration: 25,
    text: `Curabitur dictum, velit at volutpat convallis, elit erat dignissim nulla, et porta nulla arcu non justo. Integer vel sodales purus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.`,
  },
  {
    id: 3,
    title: "Driving Under the Influence",
    duration: 30,
    text: `Phasellus non purus ut risus sagittis tincidunt non non purus. Duis tincidunt nulla et mi malesuada, nec dignissim nisi gravida.`,
  },
];

const BRAND_ORANGE = "#ca5608";
const BRAND_BLUE = "#001f40";

export default function DashboardCoursePlayer() {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(COURSE[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedIndex, setCompletedIndex] = useState(0);
  const [hoverLesson, setHoverLesson] = useState<Lesson | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);

  const totalDuration = COURSE.reduce((acc, l) => acc + l.duration, 0);
  const widthPercent = (lesson: Lesson) => (lesson.duration / totalDuration) * 100;

  // Simulate narration timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isPlaying && progress < 100) {
      timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (100 / currentLesson.duration);
          if (next >= 100) {
            clearInterval(timer!);
            setIsPlaying(false);
            setCanAdvance(true);
            setCompletedIndex((prev) => Math.max(prev, currentLesson.id));
            return 100;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentLesson]);

  // Reset when lesson changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCanAdvance(false);
  }, [currentLesson]);

  // Handle navigation
  function goToNext() {
    const next = COURSE[currentLesson.id + 1];
    if (next) setCurrentLesson(next);
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ───────────── LESSON PLAYER ───────────── */}
      <div className="flex-1 w-full px-6 pt-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[#001f40] mb-2">
          {currentLesson.title}
        </h1>

        <p className="text-gray-700 leading-relaxed text-center max-w-3xl mb-8 whitespace-pre-line">
          {currentLesson.text}
        </p>

        {/* Narration Controls */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={progress >= 100}
            className={`px-6 py-2 rounded text-white font-semibold italic transition 
              ${isPlaying ? "bg-[#999]" : "bg-[#001f40] hover:bg-[#00356e]"}`}
          >
            {isPlaying ? "Pause Narration" : progress >= 100 ? "Completed" : "Play Narration"}
          </button>

          <div className="w-full bg-gray-200 rounded-full h-3 mt-2 overflow-hidden max-w-md">
            <div
              className="h-full bg-[#ca5608] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-600">{Math.floor(progress)}%</p>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={goToNext}
            disabled={!canAdvance}
            className={`px-8 py-2 rounded text-white font-bold italic text-lg transition 
              ${canAdvance ? "bg-[#ca5608] hover:bg-[#b04a06]" : "bg-gray-400 cursor-not-allowed"}`}
          >
            Next Section
          </button>
        </div>
      </div>

      {/* ───────────── TIMELINE FOOTER ───────────── */}
      <footer className="w-full border-t shadow-inner p-4 relative bg-white">
        {/* Hover card */}
        {hoverLesson && (
          <div
            className="absolute z-20 bg-[#ca5608] text-white rounded-lg p-3 w-[260px] pointer-events-none transition-transform"
            style={{
              left: `${mouseX - 130}px`,
              bottom: "90px",
            }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
              style={{ borderTopColor: BRAND_ORANGE }}
            />
            <h2 className="text-sm font-bold leading-tight">{hoverLesson.title}</h2>
            <p className="text-xs mt-1 opacity-90">
              Duration: {hoverLesson.duration} sec
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="relative w-full h-6 flex">
          {COURSE.map((l, i) => {
            const done = i <= completedIndex;
            const active = i === currentLesson.id;
            return (
              <div
                key={l.id}
                style={{ width: `${widthPercent(l)}%` }}
                className="relative h-full flex"
                onMouseEnter={(e) => {
                  setHoverLesson(l);
                  setMouseX(e.clientX);
                }}
                onMouseMove={(e) => setMouseX(e.clientX)}
                onMouseLeave={() => setHoverLesson(null)}
                onClick={() => {
                  if (i <= completedIndex) setCurrentLesson(l);
                }}
              >
                <div
                  className={`flex-1 h-2 self-center transition-colors ${
                    done ? "bg-[#001f40]" : "bg-[#ca5608]"
                  } ${active ? "ring-2 ring-[#001f40]" : ""}`}
                />
                {i < COURSE.length - 1 && (
                  <div className="w-[3px] h-full bg-white" />
                )}
              </div>
            );
          })}
        </div>
      </footer>
    </main>
  );
}

