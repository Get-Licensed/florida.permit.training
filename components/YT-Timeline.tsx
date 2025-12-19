"use client"

import { useRef, useState } from "react"

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
  currentSeconds: number
  totalSeconds: number
  elapsedCourseSeconds: number
  totalCourseSeconds: number
  onScrub?: (seconds: number) => void
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
  currentSeconds,
  totalSeconds,
  elapsedCourseSeconds,
  totalCourseSeconds,
  onScrub,
}: CourseTimelineProps) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hoverSeconds, setHoverSeconds] = useState<number | null>(null)
  const totalSegments = modules.length + TERMINAL_SEGMENTS.length
  const segmentWidth = totalSegments > 0 ? 100 / totalSegments : 100
  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  const onPaymentPage = pathname.startsWith("/payment")
  const onExamPage = pathname.startsWith("/exam")

  console.log("timeline seconds", { currentSeconds, totalSeconds })

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

     {/* MODULE SCRUBBER */}
<div
  ref={barRef}
  className="
    flex-1 relative
    h-3 rounded-full bg-white/90 shadow-sm px-1
  "
  onClick={(e) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.min(Math.max(x / rect.width, 0), 1)
    const sec = pct * totalSeconds
    if (onScrub) onScrub(sec)
  }}

  onMouseMove={(e) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.min(Math.max(x / rect.width, 0), 1)
    const sec = pct * totalSeconds
    setHoverSeconds(sec)
  }}

  onMouseLeave={() => setHoverSeconds(null)}
>

  {/* SCRUB LAYER */}
  <div className="absolute inset-0 pointer-events-none z-[9999]">

    {/* main scrub handle */}
    {totalSeconds > 0 && (
      <div
        className="
          absolute top-1.5
          w-4.5 h-4.5 rounded-full
          shadow-md
          border-2 border-white
          bg-[#001f40]
          shadow-[0_0_8px_rgba(0,0,0,0.6)]
          z-[10000]
        "
        style={{
        left: `${
          Math.min(elapsedCourseSeconds / totalCourseSeconds, 1) * 100
        }%`,
        transform: `translate(-50%, -50%)`,
        }}
      />
    )}

    {/* ghost preview */}
    {hoverSeconds !== null && totalSeconds > 0 && (
      <div
        className="
          absolute top-1.5
          w-4.5 h-4.5 rounded-full
          shadow-sm
          bg-[#fff]/40
        "
        style={{
          left: `${(hoverSeconds / totalSeconds) * 100}%`,
          transform: `translate(-50%, -50%)`,
        }}
      />
    )}
  </div>

{/* MODULE BAR LAYER (modules + terminals together) */}
<div className="relative z-[1] flex items-center h-full -translate-y-[.5px]">


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
                  className="relative h-full 
                  flex flex-col items-center justify-start 
                  cursor-pointer"
                  onClick={() => (window.location.href = seg.href)}
                >
                  <div className="w-full flex items-center justify-center h-2 translate-y-[2.5px]">
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
    </div>
  )
}
