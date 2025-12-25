"use client";

import Image from "next/image";
import PublicHeader from "@/app/(public)/_PublicHeader2";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import CourseTimeline from "@/components/YT-Timeline";
import { useRouter } from "next/navigation";
import VerifyPhoneModal from "@/components/VerifyPhoneModal"
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

  export default function TimelineHomeClient() {
    const playedSecondsRef = useRef(0);
    const scrubActive = useRef(false);
    const scrubSeekSecondsRef = useRef<number | null>(null);

    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [userId, setUserId] = useState("")
    
    // module and lesson tracking
    const [slides, setSlides] = useState<SlideRow[]>([]);
    const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});
    const [slideIndex, setSlideIndex] = useState(0);

    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [courseLessons, setCourseLessons] = useState<LessonRow[]>([]);
    const [courseSlides, setCourseSlides] = useState<CourseSlideRow[]>([]);
    const [courseCaptions, setCourseCaptions] = useState<
      Record<string, CaptionTimingRow[]>
    >({});
    // final actions
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
    const isHoveringTimelineRef = useRef(false);
    const scrubActiveRef = scrubActive;
    const [isPaused, setIsPaused] = useState(true);
    const [showTimelineHint, setShowTimelineHint] = useState(true);
    const timelineHintDismissedRef = useRef(false);

    const timelineAutoHideTimerRef = useRef<number | null>(null)
    const [promoStickyVisible, setPromoStickyVisible] = useState(false)
    // sticky promo logic for terminal popups
    const [promoSticky, setPromoSticky] = useState(false);
    const promoDismissedRef = useRef(false);

    // NAV STATE
      const clearTimelineAutoHideTimer = useCallback(() => {
        if (timelineAutoHideTimerRef.current !== null) {
          clearTimeout(timelineAutoHideTimerRef.current);
          timelineAutoHideTimerRef.current = null;
        }
      }, []);

      const scheduleTimelineAutoHide = useCallback(() => {
        clearTimelineAutoHideTimer();
        timelineAutoHideTimerRef.current = window.setTimeout(() => {
          if (scrubActiveRef.current) return;
          if (isHoveringTimelineRef.current) return;
          setShowTimeline(false);
          tooltipVisibleRef.current = false;
        }, 3000);
      }, [clearTimelineAutoHideTimer, scrubActiveRef, isHoveringTimelineRef]);

      function revealTimelineFor3s() {
        setShowTimeline(true);
        setPromoSticky(true);
        setPromoStickyVisible(true);
        scheduleTimelineAutoHide();
      }

      function handlePromoClose() {
        promoDismissedRef.current = true;

        setPromoSticky(false);
        setPromoStickyVisible(false);

        // force return to normal hide mode
        isHoveringTimelineRef.current = false;
        scrubActiveRef.current = false;

        // immediately begin auto-hide countdown
        clearTimelineAutoHideTimer();
        scheduleTimelineAutoHide();
      }

      useEffect(() => {
        return () => {
          if (hoverTooltipRafRef.current !== null) {
            cancelAnimationFrame(hoverTooltipRafRef.current);
            hoverTooltipRafRef.current = null;
          }
        };
      }, []);


    const dismissTimelineHint = useCallback(() => {
      if (timelineHintDismissedRef.current) return;
      timelineHintDismissedRef.current = true;
      setShowTimelineHint(false);
    }, []);


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
    // ------------------------------------
    // GLOBAL total course time for timeline
    // ------------------------------------
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
      scheduleTimelineAutoHide();
      const secs = scrubSeekSecondsRef.current;
      scrubSeekSecondsRef.current = null;
      if (secs === null) return;
    }, [
      clampTargetToModuleEnd,
      modules.length,
      resolveCourseTime,
      scheduleTimelineAutoHide,
    ]);

