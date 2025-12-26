"use client";

import { useRouter } from "next/navigation";
import { usePermitStatus } from "@/utils/usePermitStatus";
import PermitStatusFooter from "../PermitStatusFooter";

export default function CompletePage() {
  const router = useRouter();

  const {
    loading,
    courseComplete,
    examPassed,
    paid,
  } = usePermitStatus();

  return (
    <>
      {/* MAIN CONTENT */}
      <main className="px-6 py-12 pb-[240px]">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="relative bg-white border border-gray-200 shadow-sm rounded-xl p-10 w-full max-w-md text-center">

            {/* Subtle background logo */}
            <img
              src="/logo.png"
              alt=""
              className="absolute inset-0 m-auto opacity-[0.04] w-[600px] pointer-events-none"
            />

            <h1 className="text-xl font-bold text-[#001f40] mb-4 relative z-10">
              Payment Complete
            </h1>

            <div className="flex flex-col items-center gap-4 relative z-10">
              {/* Success check */}
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

              <p className="text-sm text-gray-700">
                Your payment has been received successfully.
              </p>

              <p className="text-sm text-gray-600">
                If you have not completed the course and exam, you must complete them
                before we notify the Florida DMV.
              </p>

              <p className="text-sm text-gray-600">
                If you have already completed the course and exam, your record will be
                submitted to the Florida DMV within 1 business day.
              </p>

              <button
                onClick={() => router.push("/my-permit")}
                className="
                  mt-4
                  w-full
                  h-12
                  bg-[#001f40]
                  text-white
                  font-semibold
                  rounded-lg
                  hover:bg-[#00356e]
                  transition
                "
              >
                Return to My Permit
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* TIMELINE FOOTER — STATUS AWARE */}
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
