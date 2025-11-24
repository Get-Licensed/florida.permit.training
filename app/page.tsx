"use client";
export const dynamic = "force-dynamic";

import PublicHeader from "@/app/(public)/_PublicHeader";
import TopProgressBar from "@/components/TopProgressBar";
import Image from "next/image";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  const [hoverItem, setHoverItem] = useState<any>(null);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  const [showPromoBox, setShowPromoBox] = useState(true);
  const [mobilePromoOpen, setMobilePromoOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(15);

  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const [lastPromoX, setLastPromoX] = useState<number | null>(null);


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

  /* ───────── TIMELINE DATA ───────── */
  const TIMELINE = [
    { id: "start", title: "Join Florida Permit Training", duration: 12, thumbnail: "/logo.png", displayDuration: "6 hours" },
    { id: 1, title: "Introduction", duration: 10, thumbnail: "/thumbs/intro.jpg" },
    { id: 2, title: "Traffic Safety Problem", duration: 35, thumbnail: "/thumbs/safety.jpg" },
    { id: 3, title: "Physiological Effects", duration: 35, thumbnail: "/thumbs/physiology.jpg" },
    { id: 4, title: "Psychological Factors", duration: 25, thumbnail: "/thumbs/psych.jpg" },
    { id: 5, title: "Driving Under the Influence", duration: 60, thumbnail: "/thumbs/dui.jpg" },
    { id: 6, title: "Licensing & Insurance", duration: 25, thumbnail: "/thumbs/licensing.jpg" },
    { id: 7, title: "Licensing Actions", duration: 25, thumbnail: "/thumbs/actions.jpg" },
    { id: 8, title: "Vehicle Safety", duration: 40, thumbnail: "/thumbs/avoidance.jpg" },
    { id: 9, title: "Crash Dynamics", duration: 40, thumbnail: "/thumbs/dynamics.jpg" },
    { id: 10, title: "Traffic Laws I", duration: 55, thumbnail: "/thumbs/laws1.jpg" },
    { id: 11, title: "Traffic Laws II", duration: 55, thumbnail: "/thumbs/laws2.jpg" },
    { id: 12, title: "Traffic Laws III", duration: 55, thumbnail: "/thumbs/laws3.jpg" },
    { id: 13, title: "Behind the Wheel", duration: 55, thumbnail: "/thumbs/wheel.jpg" },
    { id: "finalActions", title: "PAY / EXAM / DMV", duration: 48, thumbnail: null },
  ];

  const totalMinutes = useMemo(() => TIMELINE.reduce((s, l) => s + l.duration, 0), []);
  const widthPercent = (l: any) => (l.duration / totalMinutes) * 100;

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

  /* ───────── TIMELINE HOVER → TOP BAR PROGRESS ───────── */
  const defaultProgress = 15;
const handleHoverTimeline = (item: any, x?: number) => {
  if (!item || item.id === "start") {
    if (vw >= 768) setShowPromoBox(false);
    setProgress(defaultProgress);
    return;
  }

  if (item.id === "finalActions") {
    setHoverItem(item);
    if (vw >= 768) setShowPromoBox(true);
    setProgress(99);

    if (x) setLastPromoX(x); // store live
    return;
  }

  if (vw >= 768) setShowPromoBox(false);

  const idx = TIMELINE.indexOf(item);
  const pct = Math.round((idx / (TIMELINE.length - 1)) * 100);
  setProgress(Math.max(defaultProgress, pct));
};


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
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "authSuccess") router.replace("/course");
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  /* ───────────────────────────────────────────────────────────── */
  return (
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "calc(100vh - 2px)", marginTop: "2px" }}>
      
      {/* ===== FIXED PROGRESS BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-[70] bg-gray-200 h-[3px] pointer-events-none">
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

      {/* ===== PROMO + MOBILE SHEET + TIMELINE + TOOLTIP ===== */}
      <FooterTimeline
        TIMELINE={TIMELINE}
        widthPercent={widthPercent}
        defaultProgress={defaultProgress}
        setHoverItem={setHoverItem}
        setMouseX={setMouseX}
        handleHoverTimeline={handleHoverTimeline}
        setMobilePromoOpen={setMobilePromoOpen}
        setShowPromoBox={setShowPromoBox}
        setLastPromoX={setLastPromoX}
        vw={vw}
      />

      {ready && showPromoBox && hoverItem?.id === "finalActions" && vw >= 768 && (
        <PromoBox x={lastPromoX ?? mouseX} />
      )}


      {vw < 768 && <MobilePromo mobileSheetRef={mobileSheetRef} mobilePromoOpen={mobilePromoOpen} setMobilePromoOpen={setMobilePromoOpen} />}

      {hoverItem && hoverItem.id !== "finalActions" && <Tooltip hoverItem={hoverItem} vw={vw} mouseX={mouseX} />}

    </main>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* PROMO BOX COMPONENT */
