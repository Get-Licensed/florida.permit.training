"use client";

import { useRouter } from "next/navigation";
import { usePermitStatus } from "@/utils/usePermitStatus";
import PermitStatusFooter from "../PermitStatusFooter";

export default function CompletePage() {
  const router = useRouter();
  const { loading, courseComplete, examPassed, paid } = usePermitStatus();

  return (
    <>
      {/* BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/drone-car.jpg')" }}
      />

      {/* COLOR OVERLAY (15%) */}
      <div className="fixed inset-0 z-0 bg-[#001f40]/15 pointer-events-none" />

      {/* MAIN CONTENT */}
      <main className="relative z-10 px-4 py-8 pb-[9.5rem] md:pb-[7rem]">
        <div className="min-h-[55vh] flex items-center justify-center">
          <div
            className="
              flex flex-col items-center text-center
              w-full max-w-[min(96vw,446px)]
              bg-[#001f40]/20
              border border-white/40
              rounded-2xl
              p-6 sm:p-8 md:p-10
              backdrop-blur-md
              shadow-[0_12px_40px_rgba(0,31,64,0.25)]
            "
          >
            <h1 className="text-white text-[1.45rem] sm:text-[1.6rem] font-semibold mb-4">
              Payment Complete
            </h1>

            <div className="flex flex-col items-center gap-4">
              {/* CHECK ICON */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
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

              <p className="text-sm text-white/90">
                Your payment has been received successfully.
              </p>

              <button
                onClick={() => router.push("/my-permit")}
                className="
                  mt-4
                  w-full h-12
                  bg-white
                  text-[#001f40]
                  font-semibold
                  rounded-lg
                  transition
                  hover:bg-white/90
                "
              >
                Return to My Permit
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      {!loading && (
        <PermitStatusFooter
          courseComplete={courseComplete}
          examPassed={examPassed}
          paid={paid}
        />
      )}
    </>
  );
}
