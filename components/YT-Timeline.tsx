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
  playedSecondsRef?: { current: number }
  thumbCacheRef?: RefObject<Map<string, string>>
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
  onTimelineHover?: () => void
  onTimelineLeave?: () => void
  onTerminalHover?: () => void
  onPromoClose?: () => void
  timelineContainerRef?: RefObject<HTMLDivElement | null>
  promoOffsetBottom?: number
  promoVisible?: boolean
  promoDismissedRef?: { current: boolean }
  showTimeline?: boolean
  setShowTimeline?: (visible: boolean) => void
}

export default function CourseTimeline({
  modules = [],
  togglePlay,
  isPaused,
  currentModuleIndex = 0,
  maxCompletedIndex = 0,
  goToModule,
  allowedSeekSecondsRef,
  playedSecondsRef,
  thumbCacheRef,
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
  onTimelineHover,
  onTimelineLeave,
  onTerminalHover,
  onPromoClose,
  timelineContainerRef,
  promoOffsetBottom,
  promoVisible = false,
  promoDismissedRef,
  showTimeline,
  setShowTimeline = () => {},
}: CourseTimelineProps) {

  type ScrubberReleaseFix = "none" | "A" | "B" | "C"
  // Switch between options: "A" (hide timeline), "B" (freeze sync), "C" (both).
  const SCRUBBER_RELEASE_FIX: ScrubberReleaseFix = "C" as ScrubberReleaseFix
  const enableTimelineHide =
    SCRUBBER_RELEASE_FIX === "A" || SCRUBBER_RELEASE_FIX === "C"
  const enableFreezeElapsedSync =
    SCRUBBER_RELEASE_FIX === "B" || SCRUBBER_RELEASE_FIX === "C"
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const hoverSecondsRef = useRef<number | null>(null)
  const hoverPreviewRafRef = useRef<number | null>(null)
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
  const ghostHandleRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetPxRef = useRef(0)
  const currentPxRef = useRef(0)
  const freezeSeekRef = useRef(false)
  const freezeElapsedSyncRef = useRef(false)
  const ignoreElapsedTimeRef = useRef(false)
  const suppressModuleClickRef = useRef(false)
  const suppressModuleClickTimeoutRef = useRef<number | null>(null)
  const railRectRef = useRef<DOMRect | null>(null)
  // Promo box
  const [promoX, setPromoX] = useState<number | null>(null)
  const freezeElapsedTimeoutRef = useRef<number | null>(null)
  const isHoveringRef = useRef(false)

  // remember play state across scrub
  const wasPlayingBeforeScrubRef = useRef(false)
  const playedTrackRef = useRef<HTMLDivElement | null>(null)
  const furthestTrackRef = useRef<HTMLDivElement | null>(null)
  const maxCompletedSecondsRef = useRef(0)
  const playedSecondsRefResolved = playedSecondsRef ?? allowedSeekSecondsRef

  useEffect(() => {
    if (!promoVisible) return
    if (promoX !== null) return
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    setPromoX(rect.left + rect.width - 40)
  }, [promoVisible, promoX, timelineRef])

  useEffect(() => {
    if (!thumbCacheRef?.current) return
  }, [thumbCacheRef])

  const releaseSuppressModuleClick = useCallback(() => {
    if (suppressModuleClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressModuleClickTimeoutRef.current)
    }

    suppressModuleClickTimeoutRef.current = window.setTimeout(() => {
      suppressModuleClickRef.current = false
      suppressModuleClickTimeoutRef.current = null
    }, 0)
  }, [])

  function revealTimelineFor3s() {
    setShowTimeline(true);
    onTimelineHover?.()

    if (onHoverResolve) {
      onHoverResolve(elapsedCourseSeconds, 0);
    }
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

      const rect =
        railRectRef.current ?? timelineRef.current.getBoundingClientRect()
      const moduleWidth = rect.width * modulePortionRatio
      if (moduleWidth <= 0) return null

      let x = clientX - rect.left
      if (x < 0) x = 0
      if (x > moduleWidth) {
        // allow hover beyond locked seek boundary
        if (!clampToModuleEnd) {
          x = moduleWidth
        }
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
          // 1: hover mode => allow full duration for preview
          // 2: seek commit mode => clamp to allowed boundary
          const clampedHover = Math.min(computedSeconds, totalDur)

          return clampToModuleEnd
            ? Math.min(computedSeconds, allowedSeekSecondsRef.current)
            : clampedHover
        }
        accPx += segWidth
        accSeconds += dur
      }

      return clampToModuleEnd
        ? Math.min(totalDur, allowedSeekSecondsRef.current)
        : totalDur
    },
    [allowedSeekSecondsRef, moduleDurations, modulePortionRatio, totalDur]
  )

  const getHoverSeconds = useCallback(
    (clientX: number) => {
      if (!timelineRef.current) return null
      if (!modulesRef.current) return null
      if (modulePortionRatio <= 0) return null
      if (totalDur <= 0) return null

      const rect = timelineRef.current.getBoundingClientRect()
      const moduleWidth = rect.width * modulePortionRatio
      if (moduleWidth <= 0) return null

      let x = clientX - rect.left
      if (x < 0) x = 0
      if (x > moduleWidth) return null

      let accPx = 0
      let accSeconds = 0

      for (let i = 0; i < moduleDurations.length; i++) {
        const dur = moduleDurations[i] ?? 0
        const segWidth = moduleWidth * (dur / totalDur)
        if (x <= accPx + segWidth || i === moduleDurations.length - 1) {
          const local = segWidth > 0 ? (x - accPx) / segWidth : 0
          const computedSeconds = accSeconds + local * dur
          return Math.min(computedSeconds, totalDur)
        }
        accPx += segWidth
        accSeconds += dur
      }

      return totalDur
    },
    [moduleDurations, modulePortionRatio, totalDur]
  )

  const getScrubPx = useCallback(
    (clientX: number, clampToModuleEnd: boolean) => {
      if (!timelineRef.current) return null
      if (!modulesRef.current) return null
      if (modulePortionRatio <= 0) return null

      const rect =
        railRectRef.current ?? timelineRef.current.getBoundingClientRect()
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

  const scheduleHoverPreviewUpdate = useCallback(() => {
    if (hoverPreviewRafRef.current !== null) return
    hoverPreviewRafRef.current = requestAnimationFrame(() => {
      hoverPreviewRafRef.current = null
      const ghost = ghostHandleRef.current
      if (!ghost) return
      const sec = hoverSecondsRef.current
      if (sec === null || totalSeconds <= 0) {
        ghost.style.opacity = "0"
        return
      }
      const px = getPxFromSeconds(sec)
      if (px === null) {
        ghost.style.opacity = "0"
        return
      }
      ghost.style.opacity = "1"
      ghost.style.left = `${px}px`
    })
  }, [getPxFromSeconds, totalSeconds])

  const updatePlayedTrack = useCallback(() => {
    if (enableFreezeElapsedSync && freezeElapsedSyncRef.current) return
    if (!playedTrackRef.current) return
    const rect = timelineRef.current?.getBoundingClientRect()
    const timelineWidth = rect ? rect.width * modulePortionRatio : 0
    const scrubberPositionPx = Math.max(
      0,
      Math.min(currentPxRef.current, timelineWidth)
    )
    const playedWidth =
      timelineWidth > 0 && totalCourseSeconds > 0
        ? Math.min(
            (playedSecondsRefResolved.current / totalCourseSeconds) *
              timelineWidth,
            scrubberPositionPx
          )
        : 0
    const clampedPlayed = Math.max(0, Math.min(timelineWidth, playedWidth))
    playedTrackRef.current.style.background = `linear-gradient(to right, #ca5608 ${clampedPlayed}px, #d1d5db ${clampedPlayed}px)`
  }, [
    allowedSeekSecondsRef,
    modulePortionRatio,
    playedSecondsRefResolved,
    timelineRef,
    totalCourseSeconds,
  ])

  const updateFurthestTrack = useCallback(() => {
    if (!furthestTrackRef.current) return
    const rect = timelineRef.current?.getBoundingClientRect()
    const timelineWidth = rect ? rect.width * modulePortionRatio : 0
    if (timelineWidth <= 0) return

    const furthestPx = Math.min(
      (maxCompletedSecondsRef.current / totalCourseSeconds) * timelineWidth,
      timelineWidth
    )

    furthestTrackRef.current.style.background = `linear-gradient(to right, #f6b27a ${furthestPx}px, #d1d5db ${furthestPx}px)`
  }, [modulePortionRatio, timelineRef, totalCourseSeconds])

  const syncHandleTransform = useCallback((px: number) => {
    if (enableFreezeElapsedSync && freezeElapsedSyncRef.current) return
    currentPxRef.current = px
    targetPxRef.current = px
    if (handleRef.current) {
      handleRef.current.style.transform = `translate(${px}px, -50%) translateX(-50%)`
    }
    updatePlayedTrack()
  }, [updatePlayedTrack])

  const animate = useCallback(() => {
    if (enableFreezeElapsedSync && freezeElapsedSyncRef.current) {
      rafRef.current = null
      return
    }
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
    if (totalCourseSeconds <= 0) return

    if (elapsedCourseSeconds > maxCompletedSecondsRef.current) {
      maxCompletedSecondsRef.current = elapsedCourseSeconds
    }
  }, [elapsedCourseSeconds, totalCourseSeconds])

  useEffect(() => {
    if (ignoreElapsedTimeRef.current) return
    if (draggingRef.current) return
    if (freezeSeekRef.current) return
    if (enableFreezeElapsedSync && freezeElapsedSyncRef.current) return
    if (totalDur <= 0) return
    const px = getPxFromSeconds(elapsedCourseSeconds)
    if (px === null) return
    syncHandleTransform(px)
  }, [elapsedCourseSeconds, getPxFromSeconds, syncHandleTransform, totalDur])

  useEffect(() => {
    const handleResize = () => {
      if (draggingRef.current) return
      if (freezeSeekRef.current) return
      if (enableFreezeElapsedSync && freezeElapsedSyncRef.current) return
      if (totalDur <= 0) return
      const px = getPxFromSeconds(elapsedCourseSeconds)
      if (px === null) return
      syncHandleTransform(px)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [elapsedCourseSeconds, getPxFromSeconds, syncHandleTransform, totalDur])

  useEffect(() => {
    let frame: number | null = null

    const tick = () => {
      updateFurthestTrack()
      updatePlayedTrack()
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [updateFurthestTrack, updatePlayedTrack])

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const sec = getScrubSeconds(e.clientX, true)
      const px = getScrubPx(e.clientX, true)
      if (sec === null) return
      if (px === null) return
      hoverSecondsRef.current = sec
      targetPxRef.current = px
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      }
      scheduleHoverPreviewUpdate()
      if (onScrub) onScrub(sec)
      if (onHoverResolve) onHoverResolve(sec, e.clientX)
    }

    function handleUp() {
      if (!draggingRef.current) return

      draggingRef.current = false
      document.body.style.userSelect = ""

      if (enableFreezeElapsedSync) {
        freezeElapsedSyncRef.current = true
        if (freezeElapsedTimeoutRef.current !== null) {
          window.clearTimeout(freezeElapsedTimeoutRef.current)
        }
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      ignoreElapsedTimeRef.current = false
      freezeSeekRef.current = false

      if (!(enableFreezeElapsedSync && freezeElapsedSyncRef.current)) {
        const px = getPxFromSeconds(elapsedCourseSeconds)
        if (px !== null) {
          targetPxRef.current = px
          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(animate)
          }
        }
      }

      if (onScrubEnd) onScrubEnd()
      releaseSuppressModuleClick()

      if (enableFreezeElapsedSync) {
        const freezeDelayMs =
          SCRUBBER_RELEASE_FIX === "C" ? 200 : 200
        freezeElapsedTimeoutRef.current = window.setTimeout(() => {
          freezeElapsedSyncRef.current = false
        }, freezeDelayMs)
      }

      setDragging(false)
      hoverSecondsRef.current = null
      railRectRef.current = null
      scheduleHoverPreviewUpdate()
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
    scheduleHoverPreviewUpdate,
    syncHandleTransform,
  ])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (hoverPreviewRafRef.current) {
        cancelAnimationFrame(hoverPreviewRafRef.current)
      }
      if (suppressModuleClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressModuleClickTimeoutRef.current)
      }
      if (freezeElapsedTimeoutRef.current !== null) {
        window.clearTimeout(freezeElapsedTimeoutRef.current)
      }
    }
  }, [])

  

