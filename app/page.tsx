"use client";
export const dynamic = "force-dynamic";

import PublicHeader from "@/app/(public)/_PublicHeader";
import TopProgressBar from "@/components/TopProgressBar";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import VerifyPhoneModal from "@/components/VerifyPhoneModal";
import CourseTimeline from "@/components/YT-Timeline";

type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

type SlideRow = {
  id: string;
  module_id: string;
  image_path: string | null;
  order_index: number;
};

type HoverPreviewData = {
  imgUrl: string | null;
  text: string;
  timeLabel: string;
};

const DEFAULT_SLIDE_SECONDS = 60;

function formatHoverTime(seconds: number) {
  if (!isFinite(seconds)) return "00:00:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function SignUpPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [vw, setVw] = useState(0);
  const [showPromoBox, setShowPromoBox] = useState(true);
  const [mobilePromoOpen, setMobilePromoOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(15);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const [lastPromoX, setLastPromoX] = useState<number | null>(null);
  const finalSegmentRef = useRef<HTMLDivElement>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isPaused, setIsPaused] = useState(true);
  const allowedSeekSecondsRef = useRef(Infinity);
  const playedSecondsRef = useRef(0);
  const timelineHoverRef = useRef<HTMLDivElement | null>(null);
  const thumbCacheRef = useRef(new Map<string, string>());
  const hoverTooltipRafRef = useRef<number | null>(null);
  const previewXRef = useRef(0);
  const previewDataRef = useRef<HoverPreviewData>({
    imgUrl: null,
    text: "",
    timeLabel: "",
  });
  const tooltipVisibleRef = useRef(false);
  const hoverTooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTooltipImageRef = useRef<HTMLImageElement | null>(null);
  const hoverTooltipPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const hoverTooltipTextRef = useRef<HTMLDivElement | null>(null);
  const hoverTooltipTimeRef = useRef<HTMLDivElement | null>(null);
  // STATE mirror for tooltip preview (forces render)
  const [previewState, setPreviewState] = useState({
    imgUrl: null as string | null,
    text: "",
    timeLabel: "",
    leftPx: 0,
    visible: false,
  });

  const togglePlay = () => setIsPaused((p) => !p);
  const goToModule = () => router.push("/course");

  const slidesByModule = useMemo(() => {
    const map = new Map<string, SlideRow[]>();
    slides
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((slide) => {
        const list = map.get(slide.module_id) ?? [];
        list.push(slide);
        map.set(slide.module_id, list);
      });
    return map;
  }, [slides]);

  const firstSlidesByModule = useMemo(() => {
    const map = new Map<string, SlideRow>();
    modules.forEach((module) => {
      const firstSlide = slidesByModule.get(module.id)?.[0];
      if (firstSlide) map.set(module.id, firstSlide);
    });
    return map;
  }, [modules, slides]);

  const moduleDurations = useMemo(
    () =>
      modules.map((module) => {
        const count = slidesByModule.get(module.id)?.length ?? 0;
        return Math.max(1, count) * DEFAULT_SLIDE_SECONDS;
      }),
    [modules, slidesByModule]
  );

  const totalCourseSeconds = moduleDurations.reduce(
    (sum, duration) => sum + duration,
    0
  );

  const scheduleTooltipUpdate = useCallback(() => {
    if (hoverTooltipRafRef.current !== null) return;
    hoverTooltipRafRef.current = requestAnimationFrame(() => {
      hoverTooltipRafRef.current = null;
      const tooltip = hoverTooltipRef.current;
      if (!tooltip) return;

      const { imgUrl, text, timeLabel } = previewDataRef.current;
      tooltip.style.left = `${previewXRef.current}px`;

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
        hoverTooltipTimeRef.current.style.display = timeLabel
          ? "block"
          : "none";
      }
    });
  }, []);

  const handleHoverResolve = useCallback(
    (seconds: number, clientX: number) => {
      if (!modules.length) return;
      if (totalCourseSeconds <= 0) return;
      if (!timelineHoverRef.current) return;

      let remaining = Math.min(Math.max(seconds, 0), totalCourseSeconds);
      let moduleIndex = 0;

      for (let i = 0; i < moduleDurations.length; i++) {
        const duration = moduleDurations[i] ?? 0;
        if (remaining <= duration || i === moduleDurations.length - 1) {
          moduleIndex = i;
          break;
        }
        remaining -= duration;
      }

      const module = modules[moduleIndex];
      if (!module) return;

      const rect = timelineHoverRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const width = 375;
      const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : rect.right;
      const minBoundary = Math.max(0, rect.left);
      const maxViewportBoundary = Math.max(0, viewportWidth - width);
      const maxBoundary = Math.min(rect.right - width, maxViewportBoundary);
      const desired = clientX - width / 2;
      const leftPx = Math.min(Math.max(desired, minBoundary), maxBoundary);

      const slide = firstSlidesByModule.get(module.id);
      const imgUrl =
        slide?.image_path
          ? thumbCacheRef.current.get(slide.image_path.replace(/^\/+/, "")) ??
            null
          : null;
      const timeLabel = formatHoverTime(seconds);

      previewXRef.current = leftPx;
      previewDataRef.current = {
        imgUrl,
        text: module.title,
        timeLabel,
      };
      tooltipVisibleRef.current = true;
      scheduleTooltipUpdate();

      // NEW: force UI render update
      setPreviewState({
        imgUrl,
        text: module.title,
        timeLabel,
        leftPx,
        visible: true,
      });
    },
    [
      firstSlidesByModule,
      moduleDurations,
      modules,
      scheduleTooltipUpdate,
      totalCourseSeconds,
    ]
  );

  const handleHoverEnd = useCallback(() => {
    tooltipVisibleRef.current = false;
    scheduleTooltipUpdate();
    setPreviewState(prev => ({ ...prev, visible: false }));
  }, [scheduleTooltipUpdate]);


  /* ───────── CHECK IF LOGGED IN ───────── */
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace("/course");
    }
    checkSession();
  }, [router]);

  /* ───────── VIEWPORT DETECTION ───────── */
  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    setReady(true);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* STEP 2: On initial load, anchor promo popup above FINAL segment */
  useEffect(() => {
    if (!finalSegmentRef.current) return;
    if (!showPromoBox || vw < 768) return;

    const rect = finalSegmentRef.current.getBoundingClientRect();
    setLastPromoX(rect.left + rect.width / 2);
  }, [ready, vw, showPromoBox]);

  useEffect(() => {
    let cancelled = false;

    async function loadMinimalStructure() {
      const { data: moduleRows } = await supabase
        .from("modules")
        .select("id,title,sort_order")
        .order("sort_order");

      const { data: slideRows } = await supabase
        .from("lesson_slides")
        .select("id,module_id,image_path,order_index")
        .order("order_index", { ascending: true });

      if (cancelled) return;
      setModules(moduleRows ?? []);
      setSlides(slideRows ?? []);
    }

    loadMinimalStructure();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

async function preloadThumbs() {
  console.log("preloadThumbs invoked");
  console.log("modules:", modules.length);
  console.log("slides:", slides.length);
  if (!modules.length || !slides.length) return;

  const firstSlides = modules
    .map(m => firstSlidesByModule.get(m.id))
    .filter((s): s is SlideRow => Boolean(s?.image_path));

  const unresolved = firstSlides.filter(
    s => !thumbCacheRef.current.has(s.image_path!.replace(/^\/+/, ""))
  );

  console.log("unresolved count:", unresolved.length);
  console.log("unresolved items:", unresolved.map(u => u.image_path));

  if (!unresolved.length) return;

  const paths = unresolved.map(s => s.image_path!);

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrls(paths, 3600);

  console.log("signed result:", {data, error});

  if (error || !data) return;

  data.forEach((entry, idx) => {
    const slide = unresolved[idx];
    if (!slide || !entry.signedUrl) return;

    const path = slide.image_path!;
    const normalized = path.replace(/^\/+/, "");
    console.log("cache write:", { path, signedUrl: entry.signedUrl });

    thumbCacheRef.current.set(normalized, entry.signedUrl);

    requestAnimationFrame(() => {
      if (tooltipVisibleRef.current) scheduleTooltipUpdate();
    });
  });
}


    preloadThumbs();

    return () => {
      cancelled = true;
    };
  }, [firstSlidesByModule, modules, slides]);

  /* ───────── GOOGLE POPUP SIGN-IN ───────── */
  const handleGoogleSignup = async () => {
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
  };

  useEffect(() => {
    (window as any).thumbCache = thumbCacheRef.current
  },[])

  /* ───────── MOBILE PROMO CLOSE ON OUTSIDE TAP ───────── */
  useEffect(() => {
    function handleTouch(e: any) {
      if (mobileSheetRef.current && !mobileSheetRef.current.contains(e.target)) {
        setMobilePromoOpen(false);
      }
    }
    if (mobilePromoOpen) {
      document.addEventListener("mousedown", handleTouch);
      document.addEventListener("touchstart", handleTouch);
    }
    return () => {
      document.removeEventListener("mousedown", handleTouch);
      document.removeEventListener("touchstart", handleTouch);
    };
  }, [mobilePromoOpen]);

