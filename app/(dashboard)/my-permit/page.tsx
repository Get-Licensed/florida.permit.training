"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";
import { usePermitStatus } from "@/utils/usePermitStatus";
import { supabase } from "@/utils/supabaseClient";
import Loader from "@/components/loader";

export default function MyPermitPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const {
    loading: statusLoading,
    courseComplete,
    examPassed,
    paid,
  } = usePermitStatus();

  /* ───────── AUTH ───────── */
  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* ───────── REDIRECT WHEN FULLY DONE ───────── */
  const shouldRedirect =
    authChecked &&
    !statusLoading &&
    courseComplete &&
    examPassed &&
    paid;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/permit-complete");
    }
  }, [shouldRedirect, router]);

  if (!authChecked || statusLoading || shouldRedirect) {
    return <Loader />;
  }

  return (
    <main
      className="
        relative min-h-screen w-screen
        flex flex-col
        bg-cover bg-center bg-no-repeat
      "
      style={{ backgroundImage: "url('/drone-car.jpg')" }}
    >
      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-[#001f40]/15" />

      {/* CONTENT */}
      <section
        className="
          relative z-10 flex-1
          flex items-center justify-center
          px-4 sm:px-6
          md:items-start
          md:pt-[20vh]
          pb-20
        "
      >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
      {/* STEP 1 */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3">
          Step 1: Complete the 6-Hour Course
        </h2>
        {courseComplete ? (
          <StatusDone label="Course Complete" />
        ) : (
          <PrimaryButton onClick={() => router.push("/course")}>
            Continue Course
          </PrimaryButton>
        )}
      </GlassCard>

      {/* STEP 2 */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3">
          Step 2: Take the Exam
        </h2>
        {examPassed ? (
          <StatusDone label="Exam Passed" />
        ) : (
          <PrimaryButton
            disabled={!courseComplete}
            onClick={() => router.push("/exam")}
          >
            Start Exam
          </PrimaryButton>
        )}
      </GlassCard>

      {/* STEP 3 */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3">
          Step 3: Pay & Visit the DMV
        </h2>
        {paid ? (
          <StatusDone label="Payment Complete" />
        ) : (
          <AccentButton onClick={() => router.push("/payment")}>
            Complete Payment
          </AccentButton>
        )}
      </GlassCard>
    </div>
  </section>
      </main>
    );
  }

/* ───────────────────────────────────────────── */
/* UI HELPERS                                    */
/* ───────────────────────────────────────────── */

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        flex flex-col justify-between
        bg-[#001f40]/20
        border border-white/40
        rounded-2xl
        p-6
        backdrop-blur-md
        shadow-[0_12px_40px_rgba(0,31,64,0.25)]
        text-white
      "
    >
      {children}
    </div>
  );
}

function StatusDone({ label }: { label: string }) {
  return (
    <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
      {label}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 rounded-lg font-semibold transition ${
        disabled
          ? "bg-white/30 text-white/50 cursor-not-allowed"
          : "bg-white text-[#001f40] hover:bg-white/90"
      }`}
    >
      {children}
    </button>
  );
}

function AccentButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-12 bg-[#ff7c24] text-white rounded-lg font-semibold hover:bg-[#e86e1f]"
    >
      {children}
    </button>
  );
}
