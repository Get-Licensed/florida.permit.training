"use client";
export const dynamic = "force-dynamic";


import { useState } from "react";

// Mock module data for Lesson 1
const LESSON_1 = {
  id: 1,
  title: "Introduction",
  totalModules: 10,
  modules: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Module ${i + 1}`,
    content: `
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
      Module ${i + 1} covers important principles about Florida permit rules and safe driving practices.
      This text block represents roughly 75 words of reading content, simulating 30 seconds of time for the average student.
      Continue through each module to reach the end of this introductory lesson.`
  }))
};

const BRAND_BLUE = "#001f40";
const BRAND_ORANGE = "#ca5608";

export default function LessonIntroPage() {
  const [currentModule, setCurrentModule] = useState(0);

  const progress = ((currentModule + 1) / LESSON_1.totalModules) * 100;

  const handleNext = () => {
    if (currentModule < LESSON_1.totalModules - 1)
      setCurrentModule((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentModule > 0) setCurrentModule((prev) => prev - 1);
  };

  const module = LESSON_1.modules[currentModule];

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ──────────────── PROGRESS BAR ──────────────── */}
      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-2 transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: BRAND_ORANGE,
          }}
        />
      </div>

      {/* ──────────────── CONTENT ──────────────── */}
      <section className="flex-1 flex flex-col px-8 py-8">
        <h1 className="text-2xl font-bold text-[#001f40] mb-4">
          {LESSON_1.title}: {module.title}
        </h1>

        <p className="text-[#001f40] leading-relaxed text-lg flex-1">
          {module.content}
        </p>

        {/* ──────────────── NAVIGATION ──────────────── */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrev}
            disabled={currentModule === 0}
            className={`px-5 py-2 rounded font-semibold text-white ${
              currentModule === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#001f40] hover:bg-[#00356e]"
            }`}
          >
            Previous
          </button>

          <p className="text-sm text-[#666]">
            {currentModule + 1} / {LESSON_1.totalModules}
          </p>

          <button
            onClick={handleNext}
            disabled={currentModule === LESSON_1.totalModules - 1}
            className={`px-5 py-2 rounded font-semibold text-white ${
              currentModule === LESSON_1.totalModules - 1
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#ca5608] hover:bg-[#b24b06]"
            }`}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