/* ───────── OAUTH POPUP LOGIN MESSAGE HANDLER ───────── */
useEffect(() => {
  async function handlePopupMessage(event: MessageEvent) {
    if (!event.origin.startsWith(window.location.origin)) return;
    if (event.data?.type !== "authSuccess") return;

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    // 🔑 ALWAYS reset session 2FA on login
    await supabase.auth.updateUser({
      data: { session_2fa_verified: false },
    });

    // Require OTP every login
    setUserId(user.id);
    setShowVerifyModal(true);
  }

  window.addEventListener("message", handlePopupMessage);
  return () => window.removeEventListener("message", handlePopupMessage);
}, []);

const totalSeconds = totalCourseSeconds;
const currentSeconds = 0;
const elapsedCourseSeconds = 0;
const onScrub = () => {};
const onScrubStart = () => {};
const onScrubEnd = () => {};

  /* ───────────────────────────────────────────────────────────── */
  return (
    <>
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "calc(100vh - 2px)", marginTop: "2px" }}>
      
      {/* ===== FIXED PROGRESS BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-[70] bg-gray-200 h-[8px] pointer-events-none">
        <TopProgressBar percent={progress} />
      </div>

      {/* ===== PUBLIC HEADER ===== */}
      <PublicHeader />

      {/* ===== HERO SIGN-UP BLOCK ===== */}
      <section className="flex-1 flex items-center justify-center overflow-auto pt-6">
        <div className="flex flex-col items-center text-center max-w-md w-full">
          <Image src="/logo.png" alt="Florida Permit Training" width={520} height={200} className="object-contain max-h-[180px] mb-10" priority />
          <button
            onClick={handleGoogleSignup}
            className="flex items-center justify-center border border-[#001f40] bg-white text-[#001f40] text-[22px] font-bold px-6 py-3 rounded-md cursor-pointer hover:shadow-lg transition-all"
          >
            <Image src="/Google-Icon.png" alt="Google Icon" width={26} height={26} className="mr-3" />
            Continue with Google
          </button>
          <p className="text-[15px] text-[#001f40] text-center mt-4">
            Don’t have a Google account?{" "}
            <a href="https://accounts.google.com/signup" target="_blank" className="text-[#ca5608] underline">
              Create one
            </a>.
          </p>
        </div>
      </section>
   
      {/* 2FA POPUP MODAL */}
      {showVerifyModal && (
        <VerifyPhoneModal
          userId={userId}
          onComplete={() => {
            setShowVerifyModal(false);
            router.replace("/course");
          }}
        />
      )}
  </main>

  <div className="fixed left-0 right-0 bottom-0 z-[999] bg-white translate-y-0">
    {previewState.visible && (
      <div
        className="fixed z-[999999] pointer-events-none transition-opacity duration-100"
        style={{
          left: previewState.leftPx,
          bottom: 240,
          opacity: 1,
          width: 375,
          height: 250,
        }}
      >
        <div className="relative w-full h-full rounded-lg bg-black/85 text-white shadow-md overflow-hidden flex flex-col">

          {/* time */}
          {previewState.timeLabel && (
            <div
              className="absolute top-2 left-2 px-2 py-[2px] rounded-full bg-white/90 text-black text-[11px] font-medium pointer-events-none"
            >
              {previewState.timeLabel}
            </div>
          )}

          {/* image or placeholder */}
          {previewState.imgUrl ? (
            <img
              src={previewState.imgUrl}
              className="h-[165px] w-full object-cover rounded-t-lg"
              alt=""
            />
          ) : (
            <div className="h-[165px] w-full bg-white/10 rounded-t-lg" />
          )}

          {/* module title */}
          <div className="px-3 py-2 text-[13px] leading-snug line-clamp-3 flex-1">
            {previewState.text}
          </div>
        </div>
      </div>
    )}


