  // deno-lint-ignore-file
"use client";
export const dynamic = "force-dynamic";
  import { supabase } from "@/utils/supabaseClient";
  import { useEffect, useState, useCallback, useRef, useMemo } from "react";
  import CourseTimeline from "@/components/YT-Timeline";
  import { useSearchParams } from "next/navigation";
  import { useRouter } from "next/navigation";
  import Loader from "@/components/loader";
  /* ------------------------------------------------------
    TYPES
  ------------------------------------------------------ */
  type ModuleRow = {
    id: string;
    title: string;
    sort_order: number;
  };

  type LessonRow = {
    id: number;
    module_id: string;
    title: string;
    sort_order: number;
  };

  type SlideRow = {
    id: string;
    lesson_id: number;
    image_path: string | null;
    order_index: number;
  };

  type CaptionRow = {
    id: string;
    slide_id: string;
    caption: string;
    seconds: number;
    line_index: number;
  };

  type CaptionTimingRow = {
    id: string;
    slide_id: string;
    seconds: number | null;
    line_index: number;
    caption: string | null;
  };

  type CourseSlideRow = {
    id: string;
    lesson_id: number;
    module_id: string;
    order_index: number;
    image_path: string | null;
  };

  type SeekTarget = {
    moduleIndex: number;
    lessonIndex: number;
    slideIndex: number;
    slideId: string;
  };

  /* ------------------------------------------------------
    IMAGE RESOLVER
  ------------------------------------------------------ */
  function resolveImage(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  function sumCaptionSeconds(captions: CaptionTimingRow[]) {
    return captions.reduce((sum, c) => sum + (c.seconds ?? 0), 0);
  }

  /* ------------------------------------------------------
    MAIN PLAYER
  ------------------------------------------------------ */
  export const allowedSeekSecondsRef = { current: 0 };

  export default function CoursePlayerClient() {
    const didApplyProgress = useRef(false);
    const playedSecondsRef = useRef(0);
    const scrubActive = useRef(false);
    const scrubSeekSecondsRef = useRef<number | null>(null);

    // module and lesson tracking
    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);
    const [progressReady, setProgressReady] = useState(false);
    const [contentReady, setContentReady] = useState(false);
    const [progressResolved, setProgressResolved] = useState(false);
    const [lessons, setLessons] = useState<LessonRow[]>([]);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [courseTotals, setCourseTotals] = useState<{
       totalSeconds: number; }>({ totalSeconds: 0 });
   // course assets
    const [slides, setSlides] = useState<SlideRow[]>([]);
    const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});
    const [courseLessons, setCourseLessons] = useState<LessonRow[]>([]);
    const [courseSlides, setCourseSlides] = useState<CourseSlideRow[]>([]);
    const [courseCaptions, setCourseCaptions] = useState<
      Record<string, CaptionTimingRow[]>
    >({});
    const [slideIndex, setSlideIndex] = useState(0);

    const [restoredReady, setRestoredReady] = useState(false)
    const [initialHydrationDone, setInitialHydrationDone] = useState(false);

    // final actions
    const [examPassed, setExamPassed] = useState(false);
    const [paymentPaid, setPaymentPaid] = useState(false);


    const [moduleTotals, setModuleTotals] = useState<Record<string, number>>({});
    const [showTimeline, setShowTimeline] = useState(false);
    const thumbCacheRef = useRef(new Map<string, string>());
    const hoverTooltipRafRef = useRef<number | null>(null);
    const previewXRef = useRef(0);
    const previewDataRef = useRef({
      imgUrl: null as string | null,
      text: "",
      timeLabel: "",
    });
    const tooltipVisibleRef = useRef(false);
    const timelineHoverRef = useRef<HTMLDivElement | null>(null);
    const hoverTooltipRef = useRef<HTMLDivElement | null>(null);
    const hoverTooltipImageRef = useRef<HTMLImageElement | null>(null);
    const hoverTooltipPlaceholderRef = useRef<HTMLDivElement | null>(null);
    const hoverTooltipTextRef = useRef<HTMLDivElement | null>(null);
    const hoverTooltipTimeRef = useRef<HTMLDivElement | null>(null);
    const [timelineVersion, setTimelineVersion] = useState(0);

    const [canProceed, setCanProceed] = useState(false);
    const [isPaused, setIsPaused] = useState(true);

    const timelineAutoHideTimerRef = useRef<number | null>(null)
    // NAV STATE
      const totalSlides = slides.length;

      const isFinalSlideOfModule =
        currentLessonIndex === (lessons?.length ?? 0) - 1 &&
        slideIndex === totalSlides - 1;

      const showContinueInstruction =
        isFinalSlideOfModule &&
        canProceed;

      const isFinalCourseSlide =
        isFinalSlideOfModule &&
        currentModuleIndex === (modules?.length ?? 0) - 1;

      
    function revealTimelineFor3s() {
        setShowTimeline(true)

        if (timelineAutoHideTimerRef.current !== null) {
          clearTimeout(timelineAutoHideTimerRef.current)
        }

        timelineAutoHideTimerRef.current = window.setTimeout(() => {
          if (!scrubActive.current) {
            setShowTimeline(false)
          }
        }, 3000)
      }

    const courseIndex = useMemo(() => {
      if (!modules.length || !courseLessons.length || !courseSlides.length) {
        return null;
      }

      const lessonsByModule = new Map<string, LessonRow[]>();
      const slidesByLesson = new Map<number, CourseSlideRow[]>();

      [...courseLessons]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .forEach((lesson) => {
          const list = lessonsByModule.get(lesson.module_id) ?? [];
          list.push(lesson);
          lessonsByModule.set(lesson.module_id, list);
        });

      [...courseSlides]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .forEach((slide) => {
          const list = slidesByLesson.get(slide.lesson_id) ?? [];
          list.push(slide);
          slidesByLesson.set(slide.lesson_id, list);
        });

      const moduleEntries = modules.map((module) => {
        const moduleLessons = lessonsByModule.get(module.id) ?? [];
        const slides = [] as Array<{
          slideId: string;
          lessonIndex: number;
          slideIndex: number;
          durationSeconds: number;
          captions: CaptionTimingRow[];
        }>;

        let moduleDuration = 0;

        moduleLessons.forEach((lesson, lessonIndex) => {
          const lessonSlides = slidesByLesson.get(lesson.id) ?? [];

          lessonSlides.forEach((slide, slideIndex) => {
            const captionLines = courseCaptions[slide.id] ?? [];
            const durationSeconds = sumCaptionSeconds(captionLines);

            moduleDuration += durationSeconds;
            slides.push({
              slideId: slide.id,
              lessonIndex,
              slideIndex,
              durationSeconds,
              captions: captionLines,
            });
          });
        });

        return {
          moduleId: module.id,
          lessons: moduleLessons,
          slides,
          durationSeconds: moduleDuration,
        };
      });

      const totalSeconds = moduleEntries.reduce(
        (sum, entry) => sum + entry.durationSeconds,
        0
      );

      return {
        modules: moduleEntries,
        totalSeconds,
      };
    }, [modules, courseLessons, courseSlides, courseCaptions]);

    const moduleDurationSeconds = useMemo(
      () => courseIndex?.modules.map((module) => module.durationSeconds) ?? [],
      [courseIndex]
    );
    const totalCourseSeconds =
      courseTotals.totalSeconds || courseIndex?.totalSeconds || 0;

    const courseSlidesById = useMemo(() => {
      const map = new Map<string, CourseSlideRow>();
      courseSlides.forEach((slide) => {
        map.set(slide.id, slide);
      });
      return map;
    }, [courseSlides]);

    const captionPreviewBySlideId = useMemo(() => {
      const map = new Map<string, string | null>();
      Object.entries(courseCaptions).forEach(([slideId, slideCaptions]) => {
        map.set(slideId, slideCaptions[0]?.caption ?? null);
      });
      return map;
    }, [courseCaptions]);

    useEffect(() => {
      let cancelled = false;

      const preloadThumbs = async () => {
        const slidesWithThumbs = courseSlides.filter(
          (slide) => slide.image_path
        );
        const missing = slidesWithThumbs.filter(
          (slide) =>
            slide.image_path && !thumbCacheRef.current.has(slide.id)
        );

        if (!missing.length) return;

        const paths = missing.map((slide) => slide.image_path as string);
        const { data, error } = await supabase.storage
          .from("uploads")
          .createSignedUrls(paths, 60 * 60);

        if (cancelled || error || !data) return;

        data.forEach((entry, index) => {
          const slide = missing[index];
          if (!slide) return;
          if (entry?.signedUrl) {
            thumbCacheRef.current.set(slide.id, entry.signedUrl);
            const img = new Image();
            img.src = entry.signedUrl;
            img.decode?.().catch(() => {});
          }
        });
      };

      preloadThumbs();

      return () => {
        cancelled = true;
      };
    }, [courseSlides]);

    const searchParams = useSearchParams();
    const router = useRouter();

    const resolveCourseTime = useCallback(
      (
        seconds: number,
        maxSeconds = allowedSeekSecondsRef.current
      ): SeekTarget | null => {
        if (!courseIndex || courseIndex.totalSeconds <= 0) {
          return null;
        }

        const clampedSeconds = Math.min(
          Math.max(seconds, 0),
          Math.min(maxSeconds, courseIndex.totalSeconds)
        );

        let remaining = clampedSeconds;

        let moduleIndex = 0;
        for (let i = 0; i < courseIndex.modules.length; i++) {
          const duration = courseIndex.modules[i].durationSeconds;
          if (remaining <= duration || i === courseIndex.modules.length - 1) {
            moduleIndex = i;
            break;
          }
          remaining -= duration;
        }

        const moduleEntry = courseIndex.modules[moduleIndex];
        if (!moduleEntry || !moduleEntry.slides.length) {
          return null;
        }

        let slideOffset = remaining;
        let slideEntry = moduleEntry.slides[0];

        for (let i = 0; i < moduleEntry.slides.length; i++) {
          const candidate = moduleEntry.slides[i];
          if (
            slideOffset <= candidate.durationSeconds ||
            i === moduleEntry.slides.length - 1
          ) {
            slideEntry = candidate;
            break;
          }
          slideOffset -= candidate.durationSeconds;
        }

        return {
          moduleIndex,
          lessonIndex: slideEntry.lessonIndex,
          slideIndex: slideEntry.slideIndex,
          slideId: slideEntry.slideId,
        };
      },
      [courseIndex]
    );

    const clampTargetToModuleEnd = useCallback(
      (moduleIndex: number): SeekTarget | null => {
        if (!courseIndex) return null;

        const moduleEntry = courseIndex.modules[moduleIndex];
        if (!moduleEntry || !moduleEntry.slides.length) {
          return null;
        }

        const lastSlide = moduleEntry.slides[moduleEntry.slides.length - 1];
        return {
          moduleIndex,
          lessonIndex: lastSlide.lessonIndex,
          slideIndex: lastSlide.slideIndex,
          slideId: lastSlide.slideId,
        };
      },
      [courseIndex]
    );

    const applySeekTarget = useCallback(
      (target: SeekTarget) => {
        if (scrubActive.current) return;
        const {
          moduleIndex,
          lessonIndex,
          slideIndex: targetSlideIndex,
          slideId,
        } = target;

        const moduleChanged = moduleIndex !== currentModuleIndex;
        const lessonChanged = lessonIndex !== currentLessonIndex || moduleChanged;
        const slideChanged = targetSlideIndex !== slideIndex || lessonChanged;

        if (moduleChanged) {
          if (!scrubActive.current) {
            setContentReady(false);
            setRestoredReady(false);
          }
          setCurrentModuleIndex(moduleIndex);
        }

        if (lessonChanged && !scrubActive.current) {
          setCurrentLessonIndex(lessonIndex);
        }

        if (slideChanged && !scrubActive.current) {
          setSlideIndex(targetSlideIndex);
        }

        if (!slideChanged && slideId === slides[slideIndex]?.id) {
          setCanProceed(true);
        }
      },
      [
        currentModuleIndex,
        currentLessonIndex,
        slideIndex,
        slides,
      ]
    );

    const handleScrub = useCallback(
      (seconds: number) => {
        if (!courseIndex) return;

        const roundTo = (value: number, precision: number) => {
          const factor = 10 ** precision;
          return Math.round(value * factor) / factor;
        };

        const seekSeconds = Math.max(
          0,
          Math.min(courseIndex.totalSeconds, roundTo(seconds, 2))
        );

        scrubSeekSecondsRef.current = Math.min(
          seekSeconds,
          allowedSeekSecondsRef.current
        );
      },
      [courseIndex]
    );

    const handleScrubEnd = useCallback(() => {
      scrubActive.current = false;
      const secs = scrubSeekSecondsRef.current;
      scrubSeekSecondsRef.current = null;
      if (secs === null) return;
      if (secs > allowedSeekSecondsRef.current) return;

      const resolved = resolveCourseTime(secs);
      if (!resolved) return;

      const maxUnlockedModuleIndex = Math.min(
        modules.length - 1,
        maxCompletedIndex + 1
      );

      const target =
        resolved.moduleIndex > maxUnlockedModuleIndex
          ? clampTargetToModuleEnd(maxUnlockedModuleIndex) ?? resolved
          : resolved;

      applySeekTarget(target);

    }, [
      applySeekTarget,
      clampTargetToModuleEnd,
      maxCompletedIndex,
      modules.length,
      resolveCourseTime,
    ]);

    const scheduleTooltipUpdate = useCallback(() => {
      if (hoverTooltipRafRef.current !== null) return;
      hoverTooltipRafRef.current = requestAnimationFrame(() => {
        hoverTooltipRafRef.current = null;
        const tooltip = hoverTooltipRef.current;
        if (!tooltip) return;

        const { imgUrl, text, timeLabel } = previewDataRef.current;
        tooltip.style.left = `${previewXRef.current}px`;
        tooltip.style.opacity = tooltipVisibleRef.current ? "1" : "0";
        tooltip.style.pointerEvents = tooltipVisibleRef.current
          ? "auto"
          : "none";

        if (hoverTooltipImageRef.current) {
          if (imgUrl) {
            hoverTooltipImageRef.current.src = imgUrl;
            hoverTooltipImageRef.current.style.display = "block";
          } else {
            hoverTooltipImageRef.current.removeAttribute("src");
            hoverTooltipImageRef.current.style.display = "none";
          }
        }

        if (hoverTooltipPlaceholderRef.current) {
          hoverTooltipPlaceholderRef.current.style.display = imgUrl
            ? "none"
            : "block";
        }

        if (hoverTooltipTextRef.current) {
          hoverTooltipTextRef.current.textContent = text ?? "";
        }

        if (hoverTooltipTimeRef.current) {
          hoverTooltipTimeRef.current.textContent = timeLabel ?? "";
          hoverTooltipTimeRef.current.style.display = timeLabel ? "block" : "none";
        }
      });
    }, []);

    const handleHoverResolve = useCallback(
      (seconds: number, clientX: number) => {
        if (!courseIndex) return;

        const target = resolveCourseTime(seconds, courseIndex.totalSeconds);
        if (!target) return;

        const rect = timelineHoverRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const width = 375;
        const viewportWidth =
          typeof window !== "undefined" ? window.innerWidth : rect.right;
        const minBoundary = Math.max(0, rect.left);
        const maxViewportBoundary = Math.max(0, viewportWidth - width);
        const maxBoundary = Math.min(rect.right - width, maxViewportBoundary);
        const desired = clientX - width / 2;
        const leftPx = Math.min(Math.max(desired, minBoundary), maxBoundary);
        const slide = courseSlidesById.get(target.slideId);
        const imgUrl = slide
          ? thumbCacheRef.current.get(slide.id) ?? null
          : null;
        const text = captionPreviewBySlideId.get(target.slideId) ?? "";
        const timeLabel = formatHoverTime(seconds);

        previewXRef.current = leftPx;
        previewDataRef.current = {
          imgUrl,
          text: text ?? "",
          timeLabel,
        };
        tooltipVisibleRef.current = true;
        scheduleTooltipUpdate();
      },
      [
        courseIndex,
        resolveCourseTime,
        courseSlidesById,
        captionPreviewBySlideId,
        scheduleTooltipUpdate,
      ]
    );

    const handleHoverEnd = useCallback(() => {
      tooltipVisibleRef.current = false;
      scheduleTooltipUpdate();
    }, [scheduleTooltipUpdate]);

    useEffect(() => {
      if (!showTimeline) {
        tooltipVisibleRef.current = false;
        scheduleTooltipUpdate();
      }
    }, [scheduleTooltipUpdate, showTimeline]);

    const handleScrubStart = useCallback(() => {
      scrubActive.current = true; // start scrubbing
      scrubSeekSecondsRef.current = null;
      setIsPaused(true);
    }, []);

    useEffect(() => {
      function handleSpace(e: KeyboardEvent) {
        if (e.code !== "Space") return
        e.preventDefault()
        revealTimelineFor3s()
        togglePlay()
      }

      window.addEventListener("keydown", handleSpace)
      return () => window.removeEventListener("keydown", handleSpace)
    }, [])

    useEffect(() => {
      function handleContinueHotkey(e: KeyboardEvent) {
        if (!showContinueInstruction) return

        // prevent space scrolling
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault()
          goNext()
        }
      }

      window.addEventListener("keydown", handleContinueHotkey)
      return () => window.removeEventListener("keydown", handleContinueHotkey)
    }, [showContinueInstruction])

  // -------------------------------------------------------------
  // DEBUG: Core gate values (helps detect infinite steering wheel)
  // -------------------------------------------------------------
  useEffect(() => {
    console.log("GATES:", {
      progressReady,
      contentReady,
      restoredReady,
      initialHydrationDone
    });
    console.log("INDICES:", {
      currentModuleIndex,
      currentLessonIndex,
      slideIndex
    });
  }, [progressReady, contentReady, restoredReady, initialHydrationDone,
      currentModuleIndex, currentLessonIndex, slideIndex]);


    useEffect(() => {
      if (progressReady && contentReady && !initialHydrationDone) {
        setInitialHydrationDone(true);
      }
    }, [progressReady, contentReady]);

  // ------------------------------------------------------
  // COURSE COMPLETION
  // ------------------------------------------------------
  const courseCompletionSentRef = useRef(false);

  async function markCourseCompletedOnce() {
    if (courseCompletionSentRef.current) return;
    courseCompletionSentRef.current = true;

    try {
      await fetch("/api/course/complete", {
    method: "POST",
    credentials: "include",
  });
    } catch (e) {
      console.error("Failed to mark course complete", e);
    }
  }

    const moduleLoadInFlightRef = useRef<string | null>(null);
    const lessonLoadInFlightRef = useRef<number | null>(null);


  //-----------------------------------
  // TIME-BASED PROGRESS CALCULATIONS
  //-----------------------------------
  const totalModuleSeconds = slides.reduce((sum, slide) => {
    const caps = captions[slide.id] || [];
    return sum + caps.reduce((s, c) => s + (c.seconds ?? 0), 0);
  }, 0);

  const elapsedSeconds = (() => {
    let sec = 0;

  for (let i = 0; i < slideIndex; i++) {
    const slide = slides[i];
    if (!slide) continue;
    const caps = captions[slide.id] || [];
    sec += caps.reduce((s, c) => s + (c.seconds ?? 0), 0);
  }


    return sec;
  })();

    // -----------------------------------
    // COURSE-LEVEL TOTAL TIME
    // -----------------------------------


    // per-module totals
    useEffect(() => {
    async function loadCourseTotals() {
      const { data: slideRows } = await supabase
        .from("lesson_slides")
        .select("id");

      const slideIds = slideRows?.map(s => s.id) ?? [];

      const { data: caps } = await supabase
        .from("slide_captions")
        .select("seconds")
        .in("slide_id", slideIds);

      const total = (caps ?? []).reduce(
        (sum, c) => sum + (c.seconds ?? 0),
        0
      );

      setCourseTotals({ totalSeconds: total });
    }

    loadCourseTotals();
  }, []);

  const completedModulesSeconds = modules
    .slice(0, currentModuleIndex)
    .reduce(
      (sum, m) => sum + (moduleTotals[m.id] || 0),
      0
    );

  // -----------------------------------
  // COURSE-LEVEL ELAPSED TIME (FINAL)
  // -----------------------------------
  const elapsedCourseSeconds =
    completedModulesSeconds + elapsedSeconds;

  const isIdle = isPaused && elapsedCourseSeconds === 0

  useEffect(() => {
    allowedSeekSecondsRef.current = Math.max(
      allowedSeekSecondsRef.current,
      elapsedCourseSeconds
    );
    playedSecondsRef.current = Math.max(
      playedSecondsRef.current,
      elapsedCourseSeconds
    );
  }, [elapsedCourseSeconds]);


  useEffect(() => {
    async function loadModuleTotals() {
      const { data: slideRows } = await supabase
        .from("lesson_slides")
        .select("id, lesson_id");

      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("id, module_id");


      const lessonToModule = Object.fromEntries(
      (lessonRows ?? []).map(l => [l.id, l.module_id])
    );

      const { data: caps } = await supabase
        .from("slide_captions")
        .select("slide_id, seconds");

      const slideToLesson = Object.fromEntries(
        (slideRows ?? []).map(s => [s.id, s.lesson_id])
      );


      const totals: Record<string, number> = {};

      caps?.forEach(c => {
        const lessonId = slideToLesson[c.slide_id];
        const moduleId = lessonToModule[lessonId];
        if (!moduleId) return;

        totals[moduleId] = (totals[moduleId] || 0) + (c.seconds ?? 0);
      });

      setModuleTotals(totals);
    }

    loadModuleTotals();
  }, []);

    /* ------------------------------------------------------
      checks backend status and redirects
    ------------------------------------------------------ */
  const [terminalStatusLoaded, setTerminalStatusLoaded] = useState(false);

  async function refreshStatusAndRedirect() {
        const res = await fetch("/api/course/status");
        const data = await res.json();

        if (data.status === "completed_unpaid") {
          window.location.href = "/finish-pay";
        } else if (
          data.status === "completed_paid" ||
          data.status === "dmv_submitted"
        ) {
          window.location.href = "/finish";
        }
      }

      async function loadTerminalStatus() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("No session — skipping terminal status");
      return;
    }

    const res = await fetch("/api/course/status", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      console.error("Failed to load terminal status", res.status);
      return;
    }

    const data = await res.json();

    console.log("COURSE STATUS RESPONSE:", data);

    // SAFETY GUARD: null or undefined response
    if (!data) {
      setExamPassed(false);
      setPaymentPaid(false);
      return;
    }

    setExamPassed(Boolean(data.exam_passed));

    setPaymentPaid(
      data.status === "completed_paid" ||
      data.status === "dmv_submitted"
    );
  }


    /* ------------------------------------------------------
      LOAD MODULES
    ------------------------------------------------------ */
    async function loadModules() {
      const { data } = await supabase
        .from("modules")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) {
        setModules(data);
      }
    }

    async function loadCourseStructure() {
      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("id,module_id,title,sort_order")
        .order("sort_order", { ascending: true });

      const { data: slideRows } = await supabase
        .from("lesson_slides")
        .select("id,lesson_id,module_id,order_index,image_path")
        .order("order_index", { ascending: true });

      const { data: captionRows } = await supabase
        .from("slide_captions")
        .select("id,slide_id,seconds,line_index,caption")
        .order("line_index", { ascending: true });

      setCourseLessons(lessonRows ?? []);
      setCourseSlides(slideRows ?? []);

      const captionMap: Record<string, CaptionTimingRow[]> = {};

      (captionRows ?? []).forEach((caption) => {
        if (!captionMap[caption.slide_id]) {
          captionMap[caption.slide_id] = [];
        }
        captionMap[caption.slide_id].push(caption);
      });

      Object.values(captionMap).forEach((group) => {
        group.sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0));
      });

      setCourseCaptions(captionMap);
    }

  // ------------------------
  // PROGRESS LOADING + APPLY
  // ------------------------
  useEffect(() => {
    // Wait until modules are loaded
    if (!modules.length) return;

    // Apply progress exactly once
    if (didApplyProgress.current) return;

    loadProgress();
  }, [modules]);

  async function loadProgressFromDB() {
    const user = await supabase.auth.getUser();

    if (!user?.data?.user) {
      return { modRows: [], slideRows: [] };
    }

    const { data: modRows } = await supabase
      .from("course_progress_modules")
      .select("*")
      .eq("user_id", user.data.user.id)
      .eq("course_id", "FL_PERMIT_TRAINING");

    const { data: slideRows } = await supabase
      .from("course_progress_slides")
      .select("*")
      .eq("user_id", user.data.user.id)
      .eq("course_id", "FL_PERMIT_TRAINING");

    return { modRows: modRows ?? [], slideRows: slideRows ?? [] };
  }

  async function loadProgress() {
    const { modRows, slideRows } = await loadProgressFromDB();
    applyProgress(modRows, slideRows);
  }

  function applyProgress(
    modRows: any[] = [],
    slideRows: any[] = []
  ) {

    // ----------------------------------
    // SINGLE ENTRY GUARD (ONLY PLACE)
    // ----------------------------------
    if (didApplyProgress.current) return;
    didApplyProgress.current = true;

    console.log("APPLY_PROGRESS INPUT:", {
      modCount: modRows.length,
      slideCount: slideRows.length,
    });

    // ----------------------------------
    // BASIC SANITY
    // ----------------------------------
    if (!Array.isArray(modRows) || !Array.isArray(slideRows)) {
      unlockProgressGates();
      return;
    }

  // ----------------------------------
  // URL DEEP-LINK
  // ----------------------------------
  const rawParam = searchParams.get("module");

  let urlIndex: number | null = null;

  if (rawParam !== null) {
    const parsed = Number(rawParam);
    if (Number.isInteger(parsed)) {
      urlIndex = parsed;
    }
  }

  // ----------------------------------
  // MODULE COMPLETION (DB)
  // ----------------------------------
  const completedModules = modRows.filter(m => m?.completed);

  const maxCompletedModuleIndex = completedModules.length
    ? Math.max(...completedModules.map(m => m.module_index ?? 0))
    : 0;

  setMaxCompletedIndex(maxCompletedModuleIndex);

  // ----------------------------------
  // FINAL MODULE DECISION (SINGLE SOURCE OF TRUTH)
  // ----------------------------------
  let finalModuleIndex = maxCompletedModuleIndex;

  if (urlIndex !== null) {
    finalModuleIndex = Math.min(urlIndex, maxCompletedModuleIndex);
  }

  console.log("📍 FINAL MODULE INDEX:", finalModuleIndex);

  setCurrentModuleIndex(finalModuleIndex);


  // ----------------------------------
  // SLIDE POSITION WITHIN *FINAL* MODULE
  // ----------------------------------
  const slidesInModule = slideRows.filter(
    s => (s?.module_index ?? -1) === finalModuleIndex
  );

  if (!slidesInModule.length) {
    setCurrentLessonIndex(0);
    setSlideIndex(0);
    unlockProgressGates();
    return;
  }

  const last = slidesInModule.reduce((a, b) =>
    (a.slide_index ?? 0) > (b.slide_index ?? 0) ? a : b
  );

  setCurrentLessonIndex(last.lesson_index ?? 0);
  setSlideIndex(last.slide_index ?? 0);

  unlockProgressGates();

  }

  const refreshStatusAndProgress = useCallback(async () => {
    const { modRows } = await loadProgressFromDB();
    const completedModules = modRows.filter(m => m?.completed);
    const maxCompletedModuleIndex = completedModules.length
      ? Math.max(...completedModules.map(m => m.module_index ?? 0))
      : 0;

    setMaxCompletedIndex(maxCompletedModuleIndex);
    allowedSeekSecondsRef.current = Math.max(
      allowedSeekSecondsRef.current,
      elapsedCourseSeconds
    );
    playedSecondsRef.current = Math.max(
      playedSecondsRef.current,
      elapsedCourseSeconds
    );
    setTimelineVersion((v) => v + 1);
  }, [elapsedCourseSeconds]);

  // ----------------------------------
  // CENTRALIZED GATE UNLOCK
  // ----------------------------------
  function unlockProgressGates() {
    setProgressReady(true);
    setRestoredReady(true);
    setProgressResolved(true);
  }

  /* ------------------------------------------------------
      LOAD LESSONS (without resetting lesson index)
    ------------------------------------------------------ */
    async function loadLessons(moduleId: string) {
      if (moduleLoadInFlightRef.current === moduleId) return;
      moduleLoadInFlightRef.current = moduleId;

      try {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true });

      if (!data?.length) {
        setLessons([]);
        return;
      }

      setLessons(data);
      // DO NOT reset currentLessonIndex here
      } finally {
        if (moduleLoadInFlightRef.current === moduleId) {
          moduleLoadInFlightRef.current = null;
        }
      }
    }

  /* ------------------------------------------------------
    LOAD LESSON CONTENT  (with contentReady gates)
  ------------------------------------------------------ */
  async function loadLessonContent(lessonId: number) {
      if (scrubActive.current) {
      console.warn("LOAD CANCELLED — scrub active")
      return
    }

    if (lessonLoadInFlightRef.current === lessonId) return;
    lessonLoadInFlightRef.current = lessonId;
    console.log("LOAD_LESSON_CONTENT: start", { lessonId });

    try {
      // reset content-ready for this lesson load
      setContentReady(false);

      // clear existing content
      setSlides([]);
      setCaptions({});

      // ---- SLIDES ----
      const { data: slideRows } = await supabase
        .from("lesson_slides")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      setSlides(slideRows || []);

      // ---- CAPTIONS ----
      const slideIds = slideRows?.map((s) => s.id) ?? [];
      const { data: captionRows } = await supabase
        .from("slide_captions")
        .select(`
          id,
          slide_id,
          caption,
          seconds,
          line_index
        `)
        .in("slide_id", slideIds)
        .order("line_index", { ascending: true });

      const grouped: Record<string, CaptionRow[]> = {};
      slideRows?.forEach((s) => {
        grouped[s.id] =
          captionRows?.filter((c) => String(c.slide_id) === String(s.id)) ?? [];
      });

      setCaptions(grouped);

      console.log("LESSON CONTENT LOADED:", {
        lessonId,
        slidesLoaded: slideRows?.length ?? 0,
        captionsLoaded: captionRows?.length ?? 0,
        restoredReady,
        contentReadyPending: true
      });

      // ------------------------------------------------------
      // PATCH: Unlock autoplay for *fresh module loads* 
      // (restoredReady = false means NEW USER or NEW MODULE)
      // ------------------------------------------------------
      if (!restoredReady) {
        console.log("FRESH MODULE LOAD → enabling contentReady immediately");
        setContentReady(true);
      }

      // ------------------------------------------------------
      // If restoring from saved progress, wait and then unlock.
      // ------------------------------------------------------
      if (restoredReady) {
        console.log("RESTORED PROGRESS → enabling contentReady");
        setContentReady(true);
      }
    } finally {
      if (lessonLoadInFlightRef.current === lessonId) {
        lessonLoadInFlightRef.current = null;
      }
    }
  }


  /* ------------------------------------------------------
    LOAD SEQUENCE
  ------------------------------------------------------ */
  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    loadCourseStructure();
  }, []);

  useEffect(() => {
    loadTerminalStatus();
  }, []);


  useEffect(() => {
    if (!progressResolved) return;
    if (scrubActive.current) return;
    const module = modules[currentModuleIndex];
    if (!module) return;
    loadLessons(module.id);
  }, [modules, currentModuleIndex, progressResolved]);

  useEffect(() => {
    if (!progressResolved) return;
    if (scrubActive.current) return;
    const l = lessons[currentLessonIndex];
    if (!l) return;
    loadLessonContent(l.id);
  }, [lessons, currentLessonIndex, progressResolved]);

  useEffect(() => {
    // If restoredReady turned true AFTER lesson content loaded,
    // we must unlock contentReady manually.
    if (restoredReady && slides.length > 0 && Object.keys(captions).length > 0) {
      console.log("LATE RESTORE → Unlocking contentReady now");
      setContentReady(true);
    }
  }, [restoredReady, slides, captions]);

  useEffect(() => {
    if (!contentReady) return;
    if (!slides[slideIndex]) return;
    setCanProceed(true);
  }, [contentReady, slideIndex, slides]);


  /* ------------------------------------------------------
    AUTO-PAUSE WHEN PAGE IS NOT ACTIVE
  ------------------------------------------------------ */
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        setIsPaused(true);
      }
    }

    function handleBlur() {
      setIsPaused(true);
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);


  /* ------------------------------------------------------
    PROGRESS UPDATERS (copy/paste exactly)
  ------------------------------------------------------ */
  async function recordSlideComplete(moduleIndex: number, lessonIndex: number, slideIndex: number) {
    const user = await supabase.auth.getUser();
    console.log("recordSlideComplete user:", user?.data?.user);
    if (!user.data.user) return;

    const module = modules[moduleIndex];
    const lesson = lessons[lessonIndex];
    const slide = slides[slideIndex];

    if (!module || !lesson || !slide) return;

  await supabase
    .from("course_progress_slides")
    .upsert(
      {
        user_id: user.data.user.id,
        course_id: "FL_PERMIT_TRAINING",
        module_id: module.id,
        lesson_id: lesson.id,
        slide_id: slide.id,
        slide_index: slideIndex,
        lesson_index: lessonIndex,
        completed: true,
      },
      { onConflict: "user_id,course_id,slide_id" }
    )
    .select()
    .throwOnError();
  }


  /* update module-level progress */
  async function updateModuleProgress(moduleIndex: number) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;

    const module = modules[moduleIndex];
    if (!module) return;

    // total slides in that module
    const { data: totalSlides } = await supabase
      .from("lesson_slides")
      .select("id")
      .eq("module_id", module.id);

    const { data: completedSlides } = await supabase
      .from("course_progress_slides")
      .select("id")
      .eq("user_id", user.data.user.id)
      .eq("module_id", module.id)
      .eq("completed", true);

    const completed = (completedSlides?.length ?? 0) >= (totalSlides?.length ?? 0);

    // DEBUG THIS BEFORE UPSERT
    console.log("updateModuleProgress payload:", {
      user_id: user.data.user.id,
      course_id: "FL_PERMIT_TRAINING",
      module_id: module.id,
      module_index: moduleIndex,
      highest_slide_index: slides.length - 1,
      completed
    });

  await supabase
    .from("course_progress_modules")
    .upsert(
      {
        user_id: user.data.user.id,
        course_id: "FL_PERMIT_TRAINING",
        module_id: module.id,
        module_index: moduleIndex,
        highest_slide_index: slides.length - 1,
        completed,
      },
      { onConflict: "user_id,course_id,module_id" }
    )
    .select()
    .throwOnError();

    if (completed) {
      await refreshStatusAndProgress();
    }
  }
  //--------------------------------------------------------------------
  // SAFE DISPLAY VALUES FOR CURRENT UI
  //--------------------------------------------------------------------
  const currentSlide = slides[slideIndex] || null;

  const currentImage = currentSlide
    ? resolveImage(currentSlide.image_path)
    : null;

  /* ------------------------------------------------------
    NAVIGATION  (FULL REPLACEMENT — FINAL SAFE VERSION)
  ------------------------------------------------------ */
  const goNext = useCallback(async () => {

    // 🚨 FINAL COURSE TERMINAL STATE (ABSOLUTE STOP)
    if (isFinalCourseSlide) {
      await markCourseCompletedOnce();

      // HARD EXIT — prevents ANY restore / reset logic
      window.location.href = "/my-permit";
      return;
    }

    const record = async (modI: number, lesI: number, sliI: number) => {
      await recordSlideComplete(modI, lesI, sliI);
      await updateModuleProgress(modI);
    };

    // ▶️ NEXT SLIDE (same lesson)
    if (slideIndex < totalSlides - 1) {
      const nextSlide = slideIndex + 1;
      setSlideIndex(nextSlide);
      record(currentModuleIndex, currentLessonIndex, nextSlide);
      return;
    }

    // ▶️ NEXT LESSON (same module)
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = currentLessonIndex + 1;
      setCurrentLessonIndex(nextLesson);
      setSlideIndex(0);
      record(currentModuleIndex, nextLesson, 0);
      return;
    }

  // ▶ NEXT MODULE
  if (currentModuleIndex < modules.length - 1) {
    const nextModule = currentModuleIndex + 1;

    setSlides([]);
    setCaptions({});

    setContentReady(false);
    setRestoredReady(false);

    setCurrentModuleIndex(nextModule);
    setCurrentLessonIndex(0);
    setSlideIndex(0);

    record(nextModule, 0, 0);
    return;
  }

    // 🚫 NO FALLTHROUGH — terminal paths handled above
  }, [
    isFinalCourseSlide,
    slideIndex,
    totalSlides,
    currentLessonIndex,
    currentModuleIndex,
    lessons?.length ?? 0,
    modules?.length ?? 0,
  ]);

  //--------------------------------------------------------------------
  // PROGRESS BAR SMOOTHING
  //--------------------------------------------------------------------

  const courseFinished =
    isFinalCourseSlide && canProceed;

  const progressPercentage =
    courseFinished
      ? 100
      : progressReady && contentReady && totalModuleSeconds > 0
      ? (elapsedSeconds / totalModuleSeconds) * 100
      : 0;



  //--------------------------------------------------------------------
  // jump to module only if user has unlocked it (GUARDED)
  //--------------------------------------------------------------------
  function goToModule(i: number) {
    if (scrubActive.current) return;
    const targetStartSeconds = moduleDurationSeconds
      .slice(0, i)
      .reduce((sum, duration) => sum + (duration ?? 0), 0);

    if (targetStartSeconds > allowedSeekSecondsRef.current) {
      return;
    }

    // ✅ Always allow current module
    if (i === currentModuleIndex) {
      // fall through to existing reload logic below
    }
    // ✅ Allow completed modules
    else if (i <= maxCompletedIndex) {
      // allowed
    }
    // ✅ Allow next unlocked module
    else if (i === maxCompletedIndex + 1) {
      // allowed
    }
    // 🚫 Everything else blocked
    else {
      return;
    }

    // ------------------------------
    // SAME MODULE CLICK → HARD RELOAD
    // ------------------------------
    if (i === currentModuleIndex) {
      console.log("HARD MODULE RELOAD");

      setContentReady(false);
      setRestoredReady(true);

      setCurrentLessonIndex(0);
      setSlideIndex(0);
      setCanProceed(false);
      setIsPaused(true);

      loadLessons(modules[i].id)
        .then(() => loadLessonContent(lessons[0]?.id));

      return;
    }

    // ------------------------------
    // REAL MODULE SWITCH
    // ------------------------------
    setContentReady(false);
    setRestoredReady(false);

    setCurrentModuleIndex(i);
    setCurrentLessonIndex(0);
    setSlideIndex(0);

    setCanProceed(false);
    setIsPaused(true);

    router.push(`/course-test?module=${i}`);
  }

  // Show steering wheel ONLY during very first load
  if (!initialHydrationDone) {
    if (!progressReady || !contentReady) {
      return (
      <Loader />
      );
    }
  }

  // AFTER initial hydration → do NOT block the UI with the loader

  function togglePlay() {
    revealTimelineFor3s()
    setIsPaused((prev) => !prev)
  }

  return (
    <div className="relative min-h-screen bg-white flex flex-col">

      <div className="fixed top-0 left-0 right-0 z-40 h-2 bg-gray-200">
        <div
          className="h-full bg-[#ca5608] transition-[width] duration-700 ease-linear"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div
        className="relative flex-1 w-screen h-screen overflow-hidden pt-0 md:pt-10 pb-[160px] z-0"
        onClick={(e) => {
          const tgt = e.target as HTMLElement;
          if (
            tgt.closest("button") ||
            tgt.closest("input") ||
            tgt.closest("select") ||
            tgt.closest("a")
          )
            return;
          togglePlay();
        }}
      >
        <SlideView currentImage={currentImage} />

      <div
    className={`
      absolute left-0 right-0 z-[50]
      flex items-center justify-center
      transition-opacity duration-300
      ${isPaused
        ? "opacity-100"
        : "opacity-0 pointer-events-none"}
        `}
    style={{ top: "8px", bottom: "300px" }}
  >
    {isIdle && (
      <div className="absolute bottom-[115px] text-white font-bold text-lg">
        Press play to begin
      </div>
    )}

    <button
      onClick={(e) => {
        e.stopPropagation();
        togglePlay();
      }}
      className={`
        w-20 h-20
        rounded-full
        bg-black/90
        flex items-center justify-center
        backdrop-blur-sm
        cursor-pointer
        transition
        ring-4 ring-white/70
        ${isIdle ? "idle-fade" : ""}
        hover:bg-black/70    
        `}
    >
      {isPaused ? (
        <svg
          viewBox="0 0 24 24"
          className="w-18 h-20 fill-white"
          style={{ transform: "translateX(-1.5px)" }}
        >
          <path d="M8.5 5a1.5 1.5 0 00-1.5 1.5v11a1.5 1.5 0 001.5 1.5L21.5 12z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="w-15 h-15 fill-white"
          style={{ transform: "translateX(-2.5px)" }}
        >
          <path d="M6.8 5.5a1.1 1.1 0 011.1-1.1h2.2a1.1 1.1 0 011.1 1.1v13a1.1 1.1 0 01-1.1 1.1H7.9a1.1 1.1 0 01-1.1-1.1z M14.9 5.5a1.1 1.1 0 011.1-1.1h2.2a1.1 1.1 0 011.1 1.1v13a1.1 1.1 0 01-1.1 1.1H16a1.1 1.1 0 01-1.1-1.1z" />
        </svg>
      )}
    </button>
  </div>
      </div>

      <div
        className={`
          fixed bottom-[250px] left-0 right-0
          flex justify-center z-40
          transition-all duration-500 ease-out
          ${
            showContinueInstruction
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }
        `}
      >
        <button
          onClick={() => {
            goNext()
          }}
          className="
            px-12 py-5
            rounded-full
            bg-black/90
            text-white font-semibold text-xl
            ring-4 ring-white/70
            backdrop-blur-sm
            cursor-pointer
            transition
            hover:bg-black/70
          "
        >
          Continue
        </button>
      </div>
    
{showTimeline && (
  <div
    ref={hoverTooltipRef}
    className="fixed z-[999999] pointer-events-none transition-opacity duration-60"
    style={{
      left: 0,
      bottom: 240,
      opacity: 0,
    }}
  >
    <div className="relative w-[375px] h-[250px] rounded-lg bg-black/85 text-white shadow-md overflow-hidden flex flex-col">
      <div
        ref={hoverTooltipTimeRef}
        className="absolute top-2 left-2 px-2 py-[2px] rounded-full bg-white/90 text-black text-[11px] font-medium pointer-events-none"
        style={{ display: "none" }}
      />

      <img
        ref={hoverTooltipImageRef}
        alt=""
        className="h-[165px] w-full object-cover rounded-t-lg"
        style={{ display: "none" }}
      />
      <div
        ref={hoverTooltipPlaceholderRef}
        className="h-[165px] w-full bg-white/10 rounded-t-lg"
      />

      <div
        ref={hoverTooltipTextRef}
        className="px-3 py-2 text-[13px] leading-snug line-clamp-3 flex-1"
      />
    </div>
  </div>
)}

  {/* HOVER REVEAL AREA */}
  <div
    className="
      fixed bottom-0 left-0 right-0
      z-40 px-0 pb-[0px]
    "
    onMouseEnter={() => setShowTimeline(true)}
    onMouseLeave={() => {
      if (scrubActive.current) return;
      setShowTimeline(false);
      handleHoverEnd();
    }}
  >
    <div
      className={`
        transition-all duration-300 ease-out
        ${showTimeline
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3"
        }
      `}
    >

        {/* TIMELINE */}
      <CourseTimeline
        key={timelineVersion}
        modules={modules}
        currentModuleIndex={currentModuleIndex}
        maxCompletedIndex={maxCompletedIndex}
        goToModule={goToModule}
        allowedSeekSecondsRef={allowedSeekSecondsRef}
        playedSecondsRef={playedSecondsRef}
        examPassed={examPassed}
        paymentPaid={paymentPaid}
        togglePlay={togglePlay}
        isPaused={isPaused}
        currentSeconds={elapsedSeconds}
        totalSeconds={totalModuleSeconds}
        elapsedCourseSeconds={elapsedCourseSeconds}
        totalCourseSeconds={totalCourseSeconds}
        moduleDurations={moduleDurationSeconds}
        onScrub={handleScrub}
        onScrubStart={handleScrubStart}
        onScrubEnd={handleScrubEnd}
        onHoverResolve={handleHoverResolve}
        onHoverEnd={handleHoverEnd}
        timelineContainerRef={timelineHoverRef}
        thumbCacheRef={thumbCacheRef}
      />

      <div
        className="fixed bottom-[160px] left-0 right-0 z-[200] pointer-events-none"
      >
        <div className="md:max-w-6xl md:mx-auto px-4">
          <div className="flex items-center gap-4 text-[#001f40]">
            <div
              className="
                h-6 px-4
                flex items-center
                rounded-full
                bg-[#fff]/10
                text-[#fff]
                text-sm
                tabular-nums
                opacity-100
                translate-x-[45px]
                whitespace-nowrap
              "
            >
              {formatTime(elapsedCourseSeconds)} /{" "}
              {formatTime(courseTotals.totalSeconds)}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>


    </div>
    );
  }

  function formatTime(seconds: number) {
    if (!isFinite(seconds)) return "0:00";

    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function formatHoverTime(seconds: number) {
    if (!isFinite(seconds)) return "00:00:00";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }


  /* ============================================================
    SUBCOMPONENTS
  ============================================================ */

function SlideView({ currentImage }: { currentImage: string | null }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!currentImage) return

    const img = new Image()
    img.onload = () => {
      // only swap when loaded
      setSrc(currentImage)
    }
    img.src = currentImage
  }, [currentImage])

  return (
    <div className="absolute inset-0">
      {src && (
        <img
          key={src}
          src={src}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}
    </div>
  )
}