const scheduleTooltipUpdate = useCallback(() => {
  if (hoverTooltipRafRef.current !== null) return;

  hoverTooltipRafRef.current = requestAnimationFrame(() => {
    hoverTooltipRafRef.current = null;

    // timeline may have auto-hidden between frames
    if (!showTimeline) return;

    const tooltip = hoverTooltipRef.current;
    if (!tooltip) return;

    const { imgUrl, text, timeLabel } = previewDataRef.current;

    // position + visibility
    tooltip.style.left = `${previewXRef.current}px`;
    tooltip.style.opacity = tooltipVisibleRef.current ? "1" : "0";
    tooltip.style.pointerEvents = tooltipVisibleRef.current ? "auto" : "none";

    // SAFE element refs
    const imgEl = hoverTooltipImageRef.current;
    const placeholderEl = hoverTooltipPlaceholderRef.current;

      if (imgEl) {
      // clear any previous onload handler to avoid late firing
      imgEl.onload = null;

      if (imgUrl) {
        imgEl.src = imgUrl;
        imgEl.style.display = "block";

        imgEl.onload = () => {
          if (placeholderEl) {
            placeholderEl.style.display = "none";
          }
        };
      } else {
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
      }
    }


    // placeholder
    if (placeholderEl) {
      placeholderEl.style.display = imgUrl ? "none" : "block";
    }

    // text
    if (hoverTooltipTextRef.current) {
      hoverTooltipTextRef.current.textContent = text ?? "";
    }

    // time
    if (hoverTooltipTimeRef.current) {
      hoverTooltipTimeRef.current.textContent = timeLabel ?? "";
      hoverTooltipTimeRef.current.style.display = timeLabel ? "block" : "none";
    }
  });
}, [showTimeline]);

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
      clearTimelineAutoHideTimer();
      setShowTimeline(true);
      setPromoSticky(true);
      setPromoStickyVisible(true);
      setIsPaused(true);
      dismissTimelineHint();
    }, [clearTimelineAutoHideTimer]);

  // -------------------------------------------------------------
  // REQUIRED POPUP LOGIN HANDLER
  // -------------------------------------------------------------

    useEffect(() => {
  async function handlePopupMessage(event: MessageEvent) {
    if (!event.origin.startsWith(window.location.origin)) return;
    if (event.data?.type !== "authSuccess") return;

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    await supabase.auth.updateUser({
      data: { session_2fa_verified: false },
    });

    setUserId(user.id);
    setShowVerifyModal(true);
  }

  window.addEventListener("message", handlePopupMessage);
  return () => window.removeEventListener("message", handlePopupMessage);
}, []);

// -------------------------------------------------------------
//  GOOGLE OAUTH HANDLER
// -------------------------------------------------------------

async function handleGoogleSignup() {
  try {
    const redirect = `${window.location.origin}/auth/callback`;

    const res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect, skipBrowserRedirect: true },
    });

    if (res?.data?.url) {
      window.open(
        res.data.url,
        "GoogleLogin",
        `width=520,height=650,top=${window.screenY + 80},left=${window.screenX + 120}`
      );
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
  } catch (err) {
    console.error("Google Sign-Up Error:", err);
  }
}
  // -------------------------------------------------------------
  // AUTO LOGIN PUSH TO COURSE
  // -------------------------------------------------------------

    useEffect(() => {
      async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace("/course");  // or push()
        }
      }
      checkSession();
    }, [router]);


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

    // homepage simplified elapsedCourseSeconds
    const elapsedCourseSeconds = elapsedSeconds

    // update refs minimally (required for timeline + loader exit)
    useEffect(() => {
      allowedSeekSecondsRef.current = elapsedCourseSeconds
      playedSecondsRef.current = elapsedCourseSeconds
    }, [elapsedCourseSeconds])

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

      // BUILD THUMBNAIL SIGNED URLs EARLY – preload ALL thumbs at once
      if (slideRows?.length) {
        const paths = slideRows
          .map(s => s.image_path)
          .filter(Boolean) as string[];

        const { data } = await supabase.storage
          .from("uploads")
          .createSignedUrls(paths, 3600 * 24); // 24h cache

        data?.forEach((entry, index) => {
          const slide = slideRows[index];
          if (entry?.signedUrl) {
            thumbCacheRef.current.set(slide.id, entry.signedUrl);
          }
        });

        // warm browser decode now so timeline hover is instant
        thumbCacheRef.current.forEach(url => {
          const img = new window.Image() as HTMLImageElement;
          (img as any).decoding = "async";
          img.src = url;
          img.decode?.().catch(() => {});
        });

      }


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


  /* ------------------------------------------------------
    LOAD SEQUENCE
  ------------------------------------------------------ */
