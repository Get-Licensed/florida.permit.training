  // deno-lint-ignore-file

  "use client";

  import { supabase } from "@/utils/supabaseClient";
  import { useEffect, useState, useCallback, useRef, useMemo } from "react";
  import CourseTimeline from "@/components/YT-Timeline";
  import { useSearchParams } from "next/navigation";
  import { useRouter } from "next/navigation";
  import Loader from "@/components/loader";



  /* ------------------------------------------------------
    KARAOKE HELPERS  (MOVE THESE OUTSIDE THE COMPONENT)
  ------------------------------------------------------ */

  function tokenizeCaption(text: string): string[] {
    if (!text) return [];

    // Split words but KEEP punctuation attached
    return text
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function tokenizeForTiming(text: string): string[] {
    if (!text) return [];

    // separate punctuation *only for timing*
    return text
      .trim()
      .replace(/([.,!?;:])/g, " $1 ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function computeWordTimings(totalSeconds: number, words: string[]) {
    if (!words.length) return [];

    const SPEED = 1.0;
    const MIN_WORD_DURATION = totalSeconds * 0.015;

    const weights = words.map((w) => {
      const isPunct = /[.,!?;:]/.test(w);

      if (isPunct) {
        if (w === ".") return 14; // long pause
        if (w === ",") return 6;  // medium pause
        return 4;                 // other punctuation
      }

      // normal words: weight proportional to length
      return Math.max(2, Math.min(w.length * 1.1, 8));
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const scaledTotal = totalSeconds * SPEED;

    let cursor = 0;

    let timings = weights.map((wt, i) => {
      const dur = (wt / totalWeight) * scaledTotal;
      const start = cursor;
      cursor += dur;
      const end = i === weights.length - 1 ? scaledTotal : cursor;
      return { start, end };
    });

    timings = timings.map((t) => {
      const paddedEnd = Math.max(t.end, t.start + MIN_WORD_DURATION);
      return { start: t.start, end: paddedEnd };
    });

    return timings;
  }

  function mapTimingIndexToDisplayIndex(
    timingWords: string[],
    displayWords: string[]
  ) {
    let dIndex = 0;
    let result: number[] = [];

    for (let i = 0; i < timingWords.length; i++) {
      const tw = timingWords[i];
      const dw = displayWords[dIndex] ?? "";

      // punctuation belongs to current display index
      if (/^[.,!?;:]$/.test(tw)) {
        result.push(dIndex);
        continue;
      }

      // normal matching
      if (dw.startsWith(tw)) {
        result.push(dIndex);
        continue;
      }

      // fallback – increment display index, but clamp at end
      dIndex = Math.min(dIndex + 1, displayWords.length - 1);
      result.push(dIndex);
    }

    return result;
  }

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
    published_audio_url_a: string | null;
    published_audio_url_d: string | null;
    published_audio_url_j: string | null;
    published_audio_url_o: string | null;
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
    captionIndex: number;
    captionOffset: number;
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
  const VOICES = [
    {
      code: "en-US-Neural2-A",
      label: "John",
      urlKey: "published_audio_url_a",
      hashKey: "caption_hash_a",
    },
    {
      code: "en-US-Neural2-D",
      label: "Paul",
      urlKey: "published_audio_url_d",
      hashKey: "caption_hash_d",
    },
    {
      code: "en-US-Neural2-I",
      label: "Ringo",
      urlKey: "published_audio_url_o",
      hashKey: "caption_hash_o",
    },
    {
      code: "en-US-Neural2-J",
      label: "George",
      urlKey: "published_audio_url_j",
      hashKey: "caption_hash_j",
    },
  ];

  export const allowedSeekSecondsRef = { current: 0 };

  export default function CoursePlayerClient() {
    const didApplyProgress = useRef(false);
    const playedSecondsRef = useRef(0);
    const deepLinkConsumedRef = useRef(false);
    const scrubActive = useRef(false);
    const resumeAfterScrubRef = useRef(false);
    const shouldAutoPlayRef = useRef(false);
    const autoPausedRef = useRef(false);
    const isPlayingRef = useRef(false);
    const [muted, setMuted] = useState(false)
    const toggleMute = useCallback(() => {
      console.log("MUTE_CLICK");
      setMuted(prev => {
        const next = !prev;
        const audio = audioRef.current;
        if (audio) audio.muted = next;
        return next;
      });
    }, []);

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
    const [promoOpen, setPromoOpen] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    // audio controls
    const [volume, setVolume] = useState(0.8);
    const [voice, setVoice] = useState("en-US-Neural2-D");
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
     // keep mute state synced with the real audio
   useEffect(() => {
     if (!audioRef.current) return
     audioRef.current.muted = muted
      }, [muted])

    // loading
    const [loading, setLoading] = useState(true);
    const [restoredReady, setRestoredReady] = useState(false)
    const [initialHydrationDone, setInitialHydrationDone] = useState(false);

    const [showPlayFlash, setShowPlayFlash] = useState(false);
    const playFlashTimer = useRef<number | null>(null);
    // final actions
    const [examPassed, setExamPassed] = useState(false);
    const [paymentPaid, setPaymentPaid] = useState(false);


    const [moduleTotals, setModuleTotals] = useState<Record<string, number>>({});
    const COURSE_ID = "FL_PERMIT_TRAINING";
    const TOTAL_REQUIRED_SECONDS = 6 * 60 * 60; // 21600
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

    const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
    const [canProceed, setCanProceed] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);

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

      const resetAudioElement = useCallback(() => {
        if (scrubActive.current) return;
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.src = "";
        audio.load();
        audio.currentTime = 0;

        // do NOT touch cancelAutoplay here
      }, []);

      const switchVoice = useCallback(
        (newVoiceId: string) => {
          if (newVoiceId === voice) return;
          const wasPlaying =
            shouldAutoPlayRef.current && !isPausedRef.current;
          const resumeTime = audioRef.current
            ? audioRef.current.currentTime
            : 0;

          cancelAutoplay.current = true;
          voiceSwitchRef.current = { resumeTime, wasPlaying };
          setVoice(newVoiceId);
        },
        [voice]
      );

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
    const totalCourseSeconds = courseIndex?.totalSeconds ?? 0;

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

    const voiceLabel =
      VOICES.find(v => v.code === voice)?.label ?? "Unknown";
    
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

        const captionsForSlide = slideEntry.captions;
        let captionIndex = 0;
        let captionOffset = 0;

        if (captionsForSlide.length) {
          let captionRemaining = slideOffset;

          for (let i = 0; i < captionsForSlide.length; i++) {
            const duration = Math.max(0, captionsForSlide[i].seconds ?? 0);

            if (captionRemaining <= duration || i === captionsForSlide.length - 1) {
              captionIndex = i;
              captionOffset = Math.min(captionRemaining, duration);
              break;
            }
            captionRemaining -= duration;
          }
        }

        return {
          moduleIndex,
          lessonIndex: slideEntry.lessonIndex,
          slideIndex: slideEntry.slideIndex,
          captionIndex,
          captionOffset,
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
        const lastCaptionIndex = Math.max(0, lastSlide.captions.length - 1);
        const lastCaptionSeconds =
          lastSlide.captions[lastCaptionIndex]?.seconds ?? 0;

        return {
          moduleIndex,
          lessonIndex: lastSlide.lessonIndex,
          slideIndex: lastSlide.slideIndex,
          captionIndex: lastCaptionIndex,
          captionOffset: Math.max(0, lastCaptionSeconds),
          slideId: lastSlide.slideId,
        };
      },
      [courseIndex]
    );

    const applySeekTarget = useCallback(
      (target: SeekTarget) => {
        if (scrubActive.current) return;
        seekCommitInFlightRef.current = true;
        const {
          moduleIndex,
          lessonIndex,
          slideIndex: targetSlideIndex,
          captionIndex,
          captionOffset,
          slideId,
        } = target;

        appliedSeekTargetRef.current = target;

        const moduleChanged = moduleIndex !== currentModuleIndex;
        const lessonChanged = lessonIndex !== currentLessonIndex || moduleChanged;
        const slideChanged = targetSlideIndex !== slideIndex || lessonChanged;

        if (moduleChanged) {
          resetAudioElement();
          cancelAutoplay.current = false;
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

        if (!slideChanged) {
          setCurrentCaptionIndex(captionIndex);

          // allow continuous-time scrubs: only overwrite when not scrubbing
          if (
            !scrubActive.current &&
            audioRef.current &&
            slideId === slides[slideIndex]?.id &&
            currentCaptionIndex === captionIndex
          ) {
            const seekSeconds = Math.min(
              captionOffset,
              allowedSeekSecondsRef.current
            );
            audioRef.current.currentTime = seekSeconds;
            appliedSeekTargetRef.current = null;
            seekCommitInFlightRef.current = false;
            pendingSeekRef.current = null;
            voiceSwitchRef.current = null;
            if (!resumeAfterScrubRef.current) {
              cancelAutoplay.current = true;
              shouldAutoPlayRef.current = false;
              setIsPaused(true);
              isPausedRef.current = true;
            }
          }
        }


        setCurrentWordIndex(0);
        setCanProceed(false);
      },
      [
        currentModuleIndex,
        currentLessonIndex,
        slideIndex,
        slides,
        currentCaptionIndex,
        resetAudioElement,
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

        pendingSeekRef.current = Math.min(
          seekSeconds,
          allowedSeekSecondsRef.current
        );
      },
      [courseIndex]
    );

    const handleScrubEnd = useCallback(() => {
      scrubActive.current = false;
      const secs = pendingSeekRef.current;
      pendingSeekRef.current = null;
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

      if (resumeAfterScrubRef.current) {
        cancelAutoplay.current = false;
        setIsPaused(false);
        isPausedRef.current = false;
      }
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
      // record whether autoplay+playing was active BEFORE temporary pause
      resumeAfterScrubRef.current =
        shouldAutoPlayRef.current && !isPausedRef.current;
      // cancel any in-flight or pending seek work
      pendingSeekRef.current = null;
      appliedSeekTargetRef.current = null;
      seekCommitInFlightRef.current = false;
      // temporary scrub-pause
      cancelAutoplay.current = true;
      // remove: shouldAutoPlayRef.current = false    ← delete permanently
      setIsPaused(true);
      isPausedRef.current = true;
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

          resetAudioElement()
          setIsPaused(!shouldAutoPlayRef.current)
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

    const cancelAutoplay = useRef(false);
    
  function preloadAudio(url: string) {
    const a = new Audio();
    a.src = url;
    a.preload = "auto";  // Tells browser to decode early
  }

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

  // ------------------------------------------------------
  // AUDIO FADE HELPERS (HTMLAudioElement ONLY)
  // ------------------------------------------------------
  const fadeFrameRef = useRef<number | null>(null);
  const targetVolumeRef = useRef(volume);

  const cancelFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const fadeToVolume = useCallback(
    (audio: HTMLAudioElement, target: number, duration = 140) => {
      cancelFade();

      const start = performance.now();
      const initial = audio.volume;

      const clamp = (v: number) => Math.min(1, Math.max(0, v));

      if (duration <= 0) {
        audio.volume = clamp(target);
        return;
      }

      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);

        const raw = initial + (target - initial) * p;
        audio.volume = clamp(raw);

        if (p < 1) {
          fadeFrameRef.current = requestAnimationFrame(step);
        } else {
          fadeFrameRef.current = null;
        }
      };

      fadeFrameRef.current = requestAnimationFrame(step);
    },
    [cancelFade]
  );

  // keep ref in sync with slider
  useEffect(() => {
    targetVolumeRef.current = volume;
  }, [volume]);

  // cleanup on unmount
  useEffect(() => cancelFade, [cancelFade]);

  //--------------------------------------------------------------------
  // VOICE URL RESOLVER (UPDATED)
  //--------------------------------------------------------------------
  function resolveVoiceUrl(first: CaptionRow | undefined, voiceCode: string) {
    if (!first) return null;

    switch (voiceCode) {
      case "en-US-Neural2-A":
        return first.published_audio_url_a;
      case "en-US-Neural2-D":
        return first.published_audio_url_d;
      case "en-US-Neural2-I":
        return first.published_audio_url_o;
      case "en-US-Neural2-J":
        return first.published_audio_url_j;
      default:
        return null;
    }
  }


  // load saved voice on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("course_voice");
    if (saved) setVoice(saved);
  }, []);

  // save voice whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("course_voice", voice);
  }, [voice]);


    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voiceSwitchRef = useRef<{
      resumeTime: number;
      wasPlaying: boolean;
    } | null>(null);
    const pendingSeekRef = useRef<number | null>(null);
    const appliedSeekTargetRef = useRef<SeekTarget | null>(null);
    const seekCommitInFlightRef = useRef(false);
    const moduleLoadInFlightRef = useRef<string | null>(null);
    const lessonLoadInFlightRef = useRef<number | null>(null);
    const slideAdvanceTimeoutRef = useRef<number | null>(null);
    const slideRevisionRef = useRef(0);
    const captionAdvanceInFlightRef = useRef<string | null>(null);
    const lastTimeRef = useRef(0);
    const stalledCounterRef = useRef(0);

  // Reset autoplay intent on first mount
  useEffect(() => {
    shouldAutoPlayRef.current = false;
    cancelAutoplay.current = true;
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

    useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const initialPaused =
      audio.paused ||
      audio.currentTime === 0 ||
      audio.ended

    setIsPaused(initialPaused)
    isPausedRef.current = initialPaused
  }, [])

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handlePlay() {
      setIsPaused(false);
      isPlayingRef.current = true;
    }

    function handlePause() {
      setIsPaused(true);
      isPlayingRef.current = false;
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);


  const hardResetAudio = useCallback(() => {
    if (scrubActive.current) return;
    cancelFade();

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    // clear buffer completely
    audio.src = "";
    audio.load();

    audio.volume = targetVolumeRef.current;
    audio.oncanplay = null;
  }, [cancelFade]);


  //--------------------------------------------------------------------
  // UNLOCK AUTOPLAY ON FIRST USER GESTURE
  //--------------------------------------------------------------------
  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) return;
      if (!shouldAutoPlayRef.current) return;
      audioRef.current.play().catch(() => {});
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
    return () => window.removeEventListener("click", unlock);
  }, []);


  //--------------------------------------------------------------------
  // RESUME ON PAUSE - RESETS SOUND
  //--------------------------------------------------------------------
  const isPausedRef = useRef(true);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  //--------------------------------------------------------------------
  // RESTORE AUTOPLAY AFTER PROGRESS RESTORE
  //--------------------------------------------------------------------
  useEffect(() => {
    if (restoredReady && contentReady) {
      cancelAutoplay.current = false;
    }
  }, [restoredReady, contentReady]);


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


    const slide = slides[slideIndex];
    if (!slide) return sec;

    const caps = captions[slide.id] || [];
    for (let j = 0; j < currentCaptionIndex; j++) {
      sec += (caps[j]?.seconds ?? 0);
    }

    const cur = caps[currentCaptionIndex];
    if (cur) {
      sec += Math.min(audioTime, cur.seconds ?? 0);
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

      // stop any audio in progress
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
      }

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
          line_index,
          published_audio_url_d,
          published_audio_url_a,
          published_audio_url_j,
          published_audio_url_o
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

      // finished loading lesson data
      setLoading(false);

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

  /* ------------------------------------------------------
    SLIDE RESET (very important)
  ------------------------------------------------------ */
