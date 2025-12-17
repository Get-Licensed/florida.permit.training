"use client";

type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

const TERMINAL_SEGMENTS = [
  { id: "exam", label: "Final Exam", href: "/exam" },
  { id: "payment", label: "Pay & Submit to FLHSMV.gov", href: "/payment" },
];

export type CourseTimelineProps = {
  modules: ModuleRow[];
  currentModuleIndex: number;
  maxCompletedIndex: number;
  goToModule?: (index: number) => void;

  currentLessonIndex?: number;
  slideIndex?: number;
  totalSlides?: number;

  totalModuleSeconds?: number;
  elapsedSeconds?: number;

  examPassed: boolean;
  paymentPaid: boolean;
};

function safeTime(v: any) {
  const n = Number(v);
  return isFinite(n) ? n.toFixed(1) : "0.0";
}

export default function CourseTimeline({
  modules = [],
  currentModuleIndex = 0,
  maxCompletedIndex = 0,
  goToModule,

  currentLessonIndex = 0,
  totalModuleSeconds = 0,
  elapsedSeconds = 0,

  examPassed = false,
  paymentPaid = false,
}: CourseTimelineProps) {
  const totalSegments = modules.length + TERMINAL_SEGMENTS.length;
  const segmentWidth = totalSegments > 0 ? 100 / totalSegments : 100;

  function statusText() {
    return `Module ${currentModuleIndex + 1} → Lesson ${
      currentLessonIndex + 1
    } | ${safeTime(elapsedSeconds)}s / ${safeTime(totalModuleSeconds)}s`;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-40 border-t shadow-inner min-h-[6rem]">
      <div className="w-full px-4 md:px-0">
        <div className="md:max-w-6xl md:mx-auto p-4">
          <div className="relative w-full h-6 flex items-center">

            {/* MODULE SEGMENTS */}
            {modules.map((m, i) => {
              const isCompleted = i <= maxCompletedIndex;
              const isActive = i === currentModuleIndex;
              const isUnlocked = i <= maxCompletedIndex + 1 || examPassed;

              let bg = isCompleted ? "#ca5608" : "#001f40";
              if (isActive) bg = "#ca5608";

              return (
                <div
                  key={m.id}
                  style={{ width: `${segmentWidth}%` }}
                  className={`relative h-full flex items-center justify-center ${
                    isUnlocked ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (isUnlocked && goToModule) goToModule(i);
                  }}
                >
                  <div
                    className="flex-1 h-2"
                    style={{
                      backgroundColor: bg,
                      opacity: isUnlocked ? 1 : 0.4,
                      boxShadow: isActive ? `0 0 6px ${bg}` : "none",
                      borderTopLeftRadius: i === 0 ? 999 : 0,
                      borderBottomLeftRadius: i === 0 ? 999 : 0,
                    }}
                  />
                  <div className="w-[3px] h-full bg-white" />
                </div>
              );
            })}

            {/* TERMINAL SEGMENTS */}
            {TERMINAL_SEGMENTS.map((seg, i) => {
              const isLast = i === TERMINAL_SEGMENTS.length - 1;

              let bg = "#001f40";
              if (seg.id === "exam") bg = examPassed ? "#ca5608" : "#001f40";
              if (seg.id === "payment")
                bg = paymentPaid ? "#ca5608" : "#001f40";

              return (
                <div
                  key={seg.id}
                  style={{ width: `${segmentWidth}%` }}
                  className="relative h-full flex flex-col items-center justify-start cursor-pointer"
                  onClick={() => (window.location.href = seg.href)}
                >
                  <div className="w-full flex items-center justify-center translate-x-[1px] translate-y-[8px] h-2">
                    <div
                      className="flex-1 h-2"
                      style={{
                        backgroundColor: bg,
                        borderTopRightRadius: isLast ? 999 : 0,
                        borderBottomRightRadius: isLast ? 999 : 0,
                      }}
                    />
                    {!isLast && <div className="w-[3px] h-full bg-white" />}
                  </div>

                  <div className="mt-3 text-[9px] font-medium text-[#001f40] text-center opacity-80 px-1">
                    {seg.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