useEffect(() => {
  loadModules();
}, []);

useEffect(() => {
  loadCourseStructure();
}, []);

  /* ------------------------------------------------------
    AUTO HIDE TIMELINE
  ------------------------------------------------------ */

useEffect(() => {
  if (!showTimeline) return;
  scheduleTimelineAutoHide();
  return () => {
    clearTimelineAutoHideTimer();
  };
}, [clearTimelineAutoHideTimer, scheduleTimelineAutoHide, showTimeline]);

useEffect(() => {
  if (showTimeline) {
    dismissTimelineHint();
  }
}, [dismissTimelineHint, showTimeline]);

useEffect(() => {
  if (promoStickyVisible) {
    dismissTimelineHint();
  }
}, [dismissTimelineHint, promoStickyVisible]);

useEffect(() => {
  return () => {
    clearTimelineAutoHideTimer();
  };
}, [clearTimelineAutoHideTimer]);

useEffect(() => {
  function handleDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;

    // skip if clicking inside timeline or terminal promo box
    if (
      t.closest('#timeline-region') ||
      t.closest('.promo-box')
    ) return;

    if (scrubActiveRef.current) return;
    if (isHoveringTimelineRef.current) return;

    setShowTimeline(false);
    tooltipVisibleRef.current = false;
  }

  document.addEventListener('mousedown', handleDocClick);

  return () => {
    document.removeEventListener('mousedown', handleDocClick);
  };
}, [promoSticky, promoStickyVisible]);


  //--------------------------------------------------------------------
  // SAFE DISPLAY VALUES FOR CURRENT UI
  //--------------------------------------------------------------------
  const currentSlide = slides[slideIndex] || null;

  const currentImage = currentSlide
    ? resolveImage(currentSlide.image_path)
    : null;


  function goToModule(i: number) {
    if (scrubActive.current) return;

    setCurrentModuleIndex(i);
    setSlideIndex(0);
    setIsPaused(true);

    // No DB gating and no reload URL push needed on homepage
  }

  // ------------------------------
  // HYDRATION
  // ------------------------------

    useEffect(() => {
      async function checkSession() {
        const { data } = await supabase.auth.getSession();
        if (data?.session) return; // already logged in, continue course
      }
      checkSession();
    }, []);


      const isReady =
      modules.length > 0 &&
      courseSlides.length > 0 &&
      Object.keys(courseCaptions).length > 0;

    if (!isReady) {
      return <Loader />;
    }


  // AFTER initial hydration → do NOT block the UI with the loader