<div className="fixed bottom-[150px] left-0 right-0 z-[999] bg-white">
  {ready && (
    <CourseTimeline
      timelineContainerRef={timelineHoverRef}
      modules={modules}
      allowedSeekSecondsRef={allowedSeekSecondsRef}
      playedSecondsRef={playedSecondsRef}
      togglePlay={togglePlay}
      isPaused={isPaused}
      currentSeconds={currentSeconds}
      totalSeconds={totalSeconds}
      elapsedCourseSeconds={elapsedCourseSeconds}
      totalCourseSeconds={totalCourseSeconds}
      moduleDurations={moduleDurations}
      onScrub={onScrub}
      onScrubStart={onScrubStart}
      onScrubEnd={onScrubEnd}
      onHoverResolve={handleHoverResolve}
      onHoverEnd={handleHoverEnd}
      thumbCacheRef={thumbCacheRef}
      currentModuleIndex={0}
      maxCompletedIndex={0}
      goToModule={goToModule}
      examPassed={false}
      paymentPaid={false}
    />
  )}
</div>
</div>
</>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* PROMO BOX COMPONENT */
type PromoBoxProps = {
  x: number;
  setShowPromoBox: React.Dispatch<React.SetStateAction<boolean>>;
};

function PromoBox({ x, setShowPromoBox }: PromoBoxProps) {
  return (
    <div
      className="fixed bg-[#001f40] text-white rounded-xl shadow-xl p-5 z-30 text-center"
      style={{
        bottom: "80px",
        left: `${x}px`,
        transform: "translateX(-50%)",
        width: "300px",
      }}
    >
      {/* Close Button */}
      <button
        onClick={() => setShowPromoBox(false)}
        className="absolute top-1 right-2 text-white text-lg"
      >
        ✕
      </button>

      <PromoText />
    </div>
  );
}

