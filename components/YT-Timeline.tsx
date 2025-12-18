"use client"

type ModuleRow = {
  id: string
  title: string
  sort_order: number
}

const TERMINAL_SEGMENTS = [
  { id: "exam", label: "Final Exam", href: "/exam" },
  { id: "payment", label: "Pay & Submit to JALJLJ.gov", href: "/payment" },
]

export type CourseTimelineProps = {
  modules: ModuleRow[]
  currentModuleIndex: number
  maxCompletedIndex: number
  goToModule?: (index: number) => void
  togglePlay: () => void
  isPaused: boolean
  examPassed: boolean
  paymentPaid: boolean
}

export default function CourseTimeline({
  modules = [],
  togglePlay,
  isPaused,
  currentModuleIndex = 0,
  maxCompletedIndex = 0,
  goToModule,
  examPassed = false,
  paymentPaid = false,
}: CourseTimelineProps) {
  const totalSegments = modules.length + TERMINAL_SEGMENTS.length
  const segmentWidth = totalSegments > 0 ? 100 / totalSegments : 100
  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  const onPaymentPage = pathname.startsWith("/payment")
  const onExamPage = pathname.startsWith("/exam")

return (
  <div className="fixed bottom-[145px] left-0 right-0 z-40 min-h-[6rem]">
    <div className="w-full px-4 md:px-0">
      <div className="md:max-w-6xl md:mx-auto p-4">

        {/* FLEX ROW: button + timeline */}
        <div className="flex items-center gap-3">

          {/* PLAY / PAUSE BUTTON */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fff]/10 transition"
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            )}
          </button>

          {/* WHITE BACKGROUND CONTAINER FOR MODULES */}
          <div className="flex-1 h-4 rounded-full bg-white/90 shadow-sm px-1 flex items-center">

  
            {modules.map((m, i) => {
              const isCompleted = i <= maxCompletedIndex
              const isActive = i === currentModuleIndex
              const isUnlocked = i <= maxCompletedIndex

              let bg = "#001f40"
              let glow = "none"

              if (isCompleted) bg = "#ca5608"
              if (isActive) {
                bg = "#ca5608"
                glow = `0 0 6px #ca5608`
              }

              return (
                <div
                  key={m.id}
                  style={{ width: `${segmentWidth}%` }}
                  className={`relative h-full flex items-center justify-center ${
                    isUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-45"
                  }`}
                  onClick={() => {
                    if (isUnlocked && goToModule) goToModule(i)
                  }}
                >
                  <div
                    className="flex-1 h-2"
                    style={{
                      backgroundColor: bg,
                      boxShadow: glow,
                      borderTopLeftRadius: i === 0 ? 999 : 0,
                      borderBottomLeftRadius: i === 0 ? 999 : 0,
                    }}
                  />
                  <div className="w-[2px] h-full" />
                </div>
              )
            })}

            {TERMINAL_SEGMENTS.map((seg, i) => {
              const isLast = i === TERMINAL_SEGMENTS.length - 1

              let bg = "#001f40"
              let glow = "none"

              if (seg.id === "exam") {
                bg = examPassed ? "#ca5608" : "#001f40"
                if (onExamPage) glow = examPassed ? "0 0 6px #ca5608" : "0 0 6px #001f40"
              }

              if (seg.id === "payment") {
                bg = paymentPaid ? "#ca5608" : "#001f40"
                if (onPaymentPage) glow = paymentPaid ? "0 0 6px #ca5608" : "0 0 6px #001f40"
              }

              return (
                <div
                  key={seg.id}
                  style={{ width: `${segmentWidth}%` }}
                  className="relative h-full flex flex-col items-center justify-start cursor-pointer"
                  onClick={() => (window.location.href = seg.href)}
                >
                  <div className="w-full flex items-center justify-center translate-x-[1px] translate-y-[4px] h-2">
                    <div
                      className="flex-1 h-2"
                      style={{
                        backgroundColor: bg,
                        boxShadow: glow,
                        borderTopRightRadius: isLast ? 999 : 0,
                        borderBottomRightRadius: isLast ? 999 : 0,
                      }}
                    />
                    {!isLast && <div className="w-[2px] h-full" />}
                  </div>

                  <div className="mt-3 text-[9px] font-medium text-[#fff] text-center opacity-80 px-1">
                    {seg.label}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