function togglePlay() {
  revealTimelineFor3s()
  setIsPaused((prev) => !prev)
}

    return (
    <div
  className="
    relative min-h-screen w-screen
    flex flex-col overflow-hidden
    bg-cover bg-center bg-no-repeat
  "
  style={{
    backgroundImage: "url('/drone-car.jpg')",
  }}
>
        <div className="absolute inset-0 bg-[#001f40]/10" />
        <PublicHeader />
          <section className="relative flex-1 flex 
          items-center justify-center overflow-auto 
          px-4 sm:px-6 pt-6 sm:pt-8 pb-20 sm:pb-24">
            <div
              className="
                flex flex-col items-center text-center
                min-h-[min(42vh,400px)]
                max-w-[min(96vw,446px)] sm:max-w-md w-full
                justify-center
                bg-[#001f40]/20
                border border-white/40
                rounded-2xl
                p-5 sm:p-8 md:p-10
                shadow-[0_12px_40px_rgba(0,31,64,0.25)]
                backdrop-blur-md
                -mt-[80px] sm:-mt-[120px] md:-mt-[160px]
              "
            >
              <h1 className="text-white text-[1.45rem] sm:text-[1.65rem] md:text-[1.75rem] leading-tight pb-4 sm:pb-6">
                Florida 6-Hour Driver Education Traffic Safety Course
              </h1>

              <div className="relative group inline-flex">
                <button
                  onClick={handleGoogleSignup}
                  className="
                    relative z-10
                    flex items-center justify-center
                    border border-[#001f40]/60 bg-white text-[#001f40]
                    text-[16px] sm:text-[18px] md:text-[21px]
                    font-semibold
                    px-5 sm:px-6 py-2.5 sm:py-3
                    rounded-xl
                    cursor-pointer
                    transition-all duration-200
                    hover:shadow-[0_10px_24px_rgba(0,31,64,0.18)]
                    hover:-translate-y-0.5
                  "
                >
                  <Image
                    src="/Google-Icon.png"
                    alt="Google Icon"
                    width={22}
                    height={22}
                    className="mr-3 sm:w-[26px] sm:h-[26px]"
                  />
                  Continue with Google
                </button>

                {/* Hover ring */}
                <span className="google-hover-ring" />
              </div>

              <p className="text-[13px] sm:text-[15px] text-[#fff]/90 text-center mt-4 sm:mt-5">
                Don’t have a Google account?{" "}
                <a
                  href="https://accounts.google.com/signup"
                  target="_blank"
                  className="text-[#ff7c24] underline underline-offset-4"
                >
                  Create one
                </a>.
              </p>
            </div>
          </section>
    {showVerifyModal && (
      <VerifyPhoneModal
        userId={userId}
        onComplete={() => {
          setShowVerifyModal(false);
          router.replace("/course");
        }}
      />
    )}


    {showTimeline && (
      <div
        ref={hoverTooltipRef}
        className="promo-box fixed z-[999999] pointer-events-none transition-opacity duration-60"
        style={{
          left: 0,
          bottom: 115,
          opacity: 0,
        }}
      >
          <div className="relative w-[375px] h-[250px] rounded-lg backdrop-blur-md bg-white/60 text-[#001f40] shadow-md overflow-hidden flex flex-col">
            <div
              ref={hoverTooltipTimeRef}
              className="absolute top-2 left-2 px-2 py-[2px] rounded-full backdrop-blur-md bg-white/60 text-[#001f40] text-[11px] font-medium pointer-events-none"
              style={{ display: "none" }}
            />

          <img
            ref={hoverTooltipImageRef}
            alt=""
            className="h-[165px] w-full object-cover"
            style={{ display: "none" }}
          />
       <div
          ref={hoverTooltipPlaceholderRef}
          className="
            h-[165px] w-full
            rounded-t-xl
            flex items-center justify-center
            bg-white/10
          "
        >
          <div className="w-6 h-6 border-2 border-[#001f40]/30 border-t-[#001f40] rounded-full animate-spin" />
        </div>
          <div
            ref={hoverTooltipTextRef}
            className="px-3 py-2 text-[13px] leading-snug line-clamp-3 flex-1"
          />
        </div>
      </div>
    )}
    {showTimelineHint && (
      <TimelineHoverHint />
    )}
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-0 pb-[0px]"
      onMouseEnter={() => {
        revealTimelineFor3s();
      }}
      onMouseLeave={() => {
        if (scrubActiveRef.current) return;
        scheduleTimelineAutoHide();
      }}
    >
      <div
        className={`
          transition-all duration-300 ease-out
          ${
            showTimeline
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }
        `}
      >

{/* Timeline Distance from Bottom */}
        <div
          id="timeline-region"
          className="fixed bottom-[15px] left-0 right-0 z-40 min-h-[5rem]"
          onMouseEnter={() => {
            isHoveringTimelineRef.current = true;
            setShowTimeline(true);
            setPromoSticky(true);
            setPromoStickyVisible(true);
            clearTimelineAutoHideTimer();
          }}
          onMouseLeave={() => {
            isHoveringTimelineRef.current = false;
            scheduleTimelineAutoHide();
          }}
        >
          <CourseTimeline
            key={timelineVersion}
            modules={modules}
            currentModuleIndex={currentModuleIndex}
            goToModule={goToModule}
            allowedSeekSecondsRef={allowedSeekSecondsRef}
            playedSecondsRef={playedSecondsRef}
            togglePlay={togglePlay}
            isPaused={isPaused}
            currentSeconds={elapsedSeconds}
            totalSeconds={totalCourseSeconds}
            elapsedCourseSeconds={elapsedCourseSeconds}
            moduleDurations={moduleDurationSeconds}
            totalCourseSeconds={totalCourseSeconds}
            onScrub={handleScrub}
            onScrubStart={handleScrubStart}
            onScrubEnd={handleScrubEnd}
            onHoverResolve={handleHoverResolve}
            onHoverEnd={handleHoverEnd}
            timelineContainerRef={timelineHoverRef}
            thumbCacheRef={thumbCacheRef}
            promoOffsetBottom={115}
            showTimeline={showTimeline}
            setShowTimeline={setShowTimeline}
            promoVisible={promoStickyVisible}
            promoDismissedRef={promoDismissedRef}
            onTimelineHover={() => {
              setPromoSticky(true);
              setPromoStickyVisible(true);
            }}
            onTerminalHover={() => {
              setPromoSticky(true);
              setPromoStickyVisible(true);
            }}
            onPromoClose={handlePromoClose}
          />
        </div>
<div className="absolute bottom-[32px] left-0 right-0 z-[200] pointer-events-none">
  <div className="md:max-w-6xl md:mx-auto px-4">
    <div className="flex items-center gap-3 text-[#001f40] translate-x-[35px]">
      <div
        className="
          h-8 px-3
          flex items-center
          bg-black/70
          rounded-full
          text-white
          text-xs
          tabular-nums
          whitespace-nowrap
        "
      >
        {formatTime(elapsedCourseSeconds)} / {formatTime(totalCourseSeconds)}
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

    const img = new window.Image();
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

function TimelineHoverHint() {
  return (
    <div
      className="fixed left-1/2 bottom-[67px] z-30 -translate-x-1/2 pointer-events-none"
      aria-hidden="true"
    >
      <div className="w-6 h-6 timeline-hint-orb" />
            <style jsx global>{`
      .timeline-hint-orb {
        position: relative;
        border-radius: 9999px;
        background: #ffffff71;
        box-shadow: 0 0 6px rgba(0, 31, 64, 0.6);
        animation:
          timelineHintFloat 5.5s ease-in-out infinite;
      }

      /* STRONG RING */
      .timeline-hint-orb::after {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 9999px;
        border: 2px solid rgba(0, 31, 64, 0.85);
        animation: timelineHintRing 3.8s ease-in-out infinite;
      }

      @keyframes timelineHintRing {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        50% {
          transform: scale(1.8);
          opacity: 1;
        }
        100% {
          transform: scale(0.8);
          opacity: 0;
        }
      }

      /* -------------------------------------------------
        GOOGLE BUTTON HOVER RING (FASTER)
      -------------------------------------------------- */

      .google-hover-ring {
        pointer-events: none;
        position: absolute;
        inset: -6px;
        border-radius: 14px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        opacity: 0;
        transform: scale(0.7);
        z-index: 20; 
      }

      .group:hover .google-hover-ring {
        animation: googleRingPulse .5s ease-out;
        opacity: 1;
      }

      @keyframes googleRingPulse {
        0% {
          transform: scale(0.92);
          opacity: 0;
        }
        40% {
          transform: scale(1.05);
          opacity: .2;
        }
        100% {
          transform: scale(1.18);
          opacity: 0;
        }
      }
      `}</style>

    </div>
  );
}