/* MOBILE PROMO */
function MobilePromo({ mobileSheetRef, mobilePromoOpen, setMobilePromoOpen }: any) {
  return (
    <>
      {mobilePromoOpen && <div className="fixed inset-0 bg-black/40 z-20"></div>}
      <div
        ref={mobileSheetRef}
        className={`fixed left-0 right-0 bg-[#001f40] text-white z-30 p-6 rounded-t-xl shadow-2xl transition-transform duration-300 ${
          mobilePromoOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ bottom: 0 }}
      >
        <button onClick={() => setMobilePromoOpen(false)} className="absolute top-1 right-3 text-white text-xl">✕</button>
        <PromoText />
      </div>
    </>
  );
}

function PromoText() {
  return (
    <div className="flex flex-col text-center text-white">
      
      {/* STEP 1 */}
      <p className="text-[11px] italic">(No cost)</p>
      <p className="text-[14px]">6 hour course</p>
      <div className="border-b border-white/40 my-2" />

      {/* STEP 2 */}
      <p className="text-[11px] italic">(No cost)</p>
      <p className="text-[14px]">Pass 40 question final</p>
      <div className="border-b border-white/40 my-2" />

      {/* STEP 3 */}
      <p className="text-[11px]">Pay $59.95</p>
      <p className="text-[11px]">
        Electronically submit your test<br /> results to the DMV
      </p>
      <div className="border-b border-white/40 my-2" />

      {/* STEP 4 */}
      <p className="text-[11px]">
        Set DMV appointment! Bring: 2 forms of proof of Residency. Social
        security card, Birth certificate. & a smile for the camera! $48
        payable to the FL DMV
      </p>

    </div>
  );
}


/* TOOLTIP */
function Tooltip({ hoverItem, vw, mouseX }: any) {
  return (
    <div
      className="fixed z-30 bg-[#001f40] text-white shadow-xl rounded-lg p-4 pointer-events-none"
      style={{
        left: vw < 480 ? "50%" : `${mouseX - 150}px`,
        transform: vw < 480 ? "translateX(-50%)" : "none",
        bottom: "80px",
        width: vw < 480 ? "90%" : "300px",
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8"
        style={{
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: "#001f40",
        }}
      />
      <h2 className="text-base font-bold">{hoverItem.title}</h2>
      <p className="text-xs mb-2 opacity-80">Duration: {hoverItem.duration} minutes</p>
      {hoverItem.thumbnail && (
        <div className="w-full h-auto rounded overflow-hidden mt-2">
          <Image src={hoverItem.thumbnail} alt={hoverItem.title} width={400} height={160} className="object-cover rounded" />
        </div>
      )}
    </div>
  );
}