useEffect(() => {
  slideRevisionRef.current += 1;

  // reset caption advance lock when slide changes
  captionAdvanceInFlightRef.current = null;

  if (slideAdvanceTimeoutRef.current !== null) {
    clearTimeout(slideAdvanceTimeoutRef.current);
    slideAdvanceTimeoutRef.current = null;
  }

  pendingSeekRef.current = null;
  seekCommitInFlightRef.current = false;
  lastTimeRef.current = 0;
  stalledCounterRef.current = 0;
  setAudioDuration(0);
  setCurrentWordIndex(0);

  // 🚫 terminal state — do not reset anything
  if (isFinalCourseSlide) return;
  if (scrubActive.current) return;

  resetAudioElement();
  const pendingSeek = appliedSeekTargetRef.current;
  const activeSlideId = slides[slideIndex]?.id;

  if (pendingSeek && pendingSeek.slideId === activeSlideId) {
    setCurrentCaptionIndex(pendingSeek.captionIndex);
  } else {
    setCurrentCaptionIndex(0);
  }

  setCanProceed(false);
}, [
  slideIndex,
  slides,
  isFinalCourseSlide,
  resetAudioElement
]);

  useEffect(() => {
    captionAdvanceInFlightRef.current = null;
  }, [slideIndex]);

  useEffect(() => {
    captionAdvanceInFlightRef.current = null;
  }, [currentCaptionIndex]);
  useEffect(() => {
    if (scrubActive.current) return;
    const pendingSeek = appliedSeekTargetRef.current;
    const activeSlide = slides[slideIndex];

    if (pendingSeek && !contentReady) {
      console.warn("CONFLICT: pending seek cannot resolve while contentReady=false", {
        pendingSeek,
        progressReady,
        contentReady,
        restoredReady,
        initialHydrationDone,
        slideIndex,
        moduleIndex: currentModuleIndex,
      });
    }

    if (!pendingSeek || !activeSlide || pendingSeek.slideId !== activeSlide.id) {
      return;
    }

    if (currentCaptionIndex !== pendingSeek.captionIndex) {
      setCurrentCaptionIndex(pendingSeek.captionIndex);
    }
  }, [slides, captions, slideIndex, currentCaptionIndex, contentReady]);

  useEffect(() => {
    if (scrubActive.current) return;
    if (!contentReady) return;
    const pendingSeek = appliedSeekTargetRef.current;
    if (!pendingSeek) return;

    const activeSlide = slides[slideIndex];
    if (!activeSlide || pendingSeek.slideId !== activeSlide.id) {
      return;
    }

    if (currentCaptionIndex !== pendingSeek.captionIndex) {
      setCurrentCaptionIndex(pendingSeek.captionIndex);
    }

    const audio = audioRef.current;
    if (audio && audio.readyState >= 1) {
      let seekTo = Math.min(
        pendingSeek.captionOffset,
        audio.duration || pendingSeek.captionOffset
      );
      seekTo = Math.min(seekTo, allowedSeekSecondsRef.current);
      audio.currentTime = seekTo;
        appliedSeekTargetRef.current = null;
        seekCommitInFlightRef.current = false;
        pendingSeekRef.current = null;
        if (!resumeAfterScrubRef.current) {
          cancelAutoplay.current = true;
          shouldAutoPlayRef.current = false;
          setIsPaused(true);
          isPausedRef.current = true;
        }
    }
  }, [contentReady, slides, slideIndex, currentCaptionIndex]);

  useEffect(() => {
    if (scrubActive.current) return;
    const audio = audioRef.current;
    if (!audio || !contentReady) return;

    const slide = slides[slideIndex];
    if (!slide) return;

    const caps = captions[slide.id] || [];
    const urls = caps.map(c => resolveVoiceUrl(c, voice)).filter(Boolean);

    if (!urls.length) {
      setCanProceed(true);
      return;
    }



    const nextUrl = urls[currentCaptionIndex];
      if (!nextUrl) {
      setCanProceed(true);
      return;
    }

    // preload next caption
    if (currentCaptionIndex + 1 < urls.length) {
      preloadAudio(urls[currentCaptionIndex + 1]!);
    }

    if (cancelAutoplay.current && !voiceSwitchRef.current) return;
    const shouldAutoPlay = shouldAutoPlayRef.current;

    // SRC CHANGE
    if (audio.src !== nextUrl) {
      cancelFade();

      audio.pause();
      audio.currentTime = 0;
      audio.src = nextUrl;

      audio.volume = 0; // HARD SILENCE BEFORE PLAY

      audio.oncanplaythrough = () => {
        audio.oncanplaythrough = null;

        // If user paused during transition, do NOT start silent playback
        if (!shouldAutoPlayRef.current || isPausedRef.current || cancelAutoplay.current) {
          audio.volume = targetVolumeRef.current;
          return;
        }

        audio
          .play()
          .then(() => fadeToVolume(audio, targetVolumeRef.current))
          .catch(() => {});
      };

      audio.load();
      return;
    }

    // SAME SRC → RESUME
    if (shouldAutoPlay && !isPaused && !cancelAutoplay.current) {
      audio
        .play()
        .then(() => fadeToVolume(audio, targetVolumeRef.current, 120))
        .catch(() => {});
    }
  }, [
    slideIndex,
    currentCaptionIndex,
    captions,
    voice,
    slides,
    contentReady,
    isPaused,
    isFinalSlideOfModule,
    fadeToVolume,
    cancelFade
  ]);

  /* ------------------------------------------------------
    PAUSE
  ------------------------------------------------------ */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (isPaused) {
      cancelAutoplay.current = true; // stop any in-flight transition play
      cancelFade();                  // stop fade animations
      a.pause();

      // If we paused while volume was forced to 0 for a transition,
      // restore it so resume can't be silent.
      if (a.volume === 0) a.volume = targetVolumeRef.current;
    }
  }, [isPaused, cancelFade]);


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
    RESUME
  ------------------------------------------------------ */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPaused) return;
    if (!shouldAutoPlayRef.current) return;

    cancelAutoplay.current = false;

    // If we were stuck at 0 volume, bring it back with a fade.
    if (a.volume === 0) a.volume = 0.001;

    setTimeout(() => {
      a.play()
        .then(() => fadeToVolume(a, targetVolumeRef.current, 120))
        .catch(() => {});
    }, 50);
  }, [isPaused, fadeToVolume]);


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

  const captionText = currentSlide
    ? (captions[currentSlide.id] || []).map(c => c.caption).join("\n")
    : "";

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

    resetAudioElement();
    cancelAutoplay.current = false;

    setSlides([]);
    setCaptions({});
    setCurrentCaptionIndex(0);
    setCurrentWordIndex(0);

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
  // backward navigation  (NO QUIZ)
  //--------------------------------------------------------------------
  const goPrev = () => {

    // previous slide in same lesson
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
      return;
    }

    // go to last slide of previous lesson
    if (currentLessonIndex > 0) {
      const newLessonIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(newLessonIndex);
      setSlideIndex(0); // will update after lesson loads
      return;
    }

    // go to previous module (start at lesson 0, slide 0)
    if (currentModuleIndex > 0) {
      const newModuleIndex = currentModuleIndex - 1;
      setCurrentModuleIndex(newModuleIndex);
      setCurrentLessonIndex(0);
      setSlideIndex(0);
      return;
    }
  };

  //--------------------------------------------------------------------
  // jump to module only if user has unlocked it (GUARDED)
  //--------------------------------------------------------------------
  function goToModule(i: number) {
    if (seekCommitInFlightRef.current) return;
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

      resetAudioElement();
      cancelAutoplay.current = false;

      setContentReady(false);
      setRestoredReady(true);

      setCurrentLessonIndex(0);
      setSlideIndex(0);
      setCurrentCaptionIndex(0);
      setCanProceed(false);
      setIsPaused(!shouldAutoPlayRef.current);

      loadLessons(modules[i].id)
        .then(() => loadLessonContent(lessons[0]?.id));

      return;
    }

    // ------------------------------
    // REAL MODULE SWITCH
    // ------------------------------
    resetAudioElement();
    cancelAutoplay.current = false;

    setContentReady(false);
    setRestoredReady(false);

    setCurrentModuleIndex(i);
    setCurrentLessonIndex(0);
    setSlideIndex(0);
    setCurrentCaptionIndex(0);

    setCanProceed(false);
    setIsPaused(!shouldAutoPlayRef.current);

    router.push(`/course-test?module=${i}`);
  }

  const resumePlayback = useCallback(() => {
    const audio = audioRef.current;
    cancelAutoplay.current = false;
    setIsPaused(false);
    isPausedRef.current = false;

    if (audio) {
      if (audio.volume === 0) audio.volume = 0.001;
      audio
        .play()
        .then(() => fadeToVolume(audio, targetVolumeRef.current, 120))
        .catch(() => {});
    }

    setShowPlayFlash(true);

    if (playFlashTimer.current) {
      clearTimeout(playFlashTimer.current);
    }

    playFlashTimer.current = window.setTimeout(() => {
      setShowPlayFlash(false);
    }, 450);
  }, [fadeToVolume]);

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    cancelAutoplay.current = true;
    cancelFade();
    if (audio) {
      audio.pause();
      if (audio.volume === 0) audio.volume = targetVolumeRef.current;
    }

    setIsPaused(true);
    isPausedRef.current = true;
  }, [cancelFade]);

  const requestPlay = useCallback(() => {
    isPlayingRef.current = true
    resumePlayback()
  }, [resumePlayback])

  const requestPause = useCallback(() => {
    isPlayingRef.current = false
    pausePlayback()
  }, [pausePlayback])
      const handleCaptionComplete = useCallback(() => {
        const advanceRevision = slideRevisionRef.current;
        const key = `${advanceRevision}:${slideIndex}:${currentCaptionIndex}`;
        if (captionAdvanceInFlightRef.current === key) return;
        captionAdvanceInFlightRef.current = key;
        setTimeout(() => {
          if (advanceRevision !== slideRevisionRef.current) return;
          if (captionAdvanceInFlightRef.current === key) {
            captionAdvanceInFlightRef.current = null;
          }
        }, 0);

        const slide = slides[slideIndex]
        const caps = slide ? captions[slide.id] || [] : []
        const audio = audioRef.current

    if (!caps.length) return

    const last = caps.length - 1
      if (currentCaptionIndex < last) {
        if (shouldAutoPlayRef.current && !isPausedRef.current && audio) {
          requestPause();
          const scheduledRevision = advanceRevision;
          setTimeout(() => {
            if (scheduledRevision !== slideRevisionRef.current) return;
            handleCaptionComplete();
          }, SLIDE_DELAY_MS);
          return;
        }

        setCurrentCaptionIndex(i => i + 1);

        if (shouldAutoPlayRef.current && !isPausedRef.current && audio) {
          audio.play().catch(() => {});
        }

        return;
      }

      // no more caption – allow Continue button
      setCanProceed(true);

      if (!isFinalSlideOfModule) {
        if (shouldAutoPlayRef.current && !cancelAutoplay.current) {
          delayedGoNext();     // delayed slide advance
        } 
      }

  }, [
    captions,
    slides,
    slideIndex,
    currentCaptionIndex,
    goNext
  ])

  const SLIDE_DELAY_MS = 1200; // adjust delay

  function delayedGoNext() {
    autoPausedRef.current = true;
    requestPause();

    setTimeout(() => {
      autoPausedRef.current = false;
   
   // allow audio buffer to reset before resuming playback
    requestAnimationFrame(() => {
      queueMicrotask(() => {
        if (!audioRef.current) return
        requestPlay()
      })
    })
    goNext()

    }, SLIDE_DELAY_MS);
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

    const audio = audioRef.current

    // ensure fresh refs
    const isActuallyPlaying =
      audio &&
      !audio.paused &&
      audio.currentTime > 0 &&
      !audio.ended

    if (isActuallyPlaying) {
      shouldAutoPlayRef.current = false
      cancelAutoplay.current = true
      requestPause()
      return
    }


    shouldAutoPlayRef.current = true
      setIsPaused(false)
      isPausedRef.current = false

      // resume playback cleanly (prevents click/pop artifacts)
      requestAnimationFrame(() => {
        queueMicrotask(() => {
          if (!audioRef.current) return
          requestPlay()
        })
      })
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
      ${(isPausedRef.current && !autoPausedRef.current)
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

      <audio
        ref={audioRef}
        preload="auto"
        controls={false}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime
          // Patch 3: advance when audio actually ends
          if (audioRef.current?.ended) {
            const advanceRevision = slideRevisionRef.current
            const keyEnd = `${advanceRevision}:${slideIndex}:${currentCaptionIndex}`
            if (captionAdvanceInFlightRef.current !== keyEnd) {
              captionAdvanceInFlightRef.current = keyEnd
              setTimeout(() => {
                if (advanceRevision !== slideRevisionRef.current) return
                if (captionAdvanceInFlightRef.current === keyEnd) {
                  captionAdvanceInFlightRef.current = null
                }
                handleCaptionComplete()
              }, 0)
            }
            return
          }

          setAudioTime(t)
          if (!isPausedRef.current) {
            if (lastTimeRef.current === t) {
              stalledCounterRef.current++
            } else {
              stalledCounterRef.current = 0
            }

            lastTimeRef.current = t

            if (
              stalledCounterRef.current > 6 &&
              !scrubActive.current &&
              contentReady &&
              pendingSeekRef.current === null &&
              !seekCommitInFlightRef.current &&
              captionAdvanceInFlightRef.current === null
            ) {
              stalledCounterRef.current = 0
              const advanceRevision = slideRevisionRef.current
              const key = `${advanceRevision}:${slideIndex}:${currentCaptionIndex}`;
              if (captionAdvanceInFlightRef.current === key) return;
              captionAdvanceInFlightRef.current = key;
              setTimeout(() => {
                if (advanceRevision !== slideRevisionRef.current) return
                if (captionAdvanceInFlightRef.current === key) {
                  captionAdvanceInFlightRef.current = null;
                }
                handleCaptionComplete();
              }, 0);
            }
          }

          const slideK = slides[slideIndex]
          if (!slideK) return

          const capsK = captions[slideK.id] || []
          const active = capsK[currentCaptionIndex]
          if (!active) return

          const timingWords = tokenizeForTiming(active.caption)
          const timings = computeWordTimings(active.seconds ?? 0, timingWords)
          const map = mapTimingIndexToDisplayIndex(
            timingWords,
            tokenizeCaption(active.caption)
          )

          const shifted = t + 0.08
          let wi = timings.findIndex(w => shifted < w.end)
          if (wi < 0) wi = timings.length - 1
          const computedWordIndex = map[wi] ?? 0
          setCurrentWordIndex(computedWordIndex)

          const duration = active.seconds ?? 0
          // normalize audio duration to avoid drift underruns
          const rawDur = audioRef.current?.duration
          const effectiveDuration = Math.max(duration, rawDur || duration)

          const drift = 0.95
          const driftGuardSeconds = 0.95
          const driftReady =
            effectiveDuration > 0 &&
            audioDuration > 0 &&
            t > driftGuardSeconds

          if (slideAdvanceTimeoutRef.current !== null) return

          const remaining = effectiveDuration - t
          
          if (
              driftReady &&
              (
                remaining <= drift &&
                wi >= timings.length - 1 &&
                t >= effectiveDuration - 0.15
              ) &&
              !scrubActive.current &&
              contentReady &&
              pendingSeekRef.current === null &&
              !seekCommitInFlightRef.current &&
              captionAdvanceInFlightRef.current === null
            ) {

            const advanceRevision = slideRevisionRef.current
            const scheduledSlide = slideIndex
            const scheduledCaption = currentCaptionIndex
            slideAdvanceTimeoutRef.current = window.setTimeout(() => {
              if (advanceRevision !== slideRevisionRef.current) {
                slideAdvanceTimeoutRef.current = null
                return
              }
              if (
                scheduledSlide !== slideIndex ||
                scheduledCaption !== currentCaptionIndex
              ) {
                slideAdvanceTimeoutRef.current = null
                return
              }
              slideAdvanceTimeoutRef.current = null

              if (scrubActive.current) return
              if (!contentReady) return
              if (pendingSeekRef.current !== null) return
              if (seekCommitInFlightRef.current) return

              const key = `${advanceRevision}:${slideIndex}:${currentCaptionIndex}`
              if (captionAdvanceInFlightRef.current === key) return
              captionAdvanceInFlightRef.current = key
              setTimeout(() => {
                if (advanceRevision !== slideRevisionRef.current) return
                if (captionAdvanceInFlightRef.current === key) {
                  captionAdvanceInFlightRef.current = null
                }
                handleCaptionComplete()
              }, 0)

              const activeSlide = slides[slideIndex]
              if (!activeSlide) return

              const caps = captions[activeSlide.id] || []
              if (!caps.length) return

              if (currentCaptionIndex < caps.length) {
                return
              }
            }, 220)
          }

          }}
            
        onLoadedMetadata={(e) => {
          setAudioDuration(e.currentTarget.duration);
          if (scrubActive.current) return;
          const pendingSeek = appliedSeekTargetRef.current;
          const activeSlide = slides[slideIndex];

          if (
            pendingSeek &&
            activeSlide &&
            pendingSeek.slideId === activeSlide.id &&
            currentCaptionIndex === pendingSeek.captionIndex
          ) {
            let seekTo = Math.min(
              pendingSeek.captionOffset,
              e.currentTarget.duration || pendingSeek.captionOffset
            );
            seekTo = Math.min(seekTo, allowedSeekSecondsRef.current);
            e.currentTarget.currentTime = seekTo;
            appliedSeekTargetRef.current = null;
            seekCommitInFlightRef.current = false;
            pendingSeekRef.current = null;
            if (!resumeAfterScrubRef.current) {
              cancelAutoplay.current = true;
              shouldAutoPlayRef.current = false;
              setIsPaused(true);
              isPausedRef.current = true;
            }
            return;
          }

          const voiceSwitch = voiceSwitchRef.current;
          if (voiceSwitch) {
            let seekTo = Math.min(
              voiceSwitch.resumeTime,
              e.currentTarget.duration || voiceSwitch.resumeTime
            );
            seekTo = Math.min(seekTo, allowedSeekSecondsRef.current);
            e.currentTarget.currentTime = seekTo;
            if (voiceSwitch.wasPlaying) {
              cancelAutoplay.current = false;
              if (e.currentTarget.volume === 0) {
                e.currentTarget.volume = targetVolumeRef.current;
              }
              e.currentTarget.play().catch(() => {});
              isPausedRef.current = false;
              setIsPaused(false);
            } else {
              isPausedRef.current = true;
              setIsPaused(true);
            }
            voiceSwitchRef.current = null;
          }
        }}
            />

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
            resetAudioElement()
            setIsPaused(!shouldAutoPlayRef.current)
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

      {/* CONTROLS – volume + CC */}
      <div
        className="fixed bottom-[160px] left-0 right-0 z-[200] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
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

            {/* VOLUME */}
            <div
              className="
                h-10 px-4
                flex items-center gap-2
                rounded-full
              "
            >
             <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
                className="cursor-pointer translate-x-[20px]"
              >
                {muted ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-white drop-shadow-sm"
                  >
                    <path d="M5 9v6h4l5 4V5L9 9H5z" />
                    <line x1="18" y1="6" x2="22" y2="10" stroke="white" strokeWidth="2"/>
                    <line x1="22" y1="6" x2="18" y2="10" stroke="white" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-white drop-shadow-sm"
                  >
                    <path d="M5 9v6h4l5 4V5L9 9H5z" />
                    <path d="M15 8a4 4 0 010 8" stroke="white" strokeWidth="2" fill="none"/>
                    <path d="M17 6a6 6 0 010 12" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
              <div className="relative w-24">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="vol-range w-24 shadow-sm -translate-y-[4px] translate-x-[20px] shadow-black/10 relative z-10"
                />
              </div>
            </div>

            {/* CC + voice */}
            <div className="relative z-50">

              <select
                value={voice}
                onChange={(e) => switchVoice(e.target.value)}
                className="
                  voice-hidden
                  h-10 pl-8 pr-10
                  rounded-full
                  text-xs
                  outline-none
                  cursor-pointer
                  appearance-none
                  pl-[20px]
                  w-20
                "
              >
                {VOICES.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.label}
                  </option>
                ))}
              </select>

              <div
                className="
                  pointer-events-none absolute inset-0 flex items-center
                  pl-2 text-white text-xs font-medium
                  z-10
                "
              >
                <span
                  className="
                    inline-flex items-center justify-center
                    border-2 border-white
                    bg-black/60
                    px-1 py-[2px] mx-1
                    text-xs leading-none
                    rounded-sm
                    font-bold
                  "
                >
                  CC
                </span>
                {voiceLabel}
              </div>

              <svg
                className="
                  pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 translate-x-[30px]
                  w-4 h-4 fill-white opacity-80
                  z-[999]
                "
                viewBox="0 0 24 24"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>

            </div>

          </div>
        </div>
      </div>

    </div>
  </div>


  {/* unchanged footer nav */}
  <FooterNav
    goPrev={goPrev}
    goNext={goNext}
    slideIndex={slideIndex}
    totalSlides={totalSlides}
    audioTime={audioTime}
    audioDuration={audioDuration}
    captionText={captionText}
    currentModuleIndex={currentModuleIndex}
    currentLessonIndex={currentLessonIndex}
    captions={captions}
    slides={slides}
    currentCaptionIndex={currentCaptionIndex}
    currentWordIndex={currentWordIndex}
  />
    </div>
    );
  }

  // safe numeric display used by FooterNav + Timeline
  function safeTime(v: any) {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(1) : "0.0";
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
    const [loaded, setLoaded] = useState(false);
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

    useEffect(() => {
      setLoaded(false);
      setResolvedSrc(null);

      if (!currentImage) return;

      const img = new Image();
      img.onload = () => {
        setResolvedSrc(currentImage);
        setLoaded(true);
      };
      img.src = currentImage;
    }, [currentImage]);

    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
        {/* SKELETON / PLACEHOLDER */}
        <div
          className={`
            absolute inset-0
            transition-opacity duration-300
            ${loaded ? "opacity-0" : "opacity-100"}
          `}
          style={{
            background:
              "linear-gradient(to bottom, #909090ff 0%, #ffffffff 45%, #ffffff 100%)",
          }}
        />

        {/* IMAGE — rendered ONLY after load */}
        {resolvedSrc && (
          <img
            src={resolvedSrc}
            draggable={false}
            decoding="async"
            className="
              absolute inset-0
              w-full h-full
              object-cover object-center
              transition-opacity duration-500
              opacity-100
            "
          />
        )}
      </div>
    );
  }

  /* -----------------------------------------------------------
    FOOTER NAV  (Module → Lesson → Slide/Question)
  ----------------------------------------------------------- */
  function FooterNav({
    goPrev,
    goNext,
    slideIndex,
    totalSlides,
    audioTime,
    audioDuration,
    captionText,
    currentModuleIndex,
    currentLessonIndex,
    captions,
    slides,
    currentCaptionIndex,
    currentWordIndex
  }: any) {

    function statusText() {
      const at = Number(audioTime ?? 0).toFixed(1);
      const ad = Number(audioDuration ?? 0).toFixed(1);

      return `Module ${currentModuleIndex + 1} → Lesson ${
        currentLessonIndex + 1
      } | Slide ${slideIndex + 1} of ${totalSlides} | ${at}s / ${ad}s`;
    }

    const currentSlide = slides?.[slideIndex] || null;

    return (
      <div className="fixed bottom-[0px] left-0 right-0 bg-white border-t shadow-inner h-[150px] z-50">
        <div className="h-full max-w-6xl mx-auto px-6 flex items-start justify-between relative pt-4 text-[#001f40]">

          {/* KARAOKE CAPTIONS */}
          <KaraokeCaption
            captions={captions}
            currentSlide={currentSlide}
            currentWordIndex={currentWordIndex}
          />

        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------
    KARAOKE CAPTION RENDERER
  ----------------------------------------------------------- */
  function KaraokeCaption({
    captions,
    currentSlide,
    currentWordIndex
  }: any) {

    if (!currentSlide) return null;

    const fullText = (captions[currentSlide.id] || [])
      .map((c: any) => c.caption.trim())
      .join(" ")
      .replace(/\s+/g, " ");

    const words = tokenizeCaption(fullText);

    return (
      <div
        className="
          text-xl leading-[32px]
          whitespace-normal
          text-center
          text-[#001f40]
          w-full px-5 mx-auto
        "
        style={{
          minWidth: 0,          
          maxWidth: "100%",
          overflow: "visible",
          wordBreak: "normal",
          overflowWrap: "break-word",
          hyphens: "none"
        }}
      >
        {words.map((word: string, wi: number) => (
  <span
    key={wi}
    style={{ display: "inline" }}
    className={wi === currentWordIndex ? "text-[#ca5608]" : "opacity-80"}
  >
    {word + " "}
  </span>
        ))}
      </div>
    );
  }
