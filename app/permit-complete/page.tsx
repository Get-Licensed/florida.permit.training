//app\(dashboard)\permit-complete\page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermitStatus } from "@/utils/usePermitStatus";
import PublicHeader from "@/app/(public)/_PublicHeader2";
import { requireAuth } from "@/utils/requireAuth";
import Loader from "@/components/loader";

export default function PermitCompletePage() {
  const router = useRouter();
  const { loading, fullyComplete } = usePermitStatus();

  useEffect(() => {
    requireAuth(router);
  }, [router]);

  if (loading) {
    return (
    <Loader />
    );
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/drone-car.jpg')" }}
      >
        <div className="absolute inset-0 bg-[#001f40]/15" />
     <div className="absolute inset-0 bg-[#001f40]/15" />
  </div>

          {/* PUBLIC HEADER — SAME AS HOME */}
          <PublicHeader />

    <main className="
            relative 
            z-10 flex-1 flex 
            items-center justify-center 
            px-6 pt-[5%] sm:pt-[8%] md:pt-[12%] pb-[20%]">
         <div
          className="
            flex flex-col items-center text-center
            min-h-[min(64vh,600px)]
            max-w-[min(96vw,750px)] 
            justify-center
            bg-[#001f40]/20
            border border-white/40
            rounded-2xl
            p-6 sm:p-8 md:p-10
            shadow-[0_12px_40px_rgba(0,31,64,0.25)]
            backdrop-blur-md
            -mt-[10%] sm:-mt-[10%] md:-mt-[10%]
            gap-6
          "
        >
        <div className="text-white text-[1.2rem] sm:text-[1.35rem] md:text-[1.75rem] leading-tight">
            Congratulations! 
           <div className="text-white text-[1rem] sm:text-[1.25rem] md:text-[1.35rem] leading-tight">
            Your Florida Permit Training course is complete. 
          </div>
        </div>
            <div
              className="
                grid grid-cols-1 md:grid-cols-[3fr_7fr]
                gap-6 md:gap-1
                w-full max-w-3xl
                items-center
              "
            >
              {/* LEFT — LICENSE IMAGE */}
              <div className="flex justify-center">
                <img
                  src="/FL_Permit_Example.jpg"
                  alt="Florida License Example"
                  className="
                    max-h-[clamp(160px,30vw,300px)]
                    w-auto
                    rounded-xl
                    shadow-md
                    "
                    />
              </div>
              {/* RIGHT — WHAT TO BRING */}
              <div className="text-white/95 text-left">
           <div className="text-white text-[1rem] sm:text-[1.25rem] md:text-[1.35rem] leading-tight pb-4 leading-tight">
                You can now schedule your photo appointment and get your Florida Learner’s License
                </div>
              {/* CTA */}

<div className="relative group inline-flex w-full">
  <button
    onClick={() =>
      window.open("https://www.flhsmv.gov/locations/", "_blank")
    }
    className="
      relative z-10
      w-full
      h-12
      pl-2 pr-2
      flex items-center justify-center
      bg-white
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

  {/* SAME hover ring */}
  <span className="google-hover-ring" />
</div>

           <div className="text-white text-[1rem] sm:text-[1.25rem] md:text-[1.35rem] leading-tight pt-4 pb-4 leading-tight">
                  Bring the following to your appointment:
                </div>
                <ul className="space-y-2 text-[15px] sm:text-[16px]">
                  <li>✓ $48 payment (card or check)</li>
                  <li>✓ Two proofs of address</li>
                  <li>✓ Two proofs of identification</li>
                </ul>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}
