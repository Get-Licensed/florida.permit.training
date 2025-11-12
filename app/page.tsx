"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function SignUpPage() {
  const BRAND_ORANGE = "#ca5608";
  const BRAND_BLUE = "#001f40";

  const [hoverItem, setHoverItem] = useState<any>(null);
  const [mouseX, setMouseX] = useState(0);
  const [vw, setVw] = useState(0);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ─────────── FULL TIMELINE (COURSE + PROMOS) ─────────── */
  const TIMELINE = [
    {
      id: "start",
      title: "Join Florida Permit Training",
      duration: 12, // timeline spacing
      thumbnail: "/logo.png",
      displayDuration: "6 hours", // ← display override
    },
    { id: 1, title: "Introduction", duration: 5, thumbnail: "/thumbs/intro.jpg" },
    { id: 2, title: "The Traffic Safety Problem", duration: 25, thumbnail: "/thumbs/safety.jpg" },
    { id: 3, title: "Physiological Effects of Alcohol and Other Drugs on Driving", duration: 25, thumbnail: "/thumbs/physiology.jpg" },
    { id: 4, title: "Psychological Factors That Affect Driving Ability", duration: 15, thumbnail: "/thumbs/psych.jpg" },
    { id: 5, title: "Driving Under the Influence", duration: 45, thumbnail: "/thumbs/dui.jpg" },
    { id: 6, title: "Florida’s Graduated Driver Licensing and Insurance Laws", duration: 15, thumbnail: "/thumbs/licensing.jpg" },
    { id: 7, title: "Driver Licensing Actions", duration: 15, thumbnail: "/thumbs/actions.jpg" },
    { id: 8, title: "Vehicle Safety Maintenance and Crash Avoidance", duration: 30, thumbnail: "/thumbs/avoidance.jpg" },
    { id: 9, title: "Crash Dynamics and the Human Body While Driving", duration: 30, thumbnail: "/thumbs/dynamics.jpg" },
    { id: 10, title: "Florida’s Traffic Laws – Part 1", duration: 45, thumbnail: "/thumbs/laws1.jpg" },
    { id: 11, title: "Florida’s Traffic Laws – Part 2", duration: 45, thumbnail: "/thumbs/laws2.jpg" },
    { id: 12, title: "Florida’s Traffic Laws – Part 3", duration: 45, thumbnail: "/thumbs/laws3.jpg" },
    { id: 13, title: "Getting Behind the Wheel", duration: 45, thumbnail: "/thumbs/wheel.jpg" },
    { id: "extra1", title: "Pay $59.95 after 6-hour course completion.", duration: 12, thumbnail: "/thumbs/pay.jpg" },
    { id: "extra2", title: "Access and take the final 40-question Exam after course completion and payment.", duration: 12, thumbnail: "/thumbs/exam.jpg" },
    { id: "extra3", title: "Your actual Learner’s License will be mailed ASAP, tracking number provided.", duration: 11, thumbnail: "/thumbs/license.jpg" },
  ];

  const totalMinutes = useMemo(() => TIMELINE.reduce((acc, l) => acc + l.duration, 0), []);
  const widthPercent = (l: any) => (l.duration / totalMinutes) * 100;

  const CARD_MARGIN = 12;
  const CARD_W = vw < 480 ? 380 : 300;
  const cardLeft =
    Math.max(CARD_MARGIN, Math.min(mouseX - CARD_W / 2, Math.max(0, vw) - CARD_W - CARD_MARGIN)) + "px";

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

  return (
    <main className="flex flex-col bg-white relative overflow-hidden" style={{ height: "100vh" }}>
      {/* 50/50 Split Layout */}
      <section className="flex-1 flex items-center justify-center overflow-auto">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 h-[80vh]">
          {/* Left side - logo */}
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

          {/* Right side - Sign up */}
          <section className="flex flex-col items-center md:items-start justify-center w-full gap-6 p-4">
            <h1 className="text-[32px] font-bold text-[#001f40]">Create an account</h1>

            <button
              onClick={handleGoogleSignup}
              className="flex items-center border border-[#001f40] bg-white text-[#001f40] text-[24px] font-bold px-5 py-3 rounded-md"
            >
              <Image
                src="/Google-Icon.png"
                alt="Google Icon"
                width={28}
                height={28}
                className="mr-3"
              />
              Sign Up with Google
            </button>

            <p className="text-[15px] text-[#001f40] text-center md:text-left">
              Don’t have a Google account?{" "}
              <a
                href="https://accounts.google.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ca5608] underline"
              >
                Create one
              </a>.
            </p>
          </section>
        </div>
      </section>

      {/* FOOTER TIMELINE */}
      <footer className="border-t shadow-inner bg-white fixed left-0 right-0" style={{ bottom: "1px" }}>
        <div className="w-full px-4 md:px-0">
          <div className="md:max-w-6xl md:mx-auto p-4">
            <div className="relative w-full h-6 flex items-center">
              {/* Base line */}
              <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full" />

              {/* Glowing Start orb */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border border-[#fff8f0] transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: BRAND_ORANGE,
                  boxShadow: `0 0 10px 6px ${BRAND_ORANGE}55`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = `0 0 14px 8px ${BRAND_ORANGE}88`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = `0 0 10px 6px ${BRAND_ORANGE}55`)
                }
              />

              {/* Unified Timeline Segments */}
              <div className="relative w-full h-6 flex items-center justify-between">
                {TIMELINE.map((item, i) => (
                  <div
                    key={`seg-${item.id}`}
                    style={{ width: `${widthPercent(item)}%` }}
                    className="relative h-full flex items-center justify-center transition-all duration-200"
                    onMouseEnter={(e) => {
                      setHoverItem(item);
                      setMouseX(e.clientX);
                    }}
                    onMouseMove={(e) => setMouseX(e.clientX)}
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <div
                      className={`flex-1 h-2 rounded-full transition-all ${
                        i === 0
                          ? "bg-[#ca5608] shadow-[0_0_6px_#ca5608]"
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

      {/* Hover Card */}
      {hoverItem && (
        <div
          className={`fixed z-30 bg-[#001f40] text-white shadow-xl rounded-lg p-4 pointer-events-none transition-all duration-500 ease-out transform
          ${hoverItem ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
          style={{
            left: vw < 480 ? "50%" : cardLeft,
            transform: vw < 480
              ? "translateX(-50%) translateY(0)"
              : hoverItem
              ? "translateY(0)"
              : "translateY(3px)",
            bottom: "80px",
            width: vw < 480 ? "90%" : "300px",
            maxWidth: "400px",
            boxShadow: `0px 10px 20px -5px ${BRAND_ORANGE}66`,
          }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
            style={{ borderTopColor: "#001f40" }}
          />

          <h2 className="text-base font-bold mb-1 leading-snug text-center">
            {hoverItem.title}
          </h2>

          {/* Duration shown unless it's a promo or special override */}
          {!hoverItem.id.toString().startsWith("extra") && (
            <p className="text-xs opacity-90 mb-2 text-center">
              {hoverItem.displayDuration
                ? hoverItem.displayDuration
                : `Duration: ${hoverItem.duration} minutes`}
            </p>
          )}

          {hoverItem.thumbnail && (
            <div className="w-full h-auto bg-black/20 rounded flex items-center justify-center overflow-hidden mt-2">
              <Image
                src={hoverItem.thumbnail}
                alt={hoverItem.title}
                width={400}
                height={160}
                className="object-cover rounded-md w-full h-auto"
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