return (
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
  className={`
    flex-1 relative
    h-3 rounded-full bg-white/90 shadow-sm px-1
    select-none cursor-pointer
  `}

  onMouseEnter={(e) => {
    isHoveringRef.current = true
    setShowTimeline(true)
    onTimelineHover?.()

    if (promoX === null && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const mid = rect.left + rect.width - 40
      setPromoX(mid)
    }
  }}

  onMouseDown={(e) => {
    if (e.button !== 0) return;
    setShowTimeline(true);

    const sec = getScrubSeconds(e.clientX, false);
    const px = getScrubPx(e.clientX, false);
    if (sec === null) return;
    if (px === null) return;

    e.preventDefault();
    document.body.style.userSelect = "none";
    suppressModuleClickRef.current = true;
    if (suppressModuleClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressModuleClickTimeoutRef.current);
      suppressModuleClickTimeoutRef.current = null;
    }

    draggingRef.current = true;
    freezeSeekRef.current = true;
    ignoreElapsedTimeRef.current = true;

    railRectRef.current =
      timelineRef.current?.getBoundingClientRect() ?? null;
    wasPlayingBeforeScrubRef.current = !isPaused;

    setDragging(true);
    hoverSecondsRef.current = sec;
    targetPxRef.current = px;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }

    scheduleHoverPreviewUpdate();
    if (onScrubStart) onScrubStart();
    if (onScrub) onScrub(sec);
    if (onHoverResolve) onHoverResolve(sec, e.clientX);
  }}

  onMouseMove={(e) => {
    isHoveringRef.current = true;
    setShowTimeline(true);

    if (dragging) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    const pad = 10;

    const within =
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top - pad &&
      e.clientY <= rect.bottom + pad;

    if (!within) {
      hoverSecondsRef.current = null;
      scheduleHoverPreviewUpdate();
      if (onHoverEnd) onHoverEnd();
      return;
    }

    const sec = getHoverSeconds(e.clientX);
    if (sec === null) {
      hoverSecondsRef.current = null;
      scheduleHoverPreviewUpdate();
      if (onHoverEnd) onHoverEnd();
      return;
    }

    hoverSecondsRef.current = sec;
    scheduleHoverPreviewUpdate();
    if (onHoverResolve) onHoverResolve(sec, e.clientX);
  }}

  onMouseLeave={(e) => {
    isHoveringRef.current = false;
    onTimelineLeave?.()

    if (promoDismissedRef?.current) {
      setShowTimeline(false);
    }

    if (dragging) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    const pad = 10;

    const within =
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top - pad &&
      e.clientY <= rect.bottom + pad;

    if (!within) {
      hoverSecondsRef.current = null;
      scheduleHoverPreviewUpdate();
      if (onHoverEnd) onHoverEnd();
    }
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
    <div
      ref={ghostHandleRef}
      className="
        absolute top-1.5
        w-4.5 h-4.5 rounded-full
        shadow-sm
        bg-[#fff]/40
      "
      style={{
        left: 0,
        opacity: 0,
        transform: `translate(-50%, -50%)`,
      }}
    />
  </div>
{/* ===== TRACK + MODULE + TERMINAL CELLS (scrubbable modules only) ===== */}
<div
  ref={modulesRef}
  className="relative z-[1] flex items-center h-full flex-1 -translate-y-[.5px]"
  style={{ minWidth: 0 }}
>
  <div
    className="absolute left-0 top-[2px] bottom-[2px] z-[1] rounded-full pointer-events-none"
    ref={furthestTrackRef}
    style={{
      width: `${modulePortionRatio * 100}%`,
      background: "linear-gradient(to right, #f6b27a 0px, #d1d5db 0px)",
    }}
  />
  <div
    ref={playedTrackRef}
    className="absolute left-0 top-[2px] bottom-[2px] z-[2] rounded-full pointer-events-none"
    style={{
      width: `${modulePortionRatio * 100}%`,
      background: "linear-gradient(to right, #ca5608 0px, #d1d5db 0px)",
    }}
  />
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
        className={`relative z-[1] h-full flex items-center justify-center ${
          isUnlocked ? "cursor-pointer" : "cursor-pointer opacity-45"
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

                  const isFinalActions = seg.id === "payment" || seg.id === "exam"

                  return (
                    <div
                      key={seg.id}
                      className="relative h-full flex flex-col items-center justify-start cursor-pointer"
                      style={{ width: `${terminalWidth}%` }}
                      onClick={() => (window.location.href = seg.href)}

                      /* PROMO HOVER EVENTS (phase-2 wiring) */
                      onMouseEnter={(e) => {
                        if (!isFinalActions) return;

                        // notify parent instead of mutating promo state here
                        onTerminalHover?.();
                        setPromoX(e.clientX);
                      }}

                      onMouseMove={(e) => {
                        if (!isFinalActions) return;
                        setPromoX(e.clientX);
                      }}

                      onMouseLeave={() => {
                        if (!isFinalActions) return;
                      }}
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

{promoVisible && promoX !== null && (
  <div
    className="promo-box fixed z-[999999] pointer-events-none transition-opacity duration-100"
    style={{
      left: promoX - 187.5,
      bottom: promoOffsetBottom ?? 240,
      width: 375,
      height: 250,
    }}
  >
    <div
      className="
        w-full h-full
        rounded-lg bg-black/90 shadow-xl
        backdrop-blur-sm text-white p-4
        pointer-events-auto overflow-hidden
        flex flex-col justify-center items-center gap-6
        relative
      "
    >

      {/* CLOSE BUTTON */}
      <button
        onClick={() => {
        onPromoClose?.()
      }}
        className="
          absolute top-2 right-2
          text-white text-xl font-bold
          bg-black/50 hover:bg-black/70
          rounded-full px-2 pb-[2px]
          pointer-events-auto
        "
      >
        ✕
      </button>

      {/* top group */}
      <div className="flex flex-col items-center justify-center">

        {/* column labels */}
        <div className="flex items-start text-[14px] font-semibold 
        uppercase tracking-wide mb-1">
          <span
            className="text-center w-[120px]"
            style={{ transform: 'translateX(-20px)' }}
          >
            Exam
          </span>

          <span
            className="text-center w-[120px]"
            style={{ transform: 'translateX(20px)' }}
          >
            Payment
          </span>
        </div>

        {/* column details */}
        <div className="flex justify-center items-start gap-4 
        text-[12px] leading-snug relative w-full max-w-[320px]">

          <div className="text-center w-[150px]">
            ✔ 40 questions<br />
            ✔ 80% to pass<br />
            ✔ Unlimited retakes
          </div>

          <div className="text-center w-[150px]">
            ✔ $59.95 one-time fee <br />
            ✔ Verified submission of<br />
            course + exam to FL DMV
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="border-b border-white/30 w-full" />

      {/* DMV section */}
      <div className="flex flex-col items-center justify-center text-center leading-snug">
        <p className="text-[14px] font-semibold uppercase tracking-wide mb-1">
          DMV Photo Appointment
        </p>

        <p className="text-[12px]">What to bring:</p>

        <p className="text-[12px] mt-1 leading-snug">
          ✔ $48 Card/Check  ✔ 2 Proofs of Address  ✔ 2 Proofs of ID
        </p>
      </div>
    </div>
  </div>
)}

    </div>
  )
}
