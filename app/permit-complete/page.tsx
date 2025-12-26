// app/(dashboard)/permit-complete/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermitStatus } from "@/utils/usePermitStatus";
import PublicHeader from "@/app/(public)/_PublicHeader2";
import { requireAuth } from "@/utils/requireAuth";
import Loader from "@/components/loader";

export default function PermitCompletePage() {
  const router = useRouter();
  const { loading } = usePermitStatus();

  useEffect(() => {
    requireAuth(router);
  }, [router]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="relative min-h-screen w-screen overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/drone-car.jpg')" }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-[#001f40]/15" />

      {/* HEADER */}
      <PublicHeader />

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 sm:px-6 pb-24">
        <div
          className="
            relative
            flex flex-col items-center text-center
            w-full max-w-3xl
            bg-[#001f40]/20
            border border-white/40
            rounded-2xl
            p-6 sm:p-8 md:p-10
            backdrop-blur-md
            shadow-[0_12px_40px_rgba(0,31,64,0.25)]
            gap-6
          "
        >
          {/* DESKTOP CHECK BADGE */}
          <div className="hidden md:flex absolute -top-7 left-1/2 -translate-x-1/2">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
              <svg
                className="w-7 h-7 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* TITLE */}
          <h1 className="text-white text-[1.25rem] sm:text-[1.4rem] md:text-[1.75rem] leading-tight">
            Congratulations! You finished Florida Permit Training
          </h1>

          {/* CONTENT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_7fr] gap-6 w-full items-center">
            {/* LEFT — LICENSE IMAGE */}
            <div className="flex justify-center">
              <img
                src="/FL_Permit_Example.jpg"
                alt="Florida License Example"
                className="
                  max-h-[clamp(160px,30vw,280px)]
                  w-auto
                  rounded-xl
                  shadow-md
                "
              />
            </div>

            {/* RIGHT — INFO */}
            <div className="text-white/95 text-left space-y-4">
              <p className="text-[1rem] sm:text-[1.15rem] md:text-[1.25rem] leading-snug">
                You can now schedule your photo appointment and receive your
                Florida Learner’s License.
              </p>

              {/* CTA */}
              <div className="relative group inline-flex w-full">
                <button
                  onClick={() =>
                    window.open("https://www.flhsmv.gov/locations/", "_blank")
                  }
                  className="
                    relative z-10
                    w-full h-12
                    flex items-center justify-center
                    bg-white
                    mt-1
                    mb-1
                    text-[#001f40]
                    font-semibold
                    rounded-xl
                    leading-tight
                    transition-all duration-200
                    hover:shadow-[0_10px_24px_rgba(0,31,64,0.18)]
                    hover:-translate-y-0.5
                  "
                >
                  Schedule Your FLHSMV Appointment
                </button>
                <span className="google-hover-ring" />
              </div>

              {/* CHECKLIST */}
              <div>
                <p className="text-[1rem] sm:text-[1.15rem] md:text-[1.25rem] pb-2">
                  Bring the following to your appointment:
                </p>
                <ul className="space-y-2 text-[15px] sm:text-[16px]">
                  <li>✓ $48 payment (card or check)</li>
                  <li>✓ Two proofs of address</li>
                  <li>✓ Two proofs of identification</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
