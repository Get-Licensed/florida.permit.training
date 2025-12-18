"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermitStatus } from "@/utils/usePermitStatus";
import { requireAuth } from "@/utils/requireAuth";
import TimelineFooterShell from "@/app/(dashboard)/TimelineFooterShell";
import Loader from "@/components/loader";

export default function PermitCompletePage() {
  const router = useRouter();
  const { loading, fullyComplete } = usePermitStatus();

  useEffect(() => {
    requireAuth(router);
  }, [router]);

  useEffect(() => {
    if (!loading && !fullyComplete) {
      router.replace("/my-permit");
    }
  }, [loading, fullyComplete, router]);

  if (loading) {
    return (
    <Loader />
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="/Driving_Freeway.jpg"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 -translate-y-[11%]">
        <div className="max-w-4xl w-full bg-[#001f40]/50 rounded-2xl shadow-xl p-8 md:p-12 flex flex-col gap-8">
          <h1 className="text-[1.9rem] font-bold text-center md:text-center text-white">
            Photo Appointment – Get Your Florida Learner’s License
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-[75%_25%] gap-2 items-center text-white">
            <div className="space-y-1.5">
              <h2 className="text-[2rem] font-semibold mb-3">
                What to Bring:
              </h2>
              <ul className="text-[2rem] space-y-2 text-lg">
                <li>✅ $48 Card or Check Payable to FLDHV</li>
                <li>✅ (Two) 2 Proofs of Address</li>
                <li>✅ (Two) 2 Proofs of Identification</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <img
                src="/FL_Permit_Example.jpg"
                alt="Florida License Example"
                className="max-h-[360px] rounded-xl shadow-lg"
              />
            </div>
          </div>
           <div className="pt-6 border-white/20">
            <button
              onClick={() =>
                window.open(
                  "https://www.flhsmv.gov/locations/",
                  "_blank"
                )
              }
              className="w-full h-14 bg-white text-[#001f40] font-bold rounded-lg hover:bg-gray-100 transition text-[2rem] cursor-pointer"
            >
              Go to FLHSMV &amp; Schedule Your Appointment
            </button>
          </div>
        </div>
      </main>

      <TimelineFooterShell>
        <div className="text-center text-[#001f40] text-[2rem] font-bold">
          Congratulations &amp; Thank You for Choosing Florida Permit Training!
        </div>
      </TimelineFooterShell>
    </div>
  );
}