function PromoBox({ x }: { x: number }) {
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
      <PromoText />
      <Arrow />
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




function Arrow() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8"
      style={{
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#001f40",
        bottom: "-7px"
      }}
    />
  );
}


/* FOOTER TIMELINE */
function FooterTimeline({
  TIMELINE,
  widthPercent,
  defaultProgress,
  setHoverItem,
  setMouseX,
  handleHoverTimeline,
  setMobilePromoOpen,
  setShowPromoBox,
  setLastPromoX,
  vw
}: any) {
  return (
    <footer className="bg-white fixed left-0 right-0" style={{ bottom: "1px" }}>
      <div className="w-full px-4 md:px-0">
        <div className="md:max-w-6xl md:mx-auto p-4">

          {/* ARROWS */}
          <div className="flex justify-between items-center select-none" style={{ paddingLeft: "8px", paddingRight: "8px", paddingBottom: "40px" }}>
            <img src="/back-arrow.png" alt="Previous" className="w-14 sm:w-20 object-contain pointer-events-none" style={{ filter: "grayscale(1) brightness(1.64)" }} />
            <img src="/forward-arrow.png" alt="Next" className="w-14 sm:w-20 object-contain pointer-events-none" style={{ filter: "grayscale(1) brightness(1.64)" }} />
          </div>

          {/* TIMELINE RAIL */}
          <div className="relative w-full h-6 flex items-center">
            <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full" />

            {/* GLOW ORB */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border border-[#fff8f0] pointer-events-none"
              style={{
                left: "-2px",
                backgroundColor: "#ca5608",
                boxShadow: `0 0 10px 6px #ca560855`,
              }}
            />

            {/* MODULE SEGMENTS */}
            <div className="relative w-full h-6 flex items-center">
              {TIMELINE.map((item: any, i: number) => (
                <div
                  key={item.id}
                  style={{ width: `${widthPercent(item)}%` }}
                  className="relative h-full flex items-center justify-center transition-all cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoverItem(item);
                    setMouseX(e.clientX);
                    handleHoverTimeline(item, e.clientX); // send live x
                  }}
                  onMouseMove={(e) => {
                    setMouseX(e.clientX);
                    if (item.id === "finalActions") setLastPromoX(e.clientX);
                  }}                  onMouseLeave={() => setHoverItem(null)}
                  onClick={() => {
                    if (vw < 768 && item.id === "finalActions") {
                      setMobilePromoOpen(true);
                    }
                  }}
                >
                  <div
                    className={`flex-1 h-2 ${
                      i === 0
                        ? "bg-[#ca5608] rounded-l-full"
                        : i === TIMELINE.length - 1
                        ? "bg-[#001f40] rounded-r-full"
                        : "bg-[#001f40]"
                    }`}
                  />
                  {i < TIMELINE.length - 1 && <div className="w-[3px] h-full bg-white" />}
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </footer>
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
