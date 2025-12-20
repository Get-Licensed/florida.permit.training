"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"


type ModuleRow = {
  id: string
  title: string
  sort_order: number
}

const TERMINAL_SEGMENTS = [
  { id: "exam", label: "Final Exam", href: "/exam" },
  { id: "payment", label: "Pay & Submit to FLHSMV.gov", href: "/payment" }
]

export type CourseTimelineProps = {
  modules: ModuleRow[]
  currentModuleIndex: number
  maxCompletedIndex: number
  goToModule?: (index: number) => void
  allowedSeekSecondsRef: { current: number }
  togglePlay: () => void
  isPaused: boolean
  examPassed: boolean
  paymentPaid: boolean
  currentSeconds: number
  totalSeconds: number
  elapsedCourseSeconds: number
  totalCourseSeconds: number
  moduleDurations: number[]
  onScrub?: (seconds: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  onHoverResolve?: (seconds: number, clientX: number) => void
  onHoverEnd?: () => void
  timelineContainerRef?: RefObject<HTMLDivElement | null>
}

export default function CourseTimeline({
  modules = [],
  togglePlay,
  isPaused,
  currentModuleIndex = 0,
  maxCompletedIndex = 0,
  goToModule,
  allowedSeekSecondsRef,
  examPassed = false,
  paymentPaid = false,
  currentSeconds,
  totalSeconds,
  elapsedCourseSeconds,
  totalCourseSeconds,
  moduleDurations = [],
  onScrub,
  onScrubStart,
  onScrubEnd,
  onHoverResolve,
  onHoverEnd,
  timelineContainerRef,
}: CourseTimelineProps) {
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const [hoverSeconds, setHoverSeconds] = useState<number | null>(null)
  const hoverSecondsRef = useRef<number | null>(null)
  const totalSegments = modules.length + TERMINAL_SEGMENTS.length
  const remainingPct =
    totalSegments > 0 ? (TERMINAL_SEGMENTS.length / totalSegments) * 100 : 0
  const terminalWidth =
    TERMINAL_SEGMENTS.length > 0 ? remainingPct / TERMINAL_SEGMENTS.length : 0
  const modulePortionRatio = 1 - remainingPct / 100
  const totalDur =
    moduleDurations.reduce((sum, dur) => sum + dur, 0) || totalCourseSeconds
  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  const onPaymentPage = pathname.startsWith("/payment")
  const onExamPage = pathname.startsWith("/exam")
  const modulesRef = useRef<HTMLDivElement | null>(null)
  const internalTimelineRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = timelineContainerRef ?? internalTimelineRef
  const handleRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetPxRef = useRef(0)
  const currentPxRef = useRef(0)
  const freezeSeekRef = useRef(false)
  const suppressModuleClickRef = useRef(false)
  const suppressModuleClickTimeoutRef = useRef<number | null>(null)
  // remember play state across scrub
  const wasPlayingBeforeScrubRef = useRef(false)

  const releaseSuppressModuleClick = useCallback(() => {
    if (suppressModuleClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressModuleClickTimeoutRef.current)
    }

    suppressModuleClickTimeoutRef.current = window.setTimeout(() => {
      suppressModuleClickRef.current = false
      suppressModuleClickTimeoutRef.current = null
    }, 0)
  }, [])

  const timelineAutoHideTimerRef = useRef<number | null>(null)

  function revealTimelineFor3s() {
    if (timelineAutoHideTimerRef.current !== null) {
      clearTimeout(timelineAutoHideTimerRef.current)
    }

    // show via callback to parent
    if (onHoverResolve) onHoverResolve(elapsedCourseSeconds, 0)

    timelineAutoHideTimerRef.current = window.setTimeout(() => {
      if (!draggingRef.current) {
        if (onHoverEnd) onHoverEnd()
      }
    }, 3000)
  }

  const handlePlayPauseClick = () => {
    revealTimelineFor3s()
    togglePlay()
  }

  const getScrubSeconds = useCallback(
    (clientX: number, clampToModuleEnd: boolean) => {
      if (!timelineRef.current) return null
      if (!modulesRef.current) return null
      if (modulePortionRatio <= 0) return null
      if (totalDur <= 0) return null

      const rect = timelineRef.current.getBoundingClientRect()
      const moduleWidth = rect.width * modulePortionRatio
      if (moduleWidth <= 0) return null

      let x = clientX - rect.left
      if (x < 0) x = 0
      if (x > moduleWidth) {
        if (!clampToModuleEnd) return null
        x = moduleWidth
      }

      let accPx = 0
      let accSeconds = 0

      for (let i = 0; i < moduleDurations.length; i++) {
        const dur = moduleDurations[i] ?? 0
        const segWidth = moduleWidth * (dur / totalDur)
        if (x <= accPx + segWidth || i === moduleDurations.length - 1) {
          const local = segWidth > 0 ? (x - accPx) / segWidth : 0
          let computedSeconds = accSeconds + local * dur
          computedSeconds = Math.min(
            computedSeconds,
            allowedSeekSecondsRef.current
          )
          return computedSeconds
        }
        accPx += segWidth
        accSeconds += dur
      }

      return Math.min(totalDur, allowedSeekSecondsRef.current)
    },
    [allowedSeekSecondsRef, moduleDurations, modulePortionRatio, totalDur]
  )

  const getScrubPx = useCallback(
    (clientX: number, clampToModuleEnd: boolean) => {
      if (!timelineRef.current) return null
      if (!modulesRef.current) return null
      if (modulePortionRatio <= 0) return null

      const rect = timelineRef.current.getBoundingClientRect()
      const moduleWidth = rect.width * modulePortionRatio
      if (moduleWidth <= 0) return null

      let x = clientX - rect.left
      if (x < 0) x = 0
      if (x > moduleWidth) {
        if (!clampToModuleEnd) return null
        x = moduleWidth
      }

      return x
    },
    [modulePortionRatio]
  )

  const getPxFromSeconds = useCallback(
    (seconds: number) => {
      if (!timelineRef.current) return null
      if (!modulesRef.current) return null
      if (totalDur <= 0) return null

      const rect = timelineRef.current.getBoundingClientRect()
      const moduleWidth = rect.width * modulePortionRatio
      const clamped = Math.min(Math.max(seconds, 0), totalDur)
      let accPx = 0
      let accSeconds = 0

      for (let i = 0; i < moduleDurations.length; i++) {
        const dur = moduleDurations[i] ?? 0
        const segWidth = moduleWidth * (dur / totalDur)
        if (clamped <= accSeconds + dur || i === moduleDurations.length - 1) {
          const local = dur > 0 ? (clamped - accSeconds) / dur : 0
          return accPx + local * segWidth
        }
        accPx += segWidth
        accSeconds += dur
      }

      return moduleWidth
    },
    [moduleDurations, modulePortionRatio, totalDur]
  )

  const syncHandleTransform = useCallback((px: number) => {
    currentPxRef.current = px
    targetPxRef.current = px
    if (handleRef.current) {
      handleRef.current.style.transform = `translate(${px}px, -50%) translateX(-50%)`
    }
  }, [])

  const animate = useCallback(() => {
    if (!timelineRef.current || !handleRef.current) {
      rafRef.current = null
      return
    }

    const dx = targetPxRef.current - currentPxRef.current
    currentPxRef.current += dx * 0.15

    if (Math.abs(dx) > 0.05) {
      handleRef.current.style.transform = `translate(${currentPxRef.current}px, -50%) translateX(-50%)`
      rafRef.current = requestAnimationFrame(animate)
    } else {
      currentPxRef.current = targetPxRef.current
      handleRef.current.style.transform = `translate(${currentPxRef.current}px, -50%) translateX(-50%)`
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    if (draggingRef.current) return
    if (freezeSeekRef.current) return
    if (totalDur <= 0) return
    const px = getPxFromSeconds(elapsedCourseSeconds)
    if (px === null) return
    syncHandleTransform(px)
  }, [elapsedCourseSeconds, getPxFromSeconds, syncHandleTransform, totalDur])

  useEffect(() => {
    const handleResize = () => {
      if (draggingRef.current) return
      if (freezeSeekRef.current) return
      if (totalDur <= 0) return
      const px = getPxFromSeconds(elapsedCourseSeconds)
      if (px === null) return
      syncHandleTransform(px)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [elapsedCourseSeconds, getPxFromSeconds, syncHandleTransform, totalDur])

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const sec = getScrubSeconds(e.clientX, true)
      const px = getScrubPx(e.clientX, true)
      if (sec === null) return
      if (px === null) return
      hoverSecondsRef.current = sec
      syncHandleTransform(px)
      if (onScrub) onScrub(sec)
      if (onHoverResolve) onHoverResolve(sec, e.clientX)
      if (!rafRef.current && !draggingRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    function handleUp() {
  if (!draggingRef.current) return

  draggingRef.current = false
  document.body.style.userSelect = ""

  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  freezeSeekRef.current = false

  const px = getPxFromSeconds(elapsedCourseSeconds)
  if (px !== null) syncHandleTransform(px)

  if (onScrubEnd) onScrubEnd()
  releaseSuppressModuleClick()

  setDragging(false)
  setHoverSeconds(null)
  hoverSecondsRef.current = null
  if (onHoverEnd) onHoverEnd()
}

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
  }, [
    animate,
    getScrubPx,
    getScrubSeconds,
    onHoverResolve,
    onScrub,
    onScrubEnd,
    releaseSuppressModuleClick,
    syncHandleTransform,
  ])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (suppressModuleClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressModuleClickTimeoutRef.current)
      }
    }
  }, [])

