"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  const BRAND_ORANGE = "#ca5608";
  const BRAND_BLUE = "#001f40";

  const [hoverItem, setHoverItem] = useState<any>(null);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  // promo box state
  const [showPromoBox, setShowPromoBox] = useState(true);
  const [mobilePromoOpen, setMobilePromoOpen] = useState(false);

  // viewport ready
  const [ready, setReady] = useState(false);

  // track timeline progress (still used internally but bar hidden)
  const [progress, setProgress] = useState(15);

  // ref to detect tap outside mobile promo
  const mobileSheetRef = useRef<HTMLDivElement>(null);

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
  {
    id: "start",
    title: "Join Florida Permit Training",
    duration: 12,
    thumbnail: "/logo.png",
    displayDuration: "6 hours",
  },
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

  /* ───────── GOOGLE POPUP SIGN-IN ───────── */const handleGoogleSignup = async () => {
  try {
    const redirect = `${window.location.origin}/auth/callback`;

    // Try popup sign-in first
    const res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirect,
        skipBrowserRedirect: true, // prevents forced redirect
      },
    });

    // If popup URL is returned, open the popup window
    if (res?.data?.url) {
      window.open(
        res.data.url,
        "GoogleLogin",
        `width=520,height=650,top=${window.screenY + 80},left=${window.screenX + 120}`
      );
      return;
    }

    // Fallback when popup blocked or not supported
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
  } catch (err) {
    console.error("Google Sign-Up Error:", err);
  }
};



  /* ───────── TIMELINE HOVER LOGIC ───────── */
  const defaultProgress = 15;
const handleHoverTimeline = (item: any) => {
  // started box open, but hovering start or empty should hide it
  if (!item || item.id === "start") {
    if (vw >= 768) setShowPromoBox(false);
    setProgress(defaultProgress);
    return;
  }

  // Hovering ONLY merged final segment shows box
  if (item.id === "finalActions") {
    if (vw >= 768) setShowPromoBox(true);
    setProgress(99);
    return;
  }

  // Hovering ANY other section hides box
  if (vw >= 768) setShowPromoBox(false);

  // Normal progress for non-final segments
  const idx = TIMELINE.indexOf(item);
  const pct = Math.round((idx / (TIMELINE.length - 1)) * 100);
  setProgress(Math.max(defaultProgress, pct));
};



  /* ───────── MOBILE TAP TO OPEN/CLOSE ───────── */
useEffect(() => {
  if (vw < 768) {
    setShowPromoBox(false); // mobile hides initially
  } else {
    setShowPromoBox(true);  // desktop starts OPEN
  }
}, [vw]);


  // close mobile box when tapping outside
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


  // Listen for auth popup success
