"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  const BRAND_ORANGE = "#ca5608";
  const BRAND_BLUE = "#001f40";

  const [hoverItem, setHoverItem] = useState<any>(null);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  // promo box
  const [showPromoBox, setShowPromoBox] = useState(true);

  // prevent flash
  const [ready, setReady] = useState(false);

  // progress bar
  const [progress, setProgress] = useState(15);

  /* ───────── CHECK IF LOGGED IN ───────── */
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace("/dashboard");
    }
    checkSession();
  }, [router]);

  /* ───────── INITIAL VIEWPORT FIX ───────── */
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
    { id: 1, title: "Introduction", duration: 5, thumbnail: "/thumbs/intro.jpg" },
    { id: 2, title: "Traffic Safety Problem", duration: 25, thumbnail: "/thumbs/safety.jpg" },
    { id: 3, title: "Physiological Effects", duration: 25, thumbnail: "/thumbs/physiology.jpg" },
    { id: 4, title: "Psychological Factors", duration: 15, thumbnail: "/thumbs/psych.jpg" },
    { id: 5, title: "Driving Under the Influence", duration: 45, thumbnail: "/thumbs/dui.jpg" },
    { id: 6, title: "Licensing & Insurance", duration: 15, thumbnail: "/thumbs/licensing.jpg" },
    { id: 7, title: "Licensing Actions", duration: 15, thumbnail: "/thumbs/actions.jpg" },
    { id: 8, title: "Vehicle Safety", duration: 30, thumbnail: "/thumbs/avoidance.jpg" },
    { id: 9, title: "Crash Dynamics", duration: 30, thumbnail: "/thumbs/dynamics.jpg" },
    { id: 10, title: "Traffic Laws I", duration: 45, thumbnail: "/thumbs/laws1.jpg" },
    { id: 11, title: "Traffic Laws II", duration: 45, thumbnail: "/thumbs/laws2.jpg" },
    { id: 12, title: "Traffic Laws III", duration: 45, thumbnail: "/thumbs/laws3.jpg" },
    { id: 13, title: "Behind the Wheel", duration: 45, thumbnail: "/thumbs/wheel.jpg" },
    { id: "extra1", title: "Pay $59.95", duration: 12, thumbnail: null },
    { id: "extra2", title: "Take Final Exam", duration: 12, thumbnail: null },
    { id: "extra3", title: "License Mailed", duration: 11, thumbnail: null },
  ];

  const totalMinutes = useMemo(
    () => TIMELINE.reduce((sum, l) => sum + l.duration, 0),
    []
  );

  const widthPercent = (l: any) => (l.duration / totalMinutes) * 100;

  /* ───────── GOOGLE SIGN-IN ───────── */
  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google Sign-Up Error:", err);
    }
  };

  /* ───────── TIMELINE HOVER PROGRESS LOGIC ───────── */
  const defaultProgress = 15;

  const handleHoverTimeline = (item: any) => {
    if (!item || item.id === "start") {
      setProgress(defaultProgress);
      return;
    }

    // hovering final three → show promo again
    if (["extra1", "extra2", "extra3"].includes(item.id.toString())) {
      setShowPromoBox(true);
      setProgress(99);
      return;
    }

    const idx = TIMELINE.indexOf(item);
    const pct = Math.round((idx / (TIMELINE.length - 1)) * 100);

    setProgress(Math.max(defaultProgress, pct));
  };

  /* ─────────────────────────────────────────────── */
  return (
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "100vh" }}>
      
      {/* TOP PROGRESS BAR */}
      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-2 transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: BRAND_ORANGE }}
        />
      </div>

      {/* MAIN LAYOUT */}
      <section className="flex-1 flex items-center justify-center overflow-auto">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 h-[80vh]">

          {/* LOGO */}
          <section className="flex justify-center md:justify-end items-center p-3">
            <Image
              src="/logo.png"
              alt="Florida Permit Training"
              width={520}
              height={200}
              priority
              className="object-contain max-h-[80%]"
            />
          </section>

          {/* SIGNUP */}
          <section className="flex flex-col items-center md:items-start justify-center gap-6 p-4">
            <h1 className="text-[32px] font-bold text-[#001f40]">Sign Up of Login with Google</h1>

            <button
              onClick={handleGoogleSignup}
              className="flex items-center border border-[#001f40] bg-white text-[#001f40] text-[24px] font-bold px-5 py-3 rounded-md"
            >
              <Image src="/Google-Icon.png" alt="Google Icon" width={28} height={28} className="mr-3" />
              Continue
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

      {/* PROMO BOX */}
      {ready && showPromoBox && (
        <div
          className="fixed bg-[#001f40] text-white rounded-xl shadow-xl p-5 z-29"
          style={{
            bottom: "80px",
            right: vw < 600 ? "50%" : "140px",
            transform: vw < 600 ? "translateX(50%)" : "none",
            width: "260px",
          }}
        >
          <button onClick={() => setShowPromoBox(false)} className="absolute top-1 right-2 text-white text-lg">
            ✕
          </button>

          <h3 className="font-bold text-lg">PAY $59.95</h3>
          <p className="text-sm opacity-90 mb-3">After taking the course.</p>

          <hr className="border-white/30 my-2" />

          <h3 className="font-bold text-lg">FINAL EXAM</h3>
          <p className="text-sm opacity-90 mb-3">Access a 40-question exam after payment.</p>

          <hr className="border-white/30 my-2" />

          <h3 className="font-bold text-lg">LICENSE MAILED</h3>
          <p className="text-sm opacity-90">Your official learner’s license mailed ASAP.</p>
        </div>
      )}

      {/* FOOTER TIMELINE */}
      <footer className="bg-white fixed left-0 right-0" style={{ bottom: "1px" }}>
        
        {/* 1px blue separator */}
        <div style={{ height: "1px", backgroundColor: BRAND_BLUE }} />

        <div className="w-full px-4 md:px-0">
          <div className="md:max-w-6xl md:mx-auto p-4">
            <div className="relative w-full h-6 flex items-center">

              {/* rail */}
              <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full"></div>

              {/* glowing orb */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border border-[#fff8f0]"
                style={{
                  backgroundColor: BRAND_ORANGE,
                  boxShadow: `0 0 10px 6px ${BRAND_ORANGE}55`,
                }}
              ></div>

              {/* segments */}
              <div className="relative w-full h-6 flex items-center justify-between">
                {TIMELINE.map((item, i) => (
                  <div
                    key={item.id}
                    style={{ width: `${widthPercent(item)}%` }}
                    className="relative h-full flex items-center justify-center transition-all"
                    onMouseEnter={(e) => {
                      setHoverItem(item);
                      setMouseX(e.clientX);
                      handleHoverTimeline(item);
                    }}
                    onMouseMove={(e) => setMouseX(e.clientX)}
                    onMouseLeave={() => {
                      setHoverItem(null);
                      setProgress(defaultProgress);
                    }}
                  >
                    <div
                      className={`flex-1 h-2 rounded-full ${
                        i === 0 ? "bg-[#ca5608]" : "bg-[#001f40]"
                      }`}
                    ></div>

                    {i < TIMELINE.length - 1 && <div className="w-[3px] h-full bg-white"></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* HOVER TOOLTIP WITH ARROW */}
      {hoverItem && !["extra1", "extra2", "extra3"].includes(hoverItem.id.toString()) && (
        <div
          className="fixed z-30 bg-[#001f40] text-white shadow-xl rounded-lg p-4 pointer-events-none"
          style={{
            left: vw < 480 ? "50%" : `${mouseX - 150}px`,
            transform: vw < 480 ? "translateX(-50%)" : "none",
            bottom: "80px",
            width: vw < 480 ? "90%" : "300px",
          }}
        >
          {/* arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
            style={{ borderTopColor: BRAND_BLUE }}
          />

          <h2 className="text-base font-bold">{hoverItem.title}</h2>

          {!hoverItem.id.toString().startsWith("extra") && (
            <p className="text-xs mb-2 opacity-80">
              Duration: {hoverItem.duration} minutes
            </p>
          )}

          {hoverItem.thumbnail && (
            <div className="w-full h-auto rounded overflow-hidden mt-2">
              <Image
                src={hoverItem.thumbnail}
                alt={hoverItem.title}
                width={400}
                height={160}
                className="object-cover rounded"
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