return (
  <div className="fixed bottom-[145px] left-0 right-0 z-40 min-h-[6rem]">
    <div className="w-full px-4 md:px-0">
      <div className="md:max-w-6xl md:mx-auto p-4">

        {/* FLEX ROW: button + timeline */}
        <div className="flex items-center gap-3">

        {/* PLAY / PAUSE BUTTON */} 
        <button
          onClick={handlePlayPauseClick}
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
      ref={timelineRef}
      className="
        flex-1 relative
        h-3 rounded-full bg-white/90 shadow-sm px-1
        select-none cursor-pointer  
      "
    onMouseDown={(e) => {
      if (e.button !== 0) return
      const sec = getScrubSeconds(e.clientX, false)
      const px = getScrubPx(e.clientX, false)
      if (sec === null) return
      if (px === null) return
      e.preventDefault()
      document.body.style.userSelect = "none"
      suppressModuleClickRef.current = true
      if (suppressModuleClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressModuleClickTimeoutRef.current)
        suppressModuleClickTimeoutRef.current = null
      }
      draggingRef.current = true
      freezeSeekRef.current = true
      wasPlayingBeforeScrubRef.current = !isPaused
      if (timelineAutoHideTimerRef.current !== null) {
        clearTimeout(timelineAutoHideTimerRef.current)
      }
      setDragging(true)
      setHoverSeconds(null)
      hoverSecondsRef.current = sec
      syncHandleTransform(px)
      if (onScrubStart) onScrubStart()
      if (onScrub) onScrub(sec)
      if (onHoverResolve) onHoverResolve(sec, e.clientX)
      if (!rafRef.current && !draggingRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }}

    onMouseMove={(e) => {
      if (dragging) return
      const sec = getScrubSeconds(e.clientX, false)
      if (sec === null) {
        setHoverSeconds(null)
        if (onHoverEnd) onHoverEnd()
        return
      }
      setHoverSeconds(sec)
      if (onHoverResolve) onHoverResolve(sec, e.clientX)
       }}
      onMouseLeave={() => {
        if (!dragging) setHoverSeconds(null)
        if (!dragging && onHoverEnd) onHoverEnd()
      }}
    >

  {/* SCRUB LAYER */}
  <div className="absolute inset-0 pointer-events-none z-[9999]">

    {/* main scrub handle */}
    {totalSeconds > 0 && (
      <div
        ref={handleRef}
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
        left: 0,
        transform: "translate(0px, -50%) translateX(-50%)",
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
          left: `${getPxFromSeconds(hoverSeconds) ?? 0}px`,
          transform: `translate(-50%, -50%)`,
        }}
      />
    )}
  </div>
{/* ===== TRACK + MODULE + TERMINAL CELLS (scrubbable modules only) ===== */}
<div
  ref={modulesRef}
  className="relative z-[1] flex items-center h-full flex-1 -translate-y-[.5px]"
  style={{ minWidth: 0 }}
>
  {modules.map((m, i) => {
    const isCompleted = i <= maxCompletedIndex
    const isActive = i === currentModuleIndex
    const isUnlocked = i <= maxCompletedIndex
    const widthPct =
      totalDur > 0 ? ((moduleDurations[i] ?? 0) / totalDur) * 100 : 0
    const moduleWidthPct = widthPct * modulePortionRatio

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
        style={{ width: `${moduleWidthPct}%` }}
        className={`relative h-full flex items-center justify-center ${
          isUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-45"
        }`}
        onClick={() => {
          if (suppressModuleClickRef.current) return
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
      className="relative h-full flex flex-col items-center justify-start cursor-pointer"
      style={{ width: `${terminalWidth}%` }}
      onClick={() => (window.location.href = seg.href)}
    >
      <div className="w-full flex items-center justify-center h-2 translate-y-[2.2px]">
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