useEffect(() => {
  function handleMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "authSuccess") {
      router.replace("/course"); // instantly move into the app
    }
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, [router]);

  /* ─────────────────────────────────────────────── */
  return (
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "100vh" }}>

      {/* MAIN GRID */}
      <section className="flex-1 flex items-center justify-center overflow-auto">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 h-[80vh]">

          {/* LOGO SECTION */}
          <section className="flex justify-center md:justify-end items-center p-3">
            <Image src="/logo.png" alt="Florida Permit Training" width={520} height={200} className="object-contain max-h-[80%]" priority />
          </section>

          {/* SIGNUP SECTION */}
          <section className="flex flex-col items-center md:items-start justify-center gap-6 p-4">
            <button
              onClick={handleGoogleSignup}
              className="flex items-center border border-[#001f40] bg-white text-[#001f40] text-[24px] font-bold px-5 py-3 rounded-md cursor-pointer"
            >
              <Image src="/Google-Icon.png" alt="Google Icon" width={28} height={28} className="mr-3" />
              Continue with Google
            </button>

            <p className="text-[15px] text-[#001f40] text-center md:text-left">
              Don’t have a Google account?{" "}
              <a href="https://accounts.google.com/signup" target="_blank" className="text-[#ca5608] underline">
                Create one
              </a>.
            </p>
          </section>
        </div>
      </section>

      {/* DESKTOP PROMO BOX (ARROW TRACKED) */}
      {ready && showPromoBox && (hoverItem?.id === "finalActions" || hoverItem === null) && vw >= 768 && (
        <div
          className="fixed bg-[#001f40] text-white rounded-xl shadow-xl p-5 z-30"
          style={{
          position: "fixed",
          bottom: "80px",
          left: hoverItem?.id === "finalActions"
            ? `${Math.min(Math.max(mouseX, 200), vw - 200)}px`  // follow cursor on final
            : `${vw - 200}px`, // stay anchored when not hovering final
          transform: "translateX(-50%)",
          width: "260px",
        }}

        >
          <button onClick={() => setShowPromoBox(false)} className="absolute top-1 right-2 text-white text-lg">✕</button>

          <PromoText />
          <Arrow />
        </div>
      )}

      {/* MOBILE BOTTOM SHEET PROMO */}
      {vw < 768 && (
        <>
          {mobilePromoOpen && (
            <div className="fixed inset-0 bg-black/40 z-20"></div>
          )}

          <div
            ref={mobileSheetRef}
            className={`fixed left-0 right-0 bg-[#001f40] text-white z-30 p-6 rounded-t-xl shadow-2xl transition-transform duration-300 ${
              mobilePromoOpen ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ bottom: 0 }}
          >
            <button onClick={() => setMobilePromoOpen(false)} className="absolute top-1 right-3 text-white text-xl">
              ✕
            </button>
            <PromoText />
          </div>
        </>
      )}

      {/* FOOTER TIMELINE */}
      <FooterTimeline
        TIMELINE={TIMELINE}
        widthPercent={widthPercent}
        defaultProgress={defaultProgress}
        setHoverItem={setHoverItem}
        setMouseX={setMouseX}
        handleHoverTimeline={handleHoverTimeline}
        setMobilePromoOpen={setMobilePromoOpen}
        setShowPromoBox={setShowPromoBox} 
        vw={vw}
      />

      {/* HOVER TOOLTIP (ONLY COURSE MODULES) */}
      {hoverItem && hoverItem.id !== "finalActions" && (
        <Tooltip hoverItem={hoverItem} vw={vw} mouseX={mouseX} />
      )}
    </main>
  );
}

/* ───────── SMALL COMPONENTS ───────── */

function PromoText() {
  return (
    <>
      <h3 className="font-bold text-lg">PAY $59.95</h3>
      <p className="text-sm opacity-90 mb-3">After taking the course.</p>
      <hr className="border-white/30 my-2" />
      <h3 className="font-bold text-lg">FINAL EXAM</h3>
      <p className="text-sm opacity-90 mb-3">
        Pass final 40 question exam & WE WILL automatically send your results to the DMV!
      </p>
      <hr className="border-white/30 my-2" />
      <h3 className="font-bold text-lg">SCHEDULE DMV APPT</h3>
      <p className="text-sm opacity-90">Link here. Bring your birth certificate. Etc.</p>
    </>
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
        bottom: "-7px",
      }}
    />
  );
}

/* ───────── FOOTER TIMELINE COMPONENT ───────── */

function FooterTimeline({
  TIMELINE,
  widthPercent,
  defaultProgress,
  setHoverItem,
  setMouseX,
  handleHoverTimeline,
  setMobilePromoOpen,
  setShowPromoBox,
  vw,
}: any) {
  return (
    <footer className="bg-white fixed left-0 right-0" style={{ bottom: "1px" }}>
      <div className="w-full px-4 md:px-0">
        <div className="md:max-w-6xl md:mx-auto p-4">
          <div className="relative w-full h-6 flex items-center">

            {/* rail */}
            <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full"></div>

            {/* glowing orb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border border-[#fff8f0] pointer-events-none"
              style={{
                left: "-2px",
                backgroundColor: "#ca5608",
                boxShadow: `0 0 10px 6px #ca560855`,
              }}
            />

            {/* segments */}
            <div className="relative w-full h-6 flex items-center">
              {TIMELINE.map((item: any, i: number) => (
                <div
                  key={item.id}
                  style={{ width: `${widthPercent(item)}%` }}
                  className="relative h-full flex items-center justify-center transition-all cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoverItem(item);
                    setMouseX(e.clientX);
                    handleHoverTimeline(item);
                  }}
                  onMouseMove={(e) => setMouseX(e.clientX)}
                  onMouseLeave={() => setHoverItem(null)}
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
                  ></div>

                  {i < TIMELINE.length - 1 && (
                    <div className="w-[3px] h-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          </div>

      {/* DURATION LABELS – MATCH COURSE PAGE */}
          <div className="flex w-full mt-1">
            {TIMELINE.map((item: any) => (
              <div
                key={item.id}
                style={{ width: `${widthPercent(item)}%` }}
                className="flex justify-center"
              >
                {item.id !== "start" && item.id !== "finalActions" && (
                  <span className="text-[9px] text-[#ca5608]">
                    {item.duration} min
                  </span>
                )}
              </div>
            ))}
          </div>


        </div>
      </div>
    </footer>
  );
}


/* ───────── TOOLTIP COMPONENT ───────── */

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
